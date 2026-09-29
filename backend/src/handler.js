"use strict";

const crypto = require("crypto");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { validateAnalyzePayload, ValidationError } = require("./validator");
const { detectLabels } = require("./rekognition");
const { getRecyclingAdvice } = require("./bedrock");

const s3 = new S3Client({});

const CSP =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Api-Key,x-api-key",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Max-Age": "600",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  };
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(payload),
  };
}

function decodeBody(event) {
  if (event.body == null) {
    return event.body;
  }
  if (event.isBase64Encoded) {
    return Buffer.from(event.body, "base64").toString("utf8");
  }
  return event.body;
}

function requestIdFrom(event, context) {
  return (
    event.requestContext?.requestId ||
    context.awsRequestId ||
    crypto.randomUUID()
  );
}

exports.handler = async function handler(event, context) {
  const method =
    event.httpMethod || event.requestContext?.http?.method || "POST";

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: "",
    };
  }

  if (method !== "POST") {
    return jsonResponse(405, {
      error: "Method not allowed. Use POST /analyze.",
    });
  }

  const bucket = process.env.UPLOAD_BUCKET;
  if (!bucket) {
    return jsonResponse(500, { error: "Upload bucket is not configured." });
  }

  let objectKey;
  try {
    const payload = validateAnalyzePayload(decodeBody(event));
    objectKey = `uploads/${crypto.randomUUID()}.${payload.extension}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: payload.imageBuffer,
        ContentType: payload.mimeType,
        ServerSideEncryption: "AES256",
        Metadata: {
          city: payload.city.slice(0, 80),
          postal: payload.postalCode,
        },
      })
    );

    const labels = await detectLabels({ bucket, key: objectKey });
    if (labels.length === 0) {
      return jsonResponse(422, {
        error:
          "No recognisable objects were found. Try a clearer, well-lit photo of a single item.",
      });
    }

    const advice = await getRecyclingAdvice({
      labels,
      city: payload.city,
      postalCode: payload.postalCode,
    });

    return jsonResponse(200, {
      requestId: requestIdFrom(event, context),
      itemName: advice.itemName,
      isRecyclable: advice.isRecyclable,
      recyclability: advice.recyclability,
      advice: advice.advice,
      labels,
      location: {
        city: payload.city,
        postalCode: payload.postalCode,
      },
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return jsonResponse(err.statusCode, { error: err.message });
    }

    console.error("analyze_failed", {
      name: err.name,
      message: err.message,
      requestId: requestIdFrom(event, context),
    });

    return jsonResponse(500, {
      error: "Analysis failed. Please retry with a smaller JPEG or PNG.",
    });
  } finally {
    if (objectKey) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: objectKey,
          })
        );
      } catch (cleanupErr) {
        console.error("s3_cleanup_failed", {
          key: objectKey,
          message: cleanupErr.message,
        });
      }
    }
  }
};

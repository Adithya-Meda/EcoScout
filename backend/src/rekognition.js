"use strict";

const {
  RekognitionClient,
  DetectLabelsCommand,
} = require("@aws-sdk/client-rekognition");

const client = new RekognitionClient({});

async function detectLabels({ bucket, key }) {
  const response = await client.send(
    new DetectLabelsCommand({
      Image: {
        S3Object: {
          Bucket: bucket,
          Name: key,
        },
      },
      MaxLabels: 15,
      MinConfidence: 70,
    })
  );

  const labels = (response.Labels || [])
    .filter((label) => label.Name && typeof label.Confidence === "number")
    .sort((a, b) => b.Confidence - a.Confidence)
    .map((label) => ({
      name: label.Name,
      confidence: Math.round(label.Confidence * 10) / 10,
      parents: (label.Parents || []).map((parent) => parent.Name).filter(Boolean),
    }));

  return labels;
}

module.exports = { detectLabels };

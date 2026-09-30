"use strict";

const MAX_BYTES = 5_242_880;

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

const CITY_PATTERN = /^[A-Za-z][A-Za-z\s.'-]{0,79}$/;

const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

class ValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
  }
}

function stripDataUrl(imageBase64) {
  if (typeof imageBase64 !== "string") {
    return "";
  }
  const trimmed = imageBase64.trim();
  const comma = trimmed.indexOf(",");
  if (trimmed.startsWith("data:") && comma !== -1) {
    return trimmed.slice(comma + 1).replace(/\s/g, "");
  }
  return trimmed.replace(/\s/g, "");
}

function estimateDecodedBytes(b64) {
  const len = b64.length;
  if (len === 0) {
    return 0;
  }
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(JPEG_MAGIC)) {
    return "image/jpeg";
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(PNG_MAGIC)) {
    return "image/png";
  }
  return null;
}

function parseBody(rawBody) {
  if (rawBody == null || rawBody === "") {
    throw new ValidationError("Request body is required.");
  }

  let parsed;
  try {
    const text =
      typeof rawBody === "string" ? rawBody : Buffer.from(rawBody).toString("utf8");
    parsed = JSON.parse(text);
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  return parsed;
}

function validateAnalyzePayload(rawBody) {
  const parsed = parseBody(rawBody);

  const city = typeof parsed.city === "string" ? parsed.city.trim() : "";
  const mimeType =
    typeof parsed.mimeType === "string" ? parsed.mimeType.trim().toLowerCase() : "";

  if (!city || !CITY_PATTERN.test(city)) {
    throw new ValidationError(
      "City is required and may only include letters, spaces, periods, apostrophes, and hyphens (max 80 characters)."
    );
  }

  if (!MIME_TO_EXT[mimeType]) {
    throw new ValidationError("Only JPEG and PNG images are supported.");
  }

  const b64 = stripDataUrl(parsed.imageBase64);
  if (!b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4 !== 0) {
    throw new ValidationError("imageBase64 must be valid Base64.");
  }

  const estimated = estimateDecodedBytes(b64);
  if (estimated <= 0) {
    throw new ValidationError("Image data is empty.");
  }
  if (estimated > MAX_BYTES) {
    throw new ValidationError("Image exceeds the 5 MB limit.", 413);
  }

  let imageBuffer;
  try {
    imageBuffer = Buffer.from(b64, "base64");
  } catch {
    throw new ValidationError("imageBase64 could not be decoded.");
  }

  if (imageBuffer.length === 0) {
    throw new ValidationError("Image data is empty.");
  }
  if (imageBuffer.length > MAX_BYTES) {
    throw new ValidationError("Image exceeds the 5 MB limit.", 413);
  }

  const detected = detectImageType(imageBuffer);
  if (!detected) {
    throw new ValidationError("File content is not a valid JPEG or PNG.");
  }
  if (detected !== mimeType) {
    throw new ValidationError(
      `Declared MIME type ${mimeType} does not match file contents (${detected}).`
    );
  }

  return {
    city,
    mimeType,
    extension: MIME_TO_EXT[mimeType],
    imageBuffer,
    userItemName: typeof parsed.userItemName === "string" ? parsed.userItemName.trim() : null,
  };
}

module.exports = {
  MAX_BYTES,
  ValidationError,
  validateAnalyzePayload,
};

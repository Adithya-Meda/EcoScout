"use strict";

const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
const { GoogleGenAI } = require("@google/genai");

const secretsManager = new SecretsManagerClient({});
let geminiClient;

const SYSTEM_PROMPT = `You are ekoFuse.img, a global recycling and waste-disposal advisor.
You receive computer-vision labels for a photo of a waste item, plus the user's city.
You support users anywhere in the world — US, India, UK, Canada, Australia, and beyond.
Use your knowledge of local municipal solid waste rules for that specific city and country.
Treat the vision labels as the only evidence about the item's material. Never infer plastic, glass, or metal from a generic label such as bottle, flask, thermos, tumbler, or shaker. If the labels do not establish the material, call it uncertain and give cautious, conditional guidance.

For Indian cities follow BBMP (Bangalore), BMC (Mumbai), MCD (Delhi), GHMC (Hyderabad), and other municipal corporation rules as applicable.
For Indian users: segregate into Wet Waste (green bin), Dry Recyclable (blue bin), Domestic Hazardous (red bin), and Sanitary (black bin) as per the Solid Waste Management Rules 2016.
For US cities: use curbside single-stream or dual-stream rules specific to that municipality.
For other countries: apply the most accurate local rule you know.

Respond with ONLY a single JSON object (no markdown, no commentary) using these keys:
- itemName: short human-readable name of the primary item (e.g. "Plastic water bottle", "Cardboard box")
- isRecyclable: boolean
- recyclability: one of "recyclable", "conditionally_recyclable", "not_recyclable"
- advice: 3-6 sentences of practical, plain-language guidance for that specific city. Cover which bin to use, how to prepare the item (rinse, flatten, remove caps), and any common mistakes to avoid. Write for a non-technical audience. Do not mention AWS, AI, or any technology.

Be honest when labels are ambiguous. Never claim hazardous waste is safe for regular bins.
If you are unsure about local rules for a given city, say so clearly and give the safest conservative advice.`;

function buildUserPrompt({ labels, city }) {
  const labelLines = labels
    .map(
      (label) =>
        `- ${label.name} (${label.confidence}%)${
          label.parents.length ? ` parents: ${label.parents.join(", ")}` : ""
        }`
    )
    .join("\n");

  return `City: ${city}

Detected labels from the photo (highest confidence first):
${labelLines || "- (none)"}

Identify the waste item and give recycling or disposal advice specific to this location.`;
}

function extractJsonObject(text) {
  if (!text || typeof text !== "string") {
    return null;
  }
  const stripped = text
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeAdvice(parsed, labels, city) {
  const top = labels[0]?.name || "unknown item";
  const labelText = labels
    .flatMap((label) => [label.name, ...(label.parents || [])])
    .join(" ");
  const isBottleLike = /\b(bottle|flask|thermos|thermosteel|tumbler|shaker)\b/i.test(
    labelText
  );
  const hasMaterialLabel =
    /\b(stainless(?:[ -]?steel)?|steel|metal|aluminum|aluminium|plastic|polyethylene|polypropylene|polycarbonate|glass|pet|hdpe)\b/i.test(
      labelText
    );

  if (isBottleLike && !hasMaterialLabel) {
    return {
      itemName: "Reusable bottle (material uncertain)",
      isRecyclable: false,
      recyclability: "conditionally_recyclable",
      advice: `The detected labels identify a bottle, but do not establish its material. Do not put it in plastic recycling based on this result. If it is insulated stainless steel, check your municipal guidance in ${city} for a scrap-metal, special-collection, reuse, or take-back option. If it is plastic, recycle it only if your local program accepts that resin. Empty it, rinse it, and separate the cap if your local rules require it.`,
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      itemName: top,
      isRecyclable: false,
      recyclability: "conditionally_recyclable",
      advice: `We detected ${top} in ${city}. Local recycling rules vary. Rinse the item if it held food or liquid, check your municipal recycling guide, and keep plastic bags, food residue, and electronics out of regular recycling bins.`,
    };
  }

  const recyclabilityRaw = String(parsed.recyclability || "").toLowerCase();
  const allowed = new Set([
    "recyclable",
    "conditionally_recyclable",
    "not_recyclable",
  ]);
  const recyclability = allowed.has(recyclabilityRaw)
    ? recyclabilityRaw
    : parsed.isRecyclable
      ? "recyclable"
      : "conditionally_recyclable";

  const isRecyclable =
    typeof parsed.isRecyclable === "boolean"
      ? parsed.isRecyclable
      : recyclability !== "not_recyclable";

  return {
    itemName:
      typeof parsed.itemName === "string" && parsed.itemName.trim()
        ? parsed.itemName.trim().slice(0, 80)
        : top,
    isRecyclable,
    recyclability,
    advice:
      typeof parsed.advice === "string" && parsed.advice.trim()
        ? parsed.advice.trim().slice(0, 2000)
        : `Check local recycling rules in ${city} for ${top}.`,
  };
}

async function getGeminiClient() {
  if (geminiClient) {
    return geminiClient;
  }

  const secretId = process.env.GEMINI_API_KEY_SECRET_ID;
  if (!secretId) {
    throw new Error("GEMINI_API_KEY_SECRET_ID is not configured.");
  }

  const result = await secretsManager.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );
  let apiKey = result.SecretString;
  if (apiKey) {
    try {
      const secretObject = JSON.parse(apiKey);
      apiKey = secretObject.apiKey || secretObject.GEMINI_API_KEY || apiKey;
    } catch {
      // SecretString may contain the raw API key.
    }
  }
  if (!apiKey) {
    throw new Error("Gemini API key secret is empty.");
  }

  geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

async function getRecyclingAdvice({ labels, city }) {
  const client = await getGeminiClient();
  const response = await client.models.generateContent({
    model: process.env.GEMINI_MODEL_ID || "gemini-3.5-flash-lite",
    contents: buildUserPrompt({ labels, city }),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      maxOutputTokens: 700,
    },
  });

  return normalizeAdvice(extractJsonObject(response.text), labels, city);
}

module.exports = { getRecyclingAdvice };

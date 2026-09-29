"use strict";

const {
  BedrockRuntimeClient,
  ConverseCommand,
} = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient({});

const SYSTEM_PROMPT = `You are EcoScout, a global recycling and waste-disposal advisor.
You receive computer-vision labels for a photo of a waste item, plus the user's city and postal/PIN code.
You support users anywhere in the world — US, India, UK, Canada, Australia, and beyond.
Use your knowledge of local municipal solid waste rules for that specific city and country.

For Indian cities follow BBMP (Bangalore), BMC (Mumbai), MCD (Delhi), GHMCHyderabad), and other municipal corporation rules as applicable.
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

function buildUserPrompt({ labels, city, postalCode }) {
  const labelLines = labels
    .map(
      (label) =>
        `- ${label.name} (${label.confidence}%)${
          label.parents.length ? ` parents: ${label.parents.join(", ")}` : ""
        }`
    )
    .join("\n");

  return `City: ${city}
Postal / PIN code: ${postalCode}

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

function normalizeAdvice(parsed, labels, city, postalCode) {
  const top = labels[0]?.name || "unknown item";
  if (!parsed || typeof parsed !== "object") {
    return {
      itemName: top,
      isRecyclable: false,
      recyclability: "conditionally_recyclable",
      advice: `We detected ${top} in ${city} (${postalCode}). Local recycling rules vary. Rinse the item if it held food or liquid, check your municipal recycling guide, and keep plastic bags, food residue, and electronics out of regular recycling bins.`,
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
        : `Check local recycling rules in ${city} (${postalCode}) for ${top}.`,
  };
}

async function getRecyclingAdvice({ labels, city, postalCode }) {
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) {
    throw new Error("BEDROCK_MODEL_ID is not configured.");
  }

  const response = await client.send(
    new ConverseCommand({
      modelId,
      system: [{ text: SYSTEM_PROMPT }],
      messages: [
        {
          role: "user",
          content: [{ text: buildUserPrompt({ labels, city, postalCode }) }],
        },
      ],
      inferenceConfig: {
        maxTokens: 700,
        temperature: 0.2,
        topP: 0.9,
      },
    })
  );

  const text = (response.output?.message?.content || [])
    .map((block) => block.text)
    .filter(Boolean)
    .join("\n");

  return normalizeAdvice(extractJsonObject(text), labels, city, postalCode);
}

module.exports = { getRecyclingAdvice };

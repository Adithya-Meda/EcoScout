"use strict";

const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
const { GoogleGenAI } = require("@google/genai");

const secretsManager = new SecretsManagerClient({});
let geminiClient;

const SYSTEM_PROMPT = `You are ekoFuse.img, a global recycling and waste-disposal advisor with expertise in local municipal solid waste rules.
You receive computer-vision labels for a photo of a waste item, plus the user's city.
Your task: identify the item, assess its condition (new/unused, lightly used, heavily used, damaged, contaminated), and provide accurate recycling or disposal guidance specific to that location.

CONDITION ANALYSIS:
- If the item appears NEW, CLEAN, UNUSED, or in GOOD condition → assume it CAN be recycled (unless it's inherently non-recyclable like electronics or hazardous materials)
- If the item appears USED but CLEAN → likely recyclable (with proper preparation)
- If the item appears HEAVILY USED, STAINED, or CONTAMINATED (food residue, grease, liquid) → may NOT be recyclable; advise disposal or special handling
- If the item appears BROKEN or DAMAGED → check if material allows recycling or if it must be disposed as waste

MATERIAL IDENTIFICATION:
Treat the vision labels as primary evidence about the item's material. 
- NEVER infer plastic, glass, or metal from generic labels like "bottle", "flask", "thermos", "tumbler", or "shaker"
- If labels DO establish material (e.g., "plastic bottle", "glass jar", "aluminum can") → use that confidently
- If labels are AMBIGUOUS (e.g., just "bottle" with no material label) → state the uncertainty and give conditional advice

REGIONAL RULES:
- For Indian cities: Follow Solid Waste Management Rules 2016 → Wet (green), Dry/Recyclable (blue), Hazardous (red), Sanitary (black)
- For US cities: Use curbside single-stream or dual-stream rules specific to that municipality
- For other countries: Apply the most accurate local rule you know
- If uncertain about local rules, state that clearly and give the safest conservative advice

RESPONSE FORMAT:
Respond with ONLY a single JSON object (no markdown, no preamble, no commentary) using these exact keys:
- itemName: short, human-readable name reflecting the item's apparent condition and material (e.g., "Clean unused plastic bottle", "Stained paper cup", "Broken glass jar")
- isRecyclable: boolean — true if the item CAN be recycled in its current condition, false otherwise
- recyclability: one of "recyclable", "conditionally_recyclable", "not_recyclable"
- advice: 3-7 sentences of practical, plain-language guidance specific to this city. Include: (1) which bin to use or disposal method, (2) preparation steps (rinse, flatten, remove caps/lids, separate materials), (3) warnings about contamination or damage, (4) any take-back or special-collection options. Write for a non-technical audience. Never mention AWS, AI, or technology.

CONFIDENCE GUIDANCE:
- Be honest about ambiguity. If unsure, say so and give conservative (safe) advice.
- Never claim hazardous waste (electronics, batteries, fluorescent bulbs, paint) is safe for regular bins.
- If an item appears unused/clean, explicitly state "appears unused and clean, likely recyclable" in the advice to match user expectations.`;


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
  const isTissueOrPaper = /\b(tissue|paper|towel|napkin|facial)\b/i.test(
    labelText
  );
  const hasMaterialLabel =
    /\b(stainless(?:[ -]?steel)?|steel|metal|aluminum|aluminium|plastic|polyethylene|polypropylene|polycarbonate|glass|pet|hdpe)\b/i.test(
      labelText
    );

  // Special handling for tissue/paper products — usually recyclable if clean/unused
  if (isTissueOrPaper) {
    return {
      itemName: "Paper/tissue product (clean, unused)",
      isRecyclable: true,
      recyclability: "recyclable",
      advice: `Tissue and paper products like facial tissue, paper towels, and napkins are generally NOT recyclable because they become too weak when wet. However, if this is UNUSED tissue or packaging, it can often be composted or placed in general waste. If it has been used for food, liquids, or has grease/residue, dispose of it in general waste (black bin in ${city}). Never put wet or contaminated paper in recycling. Unused packaging paper can go in dry waste or recycling depending on your local rules.`,
    };
  }

  if (isBottleLike && !hasMaterialLabel) {
    return {
      itemName: "Reusable bottle (material uncertain)",
      isRecyclable: false,
      recyclability: "conditionally_recyclable",
      advice: `The detected labels identify a bottle, but do not establish its material. Do not put it in plastic recycling based on this result. If it appears to be clean, unused, or in good condition, check if it can be reused or donated. If it is insulated stainless steel, check your municipal guidance in ${city} for a scrap-metal, special-collection, reuse, or take-back option. If it is plastic, recycle it only if your local program accepts that resin and the bottle is clean. Empty it, rinse it, and separate the cap if your local rules require it.`,
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      itemName: top,
      isRecyclable: false,
      recyclability: "conditionally_recyclable",
      advice: `We detected ${top} in ${city}. Local recycling rules vary. Assess the item's condition: if it appears clean and unused, it is likely recyclable. If it is stained, contaminated, or damaged, dispose of it in general waste. Rinse items that held food or liquid, check your municipal recycling guide, and keep plastic bags, food residue, and electronics out of regular recycling bins.`,
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

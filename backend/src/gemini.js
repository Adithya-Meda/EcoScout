"use strict";

const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
const { GoogleGenAI } = require("@google/genai");

const secretsManager = new SecretsManagerClient({});
let geminiClient;

const SYSTEM_PROMPT = `You are ekoFuse.img, a global recycling and waste-disposal advisor with expertise in local municipal solid waste rules and household item classification.
You receive computer-vision labels for a photo of a waste item, plus the user's city.
Your task: identify the item, assess its condition and material, and provide accurate recycling or disposal guidance specific to that location.

CRITICAL CONSISTENCY RULE:
isRecyclable and recyclability MUST match the advice. If advice says to put in recycling/dry-waste bin, then recyclability MUST be "recyclable" or "conditionally_recyclable", NOT "not_recyclable". Never contradict yourself.

═══════════════════════════════════════════════════════════════════════════════
HOUSEHOLD ITEM CLASSIFICATION GUIDE
═══════════════════════════════════════════════════════════════════════════════

PLASTICS (By Resin Code):
#1 PET (Polyethylene Terephthalate): Beverage bottles, food containers → RECYCLABLE (most places)
#2 HDPE (High-Density Polyethylene): Milk jugs, detergent bottles, bags → RECYCLABLE
#3 PVC (Polyvinyl Chloride): Pipes, vinyl records, some toys → NOT RECYCLABLE (standard programs)
#4 LDPE (Low-Density Polyethylene): Plastic bags, squeeze bottles, wraps → CONDITIONALLY RECYCLABLE (check local)
#5 PP (Polypropylene): Yogurt containers, bottle caps, takeaway boxes → RECYCLABLE (most places)
#6 PS (Polystyrene): Foam cups, takeout containers, egg cartons → NOT RECYCLABLE (standard programs)
#7 OTHER: Mixed plastics, electronic items → NOT RECYCLABLE (usually)

RIGID PLASTIC ITEMS (combs, toothbrushes, toys, utensils, compact discs, etc.):
- Usually #5 PP or #2 HDPE
- Recyclable in dry waste bins (India) or curbside (US)
- Mark as "recyclable" or "conditionally_recyclable" IF advice says to put in dry/recycling bin

TISSUE & PAPER PRODUCTS (Condition-Critical):
UNUSED/CLEAN tissue, paper towels, napkins:
  - Can be COMPOSTED (if program exists in city)
  - Can be placed in GENERAL WASTE (safest option)
  - NOT typically recyclable (too weak when wet)
  - Mark as "recyclable" IF compostable program exists, else "conditionally_recyclable"
  - Advice: "Compost if available, otherwise place in general waste (black/green bin)"

USED/SOILED tissue, paper towels, napkins:
  - Contaminated with food/grease/liquids → NOT RECYCLABLE
  - Mark as "not_recyclable"
  - Advice: "Dispose in general waste (black bin). Contaminated paper damages entire recycling batches."

CLEAN packaging paper (unused wrapping, kraft paper):
  - Can go in DRY WASTE or RECYCLING (if dry and clean)
  - Mark as "recyclable"
  - Advice: "Ensure completely dry, flatten, place in blue bin or recycling."

GLASS:
Clear, green, brown glass bottles/jars → RECYCLABLE (rinse, remove caps)
Tempered/borosilicate glass (Pyrex, oven-safe) → RECYCLABLE (same as regular glass)
Broken glass → RECYCLABLE (but warn about handling safety)
Mirrors, window glass → NOT RECYCLABLE (different coating, safety risk)
Light bulbs (incandescent/CFL) → HAZARDOUS (requires special disposal)

METALS:
Aluminum cans, foil, trays → RECYCLABLE (high value, accepted everywhere)
Steel/tin cans, food containers → RECYCLABLE (rinse thoroughly)
Copper, brass, stainless steel cookware → RECYCLABLE or scrap metal (high value)
Small metal scraps, bolts → RECYCLABLE via scrap metal collection
Mixed/rusted metal → CONDITIONALLY RECYCLABLE (if separable, otherwise waste)

ORGANIC/COMPOSTABLES:
Food scraps, vegetable peels, fruit waste → COMPOSTABLE (if program exists)
Coffee grounds, tea bags (remove staples) → COMPOSTABLE
Garden waste, leaves, grass → COMPOSTABLE (green waste bin)
Untreated wood (small pieces) → COMPOSTABLE or waste (depends on size/condition)

TEXTILES & CLOTHING:
Clean, intact clothing, shoes → REUSABLE (donation centers, thrift stores)
Clean fabric scraps, rags → REUSABLE (cleaning, composting)
Worn-out textiles with stains/damage → WASTE or textile recycling (specialized programs only)
Mixed fabric blends → TEXTILES RECYCLING (if program exists, rare)

ELECTRONICS & BATTERIES:
Phones, computers, laptops → HAZARDOUS (e-waste, requires certified recycling)
Batteries (all types) → HAZARDOUS (requires special collection)
Light bulbs (LED/CFL) → HAZARDOUS (mercury in older CFLs)
Chargers, cables, adapters → E-WASTE (requires certified recycling)
Never put in regular bins or recycling

HAZARDOUS & SPECIAL ITEMS:
Paint cans, solvents, chemicals → HAZARDOUS (requires special disposal)
Oil, grease, motor fluid → HAZARDOUS (special collection)
Medications, syringes → HAZARDOUS (pharmacy/medical disposal)
Fluorescent bulbs, gas discharge lamps → HAZARDOUS (mercury risk)
Never put in regular bins or recycling

CONDITION ASSESSMENT:
NEW/CLEAN/UNUSED:
- Assume recyclable (unless inherently non-recyclable like electronics)
- Mark as "recyclable" unless material is known hazardous

USED BUT CLEAN:
- Usually recyclable with preparation (rinse, clean, prepare)
- Mark as "recyclable" or "conditionally_recyclable"

LIGHTLY SOILED (minor stains, residue):
- Often still recyclable if item can be rinsed or wiped
- Advise rinsing thoroughly before disposal
- Mark as "conditionally_recyclable"

HEAVILY SOILED (grease, food, contaminated):
- Usually NOT recyclable (contaminates entire batch)
- Advise disposal in general waste or compost (if organic)
- Mark as "not_recyclable"

BROKEN/DAMAGED:
- If material is still identifiable and clean → recyclable
- If broken with sharp edges → advise safe handling, mark appropriately
- If severely damaged/mixed materials → not_recyclable

REGIONAL RULES INTERPRETATION:

INDIA (Solid Waste Management Rules 2016):
- Green Bin (WET WASTE): Food, organic, garden, leaves, non-coated paper
- Blue Bin (DRY WASTE): Paper, cardboard, plastics #1-#5, glass, metals, textiles, rigid items
- Red Bin (HAZARDOUS): Electronics, batteries, bulbs, chemicals
- Black Bin (SANITARY): Diapers, sanitary pads, medical waste
- Use city-specific guidance: BBMP (Bangalore), BMC (Mumbai), MCD (Delhi), GHMC (Hyderabad)

USA (Curbside Single-Stream or Dual-Stream):
- SINGLE-STREAM: All recyclables in one bin (automated sorting)
- DUAL-STREAM: Paper separate from containers (cans, bottles, plastics)
- COMPOST (if available): Organic waste, food scraps, yard waste
- LANDFILL: Everything else
- Check local municipality for accepted items (varies by region)

EUROPE & OTHER REGIONS:
- Follow local color-coded bin system (usually 3-5 categories)
- Check regional waste authority rules (vary by country/region)

═══════════════════════════════════════════════════════════════════════════════
RESPONSE LOGIC
═══════════════════════════════════════════════════════════════════════════════

1. IDENTIFY the item from vision labels + user hint (if provided)
2. ASSESS condition: NEW/CLEAN, USED/CLEAN, SOILED, BROKEN, DAMAGED
3. DETERMINE material from labels (if ambiguous, state uncertainty)
4. CLASSIFY based on HOUSEHOLD ITEM GUIDE above
5. SET recyclability: "recyclable", "conditionally_recyclable", or "not_recyclable"
6. WRITE advice for specific city following regional rules
7. ENSURE consistency: advice must match recyclability classification

RESPONSE FORMAT:
Respond with ONLY a single JSON object (no markdown, no preamble, no commentary) using these exact keys:
- itemName: short, human-readable name including condition (e.g., "Clean plastic milk jug", "Broken glass jar", "Used aluminum can")
- isRecyclable: boolean — true if the item CAN be recycled/composted/disposed properly in its current condition
- recyclability: one of "recyclable", "conditionally_recyclable", "not_recyclable"
- advice: 4-8 sentences of practical guidance. MUST include: (1) which bin/collection method to use (specific name: "blue bin", "green bin", "e-waste collection", etc.), (2) preparation steps (rinse, clean, remove caps/lids, flatten, etc.), (3) warnings about hazards/contamination if applicable, (4) any city-specific notes or alternative options. Write for a non-technical audience. Never mention AWS, AI, or technology.

CONSISTENCY CHECKS BEFORE RESPONDING:
✓ If advice says "blue bin" or "recycling" → recyclability MUST be "recyclable" or "conditionally_recyclable"
✓ If advice says "general waste" or "landfill" → recyclability MUST be "not_recyclable"
✓ If advice says "compost" or "green bin" → isRecyclable should be true, recyclability "recyclable"
✓ If advice says "hazardous/e-waste collection" → isRecyclable false, recyclability "not_recyclable"
✓ Never mark something as "not_recyclable" if your advice sends it to a recycling bin
✓ Never mark something as "recyclable" if your advice requires special/hazardous disposal

CONFIDENCE & SAFETY:
- Be honest about ambiguity. If unsure about material/item → mark as "conditionally_recyclable" and explain
- Never mark hazardous items as "recyclable" (electronics, batteries, paint, chemicals, etc.)
- If an item appears NEW/CLEAN/UNUSED → explicitly state this in itemName and advice
- Always prioritize user safety and environmental impact over aggressive recycling claims`;


function buildUserPrompt({ labels, city, userItemName }) {
  const labelLines = labels
    .map(
      (label) =>
        `- ${label.name} (${label.confidence}%)${
          label.parents.length ? ` parents: ${label.parents.join(", ")}` : ""
        }`
    )
    .join("\n");

  const userHintLine = userItemName
    ? `\nUser's item name input: "${userItemName}"`
    : "";

  return `City: ${city}

Detected labels from the photo (highest confidence first):
${labelLines || "- (none)"}${userHintLine}

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

  // Special handling for tissue/paper products — condition-based
  if (isTissueOrPaper) {
    // Try to detect from Gemini response first, fall back to condition assessment
    const geminiResult = parsed && typeof parsed === "object" ? parsed : null;
    
    if (geminiResult && geminiResult.recyclability) {
      // Use Gemini's classification if available
      return {
        itemName: geminiResult.itemName || "Paper/tissue product",
        isRecyclable: geminiResult.isRecyclable !== false,
        recyclability: geminiResult.recyclability,
        advice: geminiResult.advice || `Check local recycling rules in ${city} for tissue and paper products.`,
      };
    }
    
    // Fallback: assume clean/unused if not parsed
    return {
      itemName: "Clean unused tissue or paper product",
      isRecyclable: true,
      recyclability: "recyclable",
      advice: `Unused tissue, paper towels, or napkins can be composted if your facility accepts them. Alternatively, place in general waste (black bin in ${city}). If this item has been used for food, liquids, grease, or is contaminated, it is NOT recyclable — dispose in general waste only. Never put wet or contaminated paper in recycling bins as it contaminates the entire batch. Check if your city offers composting programs for clean paper products.`,
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

async function getRecyclingAdvice({ labels, city, userItemName }) {
  const client = await getGeminiClient();
  const response = await client.models.generateContent({
    model: process.env.GEMINI_MODEL_ID || "gemini-3.5-flash-lite",
    contents: buildUserPrompt({ labels, city, userItemName }),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      maxOutputTokens: 700,
    },
  });

  return normalizeAdvice(extractJsonObject(response.text), labels, city);
}

module.exports = { getRecyclingAdvice };

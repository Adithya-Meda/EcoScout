# ekoFuse.img Gemini Prompt - Comprehensive Household Item Classification

This document outlines the enhanced Gemini system prompt that covers a wide range of household items for accurate recycling/disposal classification.

## 📋 Item Categories Covered

### PLASTICS (By Resin Code)
| Code | Type | Examples | Recyclability |
|------|------|----------|---------------|
| #1 | PET | Beverage bottles, food containers | ✅ Recyclable |
| #2 | HDPE | Milk jugs, detergent bottles | ✅ Recyclable |
| #3 | PVC | Pipes, vinyl records, toys | ❌ Not recyclable |
| #4 | LDPE | Plastic bags, squeeze bottles | ⚠️ Conditional |
| #5 | PP | Yogurt containers, bottle caps | ✅ Recyclable |
| #6 | PS | Foam cups, takeout containers | ❌ Not recyclable |
| #7 | OTHER | Mixed plastics, electronics | ❌ Not recyclable |

**Rigid Plastic Items:** Combs, toothbrushes, toys, utensils, CDs → Usually recyclable in dry waste (India) or curbside (US)

### PAPER & CARDBOARD
- **Recyclable:** Clean boxes, newspapers, magazines, office paper
- **Not Recyclable:** Tissue paper, paper towels, napkins, wax-lined/plastic-coated
- **Conditional:** Glossy packaging (check local rules)

**Critical Rule:** Paper soaked in food/grease contaminates entire batches → dispose in general waste or compost

### GLASS
- **Recyclable:** Clear, green, brown bottles/jars (rinse, remove caps)
- **Recyclable:** Tempered/borosilicate glass (Pyrex, oven-safe)
- **Recyclable:** Broken glass (warn about handling safety)
- **Not Recyclable:** Mirrors, window glass (different coating)
- **Hazardous:** Light bulbs (incandescent/CFL/LED) → requires special disposal

### METALS
| Item | Type | Recyclability |
|------|------|---------------|
| Aluminum cans, foil, trays | Aluminum | ✅ High value, widely accepted |
| Steel/tin cans | Steel | ✅ Rinse thoroughly |
| Cookware (copper, brass, stainless) | Mixed metals | ✅ Scrap metal collection |
| Small metal scraps, bolts | Mixed | ✅ Via scrap collection |
| Rusted/mixed metal | Mixed | ⚠️ Depends on condition |

### ORGANIC & COMPOSTABLES
- **Compostable:** Food scraps, vegetable peels, fruit waste
- **Compostable:** Coffee grounds, tea bags (remove staples)
- **Compostable:** Garden waste, leaves, grass
- **Compostable/Waste:** Small untreated wood pieces (depends on size)

### TEXTILES & CLOTHING
- **Reusable:** Clean, intact clothing and shoes (donation centers, thrift stores)
- **Reusable:** Clean fabric scraps/rags (cleaning, composting)
- **Waste:** Worn-out textiles with stains/damage
- **Specialized:** Mixed fabric blends (textile recycling programs, rare)

### ELECTRONICS & BATTERIES (ALL HAZARDOUS)
❌ **NEVER put in regular bins or recycling**

| Item | Disposal |
|------|----------|
| Phones, computers, laptops | E-waste certified recycling |
| Batteries (all types) | Special battery collection |
| Light bulbs (LED/CFL/incandescent) | Hazardous collection |
| Chargers, cables, adapters | E-waste recycling |

### HAZARDOUS & SPECIAL ITEMS (ALL REQUIRE SPECIAL DISPOSAL)
❌ **NEVER put in regular bins or recycling**

- Paint cans, solvents, chemicals
- Oil, grease, motor fluid
- Medications, syringes
- Fluorescent bulbs, gas discharge lamps
- Any item marked with hazard symbols

## 🔍 Condition Assessment Framework

### NEW/CLEAN/UNUSED
- **Action:** Assume recyclable (unless inherently non-recyclable)
- **Marking:** "recyclable" (unless hazardous material)
- **Advice:** Direct to appropriate bin

### USED BUT CLEAN
- **Action:** Usually recyclable with preparation
- **Marking:** "recyclable" or "conditionally_recyclable"
- **Advice:** Rinse, clean, prepare, then recycle

### LIGHTLY SOILED (Minor stains/residue)
- **Action:** Often still recyclable if rinsable
- **Marking:** "conditionally_recyclable"
- **Advice:** Rinse thoroughly before disposal

### HEAVILY SOILED (Grease, food, contaminated)
- **Action:** Not recyclable (contaminates batch)
- **Marking:** "not_recyclable"
- **Advice:** Dispose in general waste or compost

### BROKEN/DAMAGED
- **If clean & identifiable:** Recyclable (warn about sharp edges)
- **If severely damaged:** Not recyclable (mixed materials)
- **Marking:** Depends on material and condition

## 🌍 Regional Rules

### INDIA (Solid Waste Management Rules 2016)
| Bin | Color | Contents |
|-----|-------|----------|
| Wet Waste | Green | Food, organic, garden, non-coated paper |
| Dry Waste | Blue | Paper, cardboard, plastics #1-#5, glass, metals, textiles, rigid items |
| Hazardous | Red | Electronics, batteries, bulbs, chemicals |
| Sanitary | Black | Diapers, sanitary pads, medical waste |

**City-Specific:** BBMP (Bangalore), BMC (Mumbai), MCD (Delhi), GHMC (Hyderabad)

### USA (Curbside Systems)
- **Single-Stream:** All recyclables in one bin (automated sorting)
- **Dual-Stream:** Paper separate from containers
- **Compost:** Organic waste, food scraps, yard waste (if available)
- **Landfill:** Everything else

**Note:** Rules vary significantly by municipality

### OTHER REGIONS
- Follow local color-coded bin system (3-5 categories)
- Check regional waste authority for accepted items

## ✅ Consistency Checks (Critical)

The prompt enforces **strict consistency** between classification and advice:

| Classification | Acceptable Advice | Unacceptable Advice |
|---|---|---|
| `"recyclable"` | Blue bin, recycling bin, green bin | General waste, landfill |
| `"conditionally_recyclable"` | Check local + conditional advice | Definitive "must" statements |
| `"not_recyclable"` | General waste, landfill, hazardous | Put in any recycling bin |

**Example of INCORRECT (caught by prompt):**
```
Classification: "not_recyclable"
Advice: "Place in blue recycling bin"
❌ CONTRADICTORY!
```

**Example of CORRECT:**
```
Classification: "recyclable"
Advice: "Rinse and place in blue bin"
✅ CONSISTENT!
```

## 📝 Response Format

All responses follow this JSON structure:

```json
{
  "itemName": "Clean used plastic milk jug",
  "isRecyclable": true,
  "recyclability": "recyclable",
  "advice": "Rinse the milk jug thoroughly to remove residue, empty completely, and remove the cap if loose. Place in the blue dry waste bin for collection. Milk jugs (#2 HDPE) are widely recyclable and help save significant energy compared to virgin plastic production."
}
```

## 🎯 Key Prompt Features

1. **Explicit Material Classification:** Every plastic resin code defined
2. **Condition-Based Assessment:** Different rules for clean vs soiled items
3. **Regional Specificity:** India (SWM 2016), USA (curbside), other regions
4. **Hazard Recognition:** Automatic hazardous classification for electronics/chemicals
5. **Consistency Enforcement:** Classification must match advice
6. **Safety First:** Never marks hazardous items as recyclable
7. **City-Specific Guidance:** References BBMP, BMC, MCD, GHMC, etc.
8. **User-Friendly:** Non-technical language, practical preparation steps

## 🧪 Test Scenarios

### ✅ Plastic Comb (Clean, Unused)
**Expected Response:**
```
itemName: "Clean unused plastic comb"
recyclability: "recyclable"
advice: "Place in blue dry waste bin"
```

### ✅ Glass Jar (Broken)
**Expected Response:**
```
itemName: "Broken glass jar"
recyclability: "recyclable"
advice: "Wrap in newspaper to prevent cuts. Place in recycling bin or glass collection."
```

### ✅ Electronics (Smartphone)
**Expected Response:**
```
itemName: "Used smartphone"
recyclability: "not_recyclable"
advice: "Do NOT put in regular bins. Take to certified e-waste collection center."
```

### ✅ Paper Cup (With Plastic Lining)
**Expected Response:**
```
itemName: "Used takeaway coffee cup"
recyclability: "not_recyclable"
advice: "Plastic lining prevents paper recycling. Dispose in general waste or compost if available."
```

### ✅ Cardboard Box (Clean)
**Expected Response:**
```
itemName: "Clean cardboard box"
recyclability: "recyclable"
advice: "Flatten and place in blue dry waste or paper recycling bin."
```

## 📈 Coverage

The enhanced prompt now covers:
- ✅ **7 plastic resin types** + rigid plastic items
- ✅ **10+ paper/cardboard varieties**
- ✅ **8+ glass types** including hazardous lighting
- ✅ **5+ metal categories**
- ✅ **Organic & compostable items**
- ✅ **Textiles & clothing**
- ✅ **Electronics & batteries**
- ✅ **Hazardous materials**
- ✅ **Regional variations** (India, USA, Others)
- ✅ **Condition-based logic** (Clean/Used/Soiled/Broken)

**Total Common Household Items:** 50+

## 🚀 Deployment

After updating `backend/src/gemini.js`, redeploy:

```bash
cd backend
sam build
sam deploy
```

All responses will now use the enhanced prompt with comprehensive household item coverage.

---

**Last Updated:** October 1, 2026  
**Commit:** `9be92ba`

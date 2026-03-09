"""
Colab Local LLM Metadata Enrichment
===================================
This script runs entirely on a free Google Colab T4 GPU. It bypasses
Gemini API rate limits by using an open-weights 3B/7B LLM locally.

Setup in Colab:
1. Change Runtime type -> T4 GPU
2. Run the following installation command in a cell:
   !pip install transformers accelerate bitsandbytes langchain-core tqdm > /dev/null
3. Upload your `chunks.json` (from any of the 3 strategies) to Colab.
4. Run this script.
5. Download the resulting `chunks_enriched.json`.
"""

import json
import torch
from pathlib import Path
from tqdm import tqdm
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
INPUT_FILE = "chunks.json"
OUTPUT_FILE = "chunks_enriched.json"
BATCH_SIZE = 5

# Qwen 2.5 3B Instruct is remarkably fast, highly accurate with JSON formatting,
# and fits comfortably in a free Colab T4's 16GB VRAM at bfloat16 precision.
# (No HuggingFace token required).
MODEL_ID = "Qwen/Qwen2.5-3B-Instruct"

# ---------------------------------------------------------------------------
# Allowed values (Matches rag/metadata_enrichment.py exactly)
# ---------------------------------------------------------------------------
DSM5_SYMPTOMS = [
    "minimal functional communication", "very limited social initiation", "minimal response to social overtures",
    "limited functional communication", "reduced social initiation", "atypical social responses",
    "difficulty initiating interaction", "ineffective social reciprocity", "social awkwardness",
    "extreme behavioral inflexibility", "high distress with change", "significant interference across settings",
    "behavioral rigidity", "distress with transitions", "interference in multiple contexts",
    "difficulty switching tasks", "organizational challenges", "mild-to-moderate rigidity",
]

VALID_INTERVENTION_TYPES = {"behavioral", "pharmacological", "educational", "communication", "none", "other"}
VALID_CONTENT_TYPES = {"treatment_and_support", "diagnosis", "other"}

def _build_prompt(batch: list[dict]) -> str:
    symptoms_list = "\n".join(f'  "{s}"' for s in DSM5_SYMPTOMS)
    
    chunks_text = "\n\n".join(
        f'CHUNK {i} (source: {doc["metadata"].get("source", "?")}):\n'
        f'{doc["page_content"][:900]}'
        for i, doc in enumerate(batch)
    )

    return f"""Label each of the following {len(batch)} chunk(s) from autism clinical guidelines.

Return a JSON object with a single key "labels" whose value is an array of {len(batch)} objects, one per chunk, in the same order. Each object must have exactly these keys:

"dsm5_symptoms"     : array of strings — characters from the list below this chunk is DIRECTLY relevant to (empty array [] if none apply)
"intervention_type" : one of: "behavioral", "pharmacological", "educational", "communication", "none", "other"
"content_type"      : one of: "treatment_and_support", "diagnosis", "other"
"topic"             : string — up to 5 words describing the main subject

Valid DSM-5 symptom strings:
{symptoms_list}

---
{chunks_text}
---

Respond with ONLY the valid JSON object. Do not include markdown formatting or explanations."""

def merge_labels(batch: list[dict], raw_response: str) -> None:
    # Strip markdown code blocks if the LLM added them
    if raw_response.startswith("```"):
        raw_response = raw_response.split("```")[1]
        if raw_response.startswith("json"):
            raw_response = raw_response[4:]
    raw_response = raw_response.strip()

    try:
        parsed = json.loads(raw_response)
        labels = parsed.get("labels", []) if isinstance(parsed, dict) else parsed
    except Exception:
        print(f"\nFailed to parse JSON. Raw output:\n{raw_response[:200]}...\n")
        labels = []

    # Pad with defaults if missing
    while len(labels) < len(batch):
        labels.append({})

    for doc, label in zip(batch, labels):
        raw_symptoms = label.get("dsm5_symptoms", [])
        if isinstance(raw_symptoms, list):
            symptoms = [s for s in raw_symptoms if s in DSM5_SYMPTOMS]
        else:
            symptoms = []

        intervention = label.get("intervention_type", "none")
        if intervention not in VALID_INTERVENTION_TYPES:
            intervention = "other"

        content = label.get("content_type", "other")
        if content not in VALID_CONTENT_TYPES:
            content = "other"

        topic = str(label.get("topic", "unclassified"))[:80]

        # Merge directly into the chunk's metadata dictionary
        doc["metadata"]["dsm5_symptoms"]     = symptoms
        doc["metadata"]["intervention_type"] = intervention
        doc["metadata"]["content_type"]      = content
        doc["metadata"]["topic"]             = topic

def main():
    if not Path(INPUT_FILE).exists():
        print(f"File not found: {INPUT_FILE}. Please upload your chunks.json to the Colab environment.")
        return

    print(f"Loading chunks from {INPUT_FILE}...")
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    # Resume capability: finding chunks without 'content_type'
    unenriched = [c for c in chunks if "content_type" not in c["metadata"]]
    print(f"{len(chunks) - len(unenriched)} chunks already enriched. {len(unenriched)} remaining.")
    
    if not unenriched:
        print("All chunks enriched! Done.")
        return

    print(f"\nLoading Local LLM: {MODEL_ID} (this takes ~1-2 mins to download)...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.bfloat16,
        device_map="auto"
    )
    generator = pipeline(
        "text-generation", 
        model=model, 
        tokenizer=tokenizer, 
        max_new_tokens=1024,
        return_full_text=False,
    )

    print(f"\nEnriching {len(unenriched)} chunks in batches of {BATCH_SIZE}...")
    
    # Process in batches
    for i in tqdm(range(0, len(unenriched), BATCH_SIZE), desc="Batches"):
        batch = unenriched[i:i+BATCH_SIZE]
        prompt = _build_prompt(batch)
        
        # Apply Qwen's chat template
        messages = [
            {"role": "system", "content": "You are a clinical NLP assistant. Respond ONLY with valid JSON. Do not write markdown, explanations, or any other text outside the JSON object."},
            {"role": "user", "content": prompt}
        ]
        
        output = generator(messages, do_sample=False, temperature=0.0)[0]["generated_text"]
        
        # Update the dictionaries in-place
        merge_labels(batch, output)
        
        # Save incremental progress
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False)

    print(f"\n✅ Enrichment complete! Download your {OUTPUT_FILE} file from Colab.")

if __name__ == "__main__":
    main()

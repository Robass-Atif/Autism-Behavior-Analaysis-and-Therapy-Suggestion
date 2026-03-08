import json
import torch
import time
from tqdm import tqdm
from transformers import pipeline

# Assuming the chunks file is uploaded to Colab as 'chunks_enriched.json'
INPUT_FILE = 'chunks_enriched.json'
OUTPUT_FILE = 'mrr_dataset.json'
FLAT_OUTPUT_FILE = 'mrr_dataset_flat.json'

def main():
    print(f"Loading chunks from {INPUT_FILE}...")
    try:
        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            chunks = json.load(f)
    except FileNotFoundError:
        print(f"Error: {INPUT_FILE} not found. Please upload it to your Colab environment.")
        return

    # Filter out very short chunks
    # Some schemas use 'page_content', others use 'text'
    valid_chunks = [c for c in chunks if len(c.get("page_content", c.get("text", "")).split()) > 10]
    print(f"Loaded {len(valid_chunks)} valid chunks.")

    # Try to load existing progress so you can resume if Colab disconnects
    dataset = []
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            dataset = json.load(f)
            print(f"Resuming from {len(dataset)} previously generated queries.")
    except FileNotFoundError:
        pass

    processed_ids = {item["chunk_id"] for item in dataset}
    remaining_chunks = [c for c in valid_chunks if c["metadata"]["chunk_id"] not in processed_ids]
    print(f"Chunks left to process: {len(remaining_chunks)}")

    if not remaining_chunks:
        print("All chunks have been processed.")
        return

    # Load the LLM (using a fast, capable open-weights model)
    # You can change this to "meta-llama/Meta-Llama-3-8B-Instruct" if you have a huggingface token
    model_id = "Qwen/Qwen2.5-7B-Instruct"  
    print(f"Loading model {model_id}...")
    pipe = pipeline(
        "text-generation",
        model=model_id,
        model_kwargs={"torch_dtype": torch.bfloat16},
        device_map="auto" # Automatically uses the T4/L4 GPU on Colab
    )

    for chunk in tqdm(remaining_chunks, desc="Generating queries"):
        chunk_id = chunk["metadata"]["chunk_id"]
        text = chunk.get("page_content", chunk.get("text", ""))

        # Prompt aiming for EXACTLY ONE realistic therapist query
        messages = [
            {"role": "system", "content": "You are a clinical therapist specializing in autism spectrum disorders."},
            {"role": "user", "content": f"Based on the following text chunk extracted from clinical guidelines, generate EXACTLY ONE relevant and realistic search query or clinical question that a therapist might ask which would be perfectly answered by this text.\n\nCRITICAL RULES:\n1. Formulate the query from the perspective of a clinical practitioner seeking guidance.\n2. Output ONLY the query itself, no quotes, no explanations, no introductory text.\n\nText Chunk:\n{text}\n\nQuery:"}
        ]

        try:
            output = pipe(
                messages, 
                max_new_tokens=50, 
                temperature=0.1, 
                do_sample=False
            )
            
            # Extract generated text from the pipeline format
            generated_text = output[0]['generated_text'][-1]['content'].strip()
            
            # Clean up if the model accidentally generates quotes
            query = generated_text.strip('"').strip("'").strip()

            dataset.append({
                "chunk_id": chunk_id,
                "query": query
            })

            # Save periodically (every 50 chunks) to not lose progress
            if len(dataset) % 50 == 0:
                with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                    json.dump(dataset, f, indent=2)

        except Exception as e:
            print(f"Error generating query for chunk {chunk_id}: {e}")

    # Final save
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)

    # Generate a flat version for easy evaluation metric calculation
    flat_dataset = []
    for item in dataset:
        flat_dataset.append({
            "query": item["query"],
            "expected_chunk_id": item["chunk_id"]
        })

    with open(FLAT_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(flat_dataset, f, indent=2)

    print(f"Finished! Saved to {OUTPUT_FILE} and {FLAT_OUTPUT_FILE}")

if __name__ == "__main__":
    main()

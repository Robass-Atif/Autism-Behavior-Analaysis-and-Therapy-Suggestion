import json
from pathlib import Path

import sys
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

data_file = ROOT / "data" / "model_output.json"
out_file = ROOT / "tests" / "results_variables.json"

def sa_to_text(sa: float) -> str:
    if sa < 6: return "minimal social communication deficits"
    elif sa < 12: return "mild social communication difficulties and slightly reduced social initiation"
    elif sa < 18: return "substantial social communication challenges and limited social reciprocity"
    else: return "severe and profound social communication deficits with minimal response to social overtures"

def rrb_to_text(rrb: float) -> str:
    if rrb < 2: return "minimal repetitive behaviors"
    elif rrb < 5: return "mild restricted repetitive behaviors and slight inflexibility"
    elif rrb < 9: return "noticeable behavioral rigidity, distress with change, and repetitive actions"
    else: return "extreme behavioral inflexibility and highly restricted behaviors interfering with daily life"

def cs_to_text(cs: int) -> str:
    if cs <= 2: return "minimal-to-no evidence of autism symptoms"
    elif cs <= 4: return "a low level of autism-related symptoms"
    elif cs <= 7: return "a moderate level of autism-related symptoms requiring support"
    else: return "a high level of autism-related symptoms requiring very substantial support"

def sev_to_text(sev: int) -> str:
    if sev == 0: return "difficulty initiating interaction, ineffective social reciprocity, social awkwardness, difficulty switching tasks, organizational challenges, and mild-to-moderate rigidity"
    elif sev == 1: return "limited functional communication, reduced social initiation, atypical social responses, behavioral rigidity, distress with transitions, and interference in multiple contexts"
    else: return "minimal functional communication, very limited social initiation, minimal response to social overtures, extreme behavioral inflexibility, high distress with change, and significant interference across settings"

def build_experimental_query(patient_data: dict, strategy: str):
    age = patient_data.get("input_age", 3)
    gender = "boy" if patient_data.get("input_gender", "M") == "M" else "girl"
    
    sa = patient_data.get("social_affect", 0)
    rrb = patient_data.get("rrb", 0)
    cs = int(patient_data.get("comparison_score", 0))
    sev = int(patient_data.get("severity", 1))

    base_dense = f"What are the recommended interventions, therapies, and treatments for an autistic {age}-year-old {gender} presenting with "
    base_sparse = "interventions therapies treatments autism "

    if strategy == "1_severity_only":
        text = sev_to_text(sev)
    elif strategy == "2_social_affect_only":
        text = sa_to_text(sa)
    elif strategy == "3_rrb_only":
        text = rrb_to_text(rrb)
    elif strategy == "4_comparison_score_only":
        text = cs_to_text(cs)
    elif strategy == "5_social_affect_and_rrb":
        text = f"{sa_to_text(sa)} as well as {rrb_to_text(rrb)}"
    elif strategy == "6_severity_and_comparison_score":
        text = f"{sev_to_text(sev)}, indicating {cs_to_text(cs)}"
    elif strategy == "7_all_variables_combined":
        text = f"{sev_to_text(sev)}. The child specifically shows {sa_to_text(sa)}, alongside {rrb_to_text(rrb)}, which reflects {cs_to_text(cs)}"
    else:
        raise ValueError(f"Unknown strategy: {strategy}")

    return {
        "dense": base_dense + text + "?",
        "sparse": base_sparse + text
    }

def evaluate_combinations():
    import time
    from rag.pipeline import RAGSystem
    from rag.checkpoints import load_chunks
    from rag.query_builder import RetrievalQueries
    
    with open(data_file, "r") as f:
        data = json.load(f)
        
    patient = data.get("predictions_2d", {})
    r_level = int(patient.get("severity", 1)) + 1
    
    strategies = [
        "1_severity_only",
        "2_social_affect_only", 
        "3_rrb_only",
        "4_comparison_score_only",
        "5_social_affect_and_rrb",
        "6_severity_and_comparison_score",
        "7_all_variables_combined"
    ]
    
    print("Loading RAG System (Hybrid)...")
    rag = RAGSystem(strategy="hybrid")
    rag.load_or_build_indexes(None, force_rebuild=False, pdf_dir=None)

    results = {}
    
    for s in strategies:
        print(f"\n--- Testing Strategy: {s} ---")
        q = build_experimental_query(patient, s)
        print(f"Dense Query: {q['dense']}")
        
        t0 = time.time()
        retrieved = rag.retrieve(
            data,
            top_k=8,
            force_rebuild=False,
            use_metadata_filter=True,
            use_reranker=False,
            query_override=RetrievalQueries(dense=q["dense"], sparse=q["sparse"])
        )
        
        # Skip generation to avoid API rate limits!
        # Instead, we evaluate the quality of the retrieved chunks themselves.
        
        chunk_summaries = []
        for i, r in enumerate(retrieved):
            # Extract a short snippet of the text to quickly evaluate relevance
            snippet = r.get("text", "").replace("\n", " ").strip()
            if len(snippet) > 200:
                snippet = snippet[:200] + "..."
            
            chunk_summaries.append({
                "rank": i + 1,
                "source": f"{r.get('source')} p.{r.get('page')}",
                "content_type": r.get("content_type", "unknown"),
                "snippet": snippet
            })
            
        print(f"Retrieved {len(retrieved)} chunks in {time.time()-t0:.2f}s")
        
        results[s] = {
            "query": q["dense"],
            "retrieved_count": len(retrieved),
            "chunks": chunk_summaries
        }

    with open(out_file, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nSaved all experimental retrieval outputs to {out_file}")

if __name__ == "__main__":
    evaluate_combinations()

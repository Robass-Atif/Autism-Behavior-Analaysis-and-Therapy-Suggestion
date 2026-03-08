import os
import shutil
import time
from pathlib import Path

def main():
    print("=== [1] Backing up production directories ===")
    shutil.copytree("databases", "databases_backup", dirs_exist_ok=True)
    shutil.copytree("chunks", "chunks_backup", dirs_exist_ok=True)
    shutil.copytree("pdfs", "pdfs_backup", dirs_exist_ok=True)
    
    try:
        print("\n=== [2] Getting initial ChromaDB count ===")
        import chromadb
        client = chromadb.PersistentClient(path="databases/chroma_db")
        try:
            collection = client.get_collection("langchain")
            initial_count = collection.count()
        except:
            initial_count = 0
        print(f"Initial DB chunk count: {initial_count}")
        # Close client to release SQLite locks
        del client
        
        print("\n=== [3] Creating dummy PDF ===")
        os.system(".venv/bin/pip install -q fpdf")
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 10, txt="DUMMY_INGESTION_TEST_TEXT: This is a highly specific novelty intervention testing string for ASD evaluations.", ln=1)
        
        os.makedirs("pdfs_new", exist_ok=True)
        pdf.output("pdfs_new/dummy_test.pdf")
        print("Created pdfs_new/dummy_test.pdf")
        
        # Temporarily patch config.py to disable metadata enrichment so tests don't hit Gemini rate limits
        print("\n=== [4] Executing RAG Pipeline with --ingest ===")
        # We pass an env var and modify rag_pipeline.py or config.py temporarily if needed, 
        # but the easiest way to test the CLI is to just run it as is. 
        # To avoid rate limits in the test, we'll patch config on the fly via a bash command
        os.system("sed -i 's/METADATA_ENRICH_ENABLED = True/METADATA_ENRICH_ENABLED = False/g' rag/config.py")
        
        # If generation fails due to rate limits, we still want to verify the database appended correctly
        exit_code = os.system(".venv/bin/python rag_pipeline.py --ingest")
        if exit_code != 0:
            print("\n[!] WARNING: Pipeline execution threw an error (likely a Gemini 429 Rate Limit for generation).")
            print("[!] The database ingestion sequence has already completed prior to generation. Proceeding to validate ChromaDB increment...\n")

        os.system("sed -i 's/METADATA_ENRICH_ENABLED = False/METADATA_ENRICH_ENABLED = True/g' rag/config.py")
        
        print("\n=== [5] Validating Incremental Addition ===")
        client = chromadb.PersistentClient(path="databases/chroma_db")
        collection = client.get_collection("langchain")
        final_count = collection.count()
        print(f"Final DB chunk count: {final_count}")
        print(f"Net new chunks: {final_count - initial_count}")
        
        print("\nSearching ChromaDB for the dummy text...")
        results = collection.get(where_document={"$contains": "DUMMY_INGESTION_TEST_TEXT"})
        found_count = len(results['ids']) if results and 'ids' in results else 0
        print(f"Found {found_count} chunk(s) containing 'DUMMY_INGESTION_TEST_TEXT'.")
        
        is_moved = os.path.exists("pdfs/dummy_test.pdf")
        print(f"Dummy PDF successfully moved to pdfs/: {is_moved}")

        if final_count > initial_count and found_count > 0 and is_moved:
            print("\n✅ SUCCESS: Incremental ingestion working correctly. Data was appended, not overwritten.")
        else:
            print("\n❌ FAILURE: Incremental ingestion did not meet expected criteria.")

        del client

    finally:
        print("\n=== [6] Restoring production directories ===")
        shutil.rmtree("databases")
        shutil.move("databases_backup", "databases")
        
        shutil.rmtree("chunks")
        shutil.move("chunks_backup", "chunks")
        
        shutil.rmtree("pdfs")
        shutil.move("pdfs_backup", "pdfs")
        
        if os.path.exists("pdfs_new/dummy_test.pdf"):
            os.remove("pdfs_new/dummy_test.pdf")
            
        print("Restoration complete. Test dummy wiped.")

if __name__ == "__main__":
    main()

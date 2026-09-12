# M2.2 — RAG Pipeline & Semantic Search

## Honest note on embeddings, upfront
Your architecture doc specifies Sentence Transformers for embeddings. I
built that as the primary/production path (`SentenceTransformerEmbedder`
in `embeddings.py`) — but I could not test it from this sandboxed
environment: loading the model triggers a download from Hugging Face's
servers, which this environment can't reach (confirmed — it hangs
indefinitely rather than erroring).

So the pipeline supports **two backends behind the same interface**,
switchable via one env var:
- `EMBEDDING_BACKEND=tfidf` (default) — real TF-IDF cosine-similarity
  embeddings. No model download, no network dependency, works everywhere
  immediately. This is what I actually built, tested, and validated below.
- `EMBEDDING_BACKEND=sentence-transformers` — the real semantic embedding
  model. Will work fine on your machine with normal internet access (one-
  time ~90MB download, then cached). I wrote and reviewed the code but
  could not run it myself.

**Recommendation:** run it with `sentence-transformers` on your machine
once you set this up — it'll give meaningfully better retrieval (catches
paraphrases like "frontend" vs "client-side" that TF-IDF can't), and
costs nothing extra to switch — one env var.

## Pipeline
1. **Chunking** (`chunking.py`) — each posting becomes 2 chunks: an
   "overview" (title, company, description) and a "requirements" (skills,
   experience, education). Field-based, not arbitrary character splitting
   — keeps each chunk semantically coherent. 200 postings → 400 chunks.
2. **Embedding** (`embeddings.py`) — see above.
3. **Indexing** (`vector_index.py`) — embeddings stored as a `.npy`
   matrix, chunk metadata as JSON. Brute-force cosine similarity — fine at
   this scale (400 chunks, sub-millisecond search); would want an ANN
   index (FAISS, or pgvector's own indexing) at much larger scale.
4. **Search** (`search.py`) — embeds the query, searches chunks, collapses
   results to distinct jobs (keeping each job's best-scoring chunk).
5. **API** (`routers/internships.py`) — `GET /internships/search?q=...`

## Retrieval quality — tested with 5 real queries
| Query | Top result | Relevant? |
|---|---|---|
| "frontend web development internship with React and JavaScript" | Business Operations Intern for Social Impact | ❌ — see below |
| "social media marketing and content creation internship" | Social Media & Digital Marketing Internship | ✅ |
| "data analysis and Python internship" | Engineering Intern (skills: Java, PHP, Python) | ✅ |
| "graphic design and Photoshop internship" | Graphic Design Intern (Paid) | ✅ |
| "sales and business development internship" | Sales and Marketing Analyst Intern | ✅ |

4/5 queries retrieved a clearly relevant top result. The one miss is
instructive, not swept under the rug:

**Why query 1 failed:** the top-ranked posting mentions "react" once
(almost certainly "react to feedback," not the React framework) and
"development" twice (business development, not software development).
TF-IDF matches on raw term overlap — it has no way to know these are
different senses of common English words. This is TF-IDF's fundamental
ceiling, not a bug in the pipeline; a semantic embedding model would very
likely get this right, because it represents "React" in the context of
"frontend, JavaScript" differently than "react" in "react to feedback."
This is the concrete argument for switching to `sentence-transformers`
before relying on this for real matching in M2.3.

## A real bug I found and fixed along the way
Initial testing surfaced a duplicate — two different postings (`job_id`
11051 and 13883), both "Digital Marketing Intern @ Yazamo," 95%+ identical
text (one had an extra sentence: "Attention: This is an unpaid Internship
position"). My M2.1 dedup only caught *exact* text matches, so this slipped
through as a real company reposting.

Fixed by adding near-duplicate detection to `build_dataset.py`: within
same-company groups, computes word-set Jaccard similarity between
descriptions, and drops the shorter of any pair above 0.85 similarity.
Rerunning found **63 near-duplicate reposts** in the raw data — removed
before finalizing the 200-posting dataset. (Re-download the updated
`internship_dataset.json` from this delivery — M2.1's file has been
regenerated with this fix.)

## Files
- `chunking.py`, `embeddings.py`, `vector_index.py` — the pipeline modules
- `build_index.py` — builds the index (run this after copying files)
- `search.py` — the retrieval function
- `routers/internships.py` — the API endpoint
- `data_pipeline/internship_dataset.json` — **updated** M2.1 dataset (63 near-dups removed)
- `data_pipeline/build_dataset.py` — **updated** with near-dup detection

## Setup
```powershell
# from backend/, venv active
pip install scikit-learn sentence-transformers   # sentence-transformers only needed if you switch backends
python -m app.rag.build_index
```
Then restart `uvicorn` and try:
```
GET http://127.0.0.1:8000/internships/search?q=marketing internship&top_k=5
```

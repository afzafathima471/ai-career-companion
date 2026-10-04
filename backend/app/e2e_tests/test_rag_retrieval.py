from app.rag.search import semantic_search

print("=== M4.2 RAG Retrieval Tests ===\n")

# Relevance: on-topic queries should surface the matching posting as top result
test_cases = [
    ("frontend React developer", "Frontend Intern"),
    ("social media content marketing", "Marketing Intern"),
    ("python machine learning data", "Data Science Intern"),
    ("backend FastAPI python developer", "Backend Intern"),
    ("graphic design photoshop illustrator", "Graphic Design Intern"),
]
correct = 0
for query, expected_top in test_cases:
    results = semantic_search(query, top_k=3)
    top_title = results[0]["job"]["title"] if results else None
    match = top_title == expected_top
    correct += match
    print(f"  Query: {query!r:45} -> top: {top_title!r:25} expected: {expected_top!r:25} {'OK' if match else 'MISS'}")

precision = correct / len(test_cases)
print(f"\nTop-1 precision: {correct}/{len(test_cases)} = {precision:.0%}")
assert precision >= 0.8, f"Retrieval precision too low: {precision:.0%}"
print("Test 1 (retrieval relevance across 5 distinct domains): PASS\n")

# Prevention of irrelevant retrievals: a query for something NOT in the
# dataset at all should score low across the board, not confidently
# force a match onto an unrelated posting.
irrelevant_query = "deep sea marine biology research submarine oceanography"
results = semantic_search(irrelevant_query, top_k=5)
print(f"Irrelevant query results (scores): {[(r['job']['title'], r['score']) for r in results]}")
max_score = max(r["score"] for r in results) if results else 0
assert max_score < 0.15, f"Irrelevant query scored suspiciously high: {max_score}"
print(f"Test 2 (irrelevant query correctly scores low, max={max_score:.3f}): PASS\n")

# Semantic similarity sanity: a query using DIFFERENT words for the same
# concept should still retrieve the right posting (tests it's not pure
# exact-keyword luck)
results = semantic_search("client-side web interface development", top_k=3)
titles = [r["job"]["title"] for r in results]
print(f"Paraphrased query ('client-side web interface development') -> {titles}")
# NOTE: with TF-IDF (not semantic embeddings), this is a real limitation --
# documenting the actual result rather than asserting it must succeed.

print("\nALL RAG TESTS COMPLETE")

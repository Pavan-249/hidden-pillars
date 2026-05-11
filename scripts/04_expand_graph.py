import requests
import json
import time
import os

SEED_IDS = {
    "backprop":  "W1498436455",
    "lstm":      "W2064675550",
    "attention": "W2133564696",
    "cnn":       "W2147800946",
    "dropout":   "W2095705004",
    "word2vec":  "W1614298861",
}

BASE_URL = "https://api.openalex.org/works"
os.makedirs("data/raw", exist_ok=True)

FIELDS = "id,title,publication_year,cited_by_count,referenced_works"


def fetch_citers(paper_id, max_pages=25):
    """Fetch papers that cite paper_id (incoming citations)."""
    results = []
    for page in range(1, max_pages + 1):
        r = requests.get(BASE_URL, params={
            "filter": f"cites:{paper_id}",
            "per_page": 200,
            "page": page,
            "select": FIELDS,
        })
        data = r.json()
        batch = data.get("results", [])
        if not batch:
            break
        results.extend(batch)
        time.sleep(0.3)
    return results


def strip_prefix(openalex_id):
    return openalex_id.replace("https://openalex.org/", "")


# ── Phase 1: Expand hop-1 (up to 5000 citers per seed) ──────────────────────

print("Phase 1: collecting hop-1 citers (up to 5000 per seed)...")

hop1 = {}  # seed_name → list of paper dicts
for name, sid in SEED_IDS.items():
    papers = fetch_citers(sid, max_pages=25)
    hop1[name] = papers
    print(f"  {name}: {len(papers)} hop-1 papers")

with open("data/raw/hop1.json", "w") as f:
    json.dump(hop1, f)

print("hop-1 saved.")


# ── Phase 2: Expand hop-2 (citers of top-100 hop-1 per seed) ────────────────

print("\nPhase 2: collecting hop-2 citers (top 100 by cited_by_count per seed)...")

hop2 = {}  # paper_id → list of paper dicts (its citers)

already_fetched = set()

for name, papers in hop1.items():
    # Sort by cited_by_count descending, pick top 100
    sorted_papers = sorted(
        papers,
        key=lambda p: p.get("cited_by_count") or 0,
        reverse=True
    )
    top100 = sorted_papers[:100]

    print(f"  {name}: fetching hop-2 for top 100 papers...")
    for paper in top100:
        pid = strip_prefix(paper["id"])
        if pid in already_fetched:
            continue
        already_fetched.add(pid)
        citers = fetch_citers(pid, max_pages=1)  # 200 per hop-2 paper
        hop2[pid] = citers
        time.sleep(0.2)

    print(f"    done ({len(already_fetched)} unique hop-2 sources so far)")

with open("data/raw/hop2.json", "w") as f:
    json.dump(hop2, f)

print("hop-2 saved.")


# ── Phase 3: Build unified nodes + edges tables ──────────────────────────────

print("\nPhase 3: building graph tables...")

nodes = {}
edges = []

# Add seed papers as nodes
for name, sid in SEED_IDS.items():
    nodes[sid] = {
        "id": sid,
        "title": name,
        "year": None,
        "cited_by_count": None,
        "node_type": "seed",
    }

# Add hop-1 papers + edges: hop1_paper → seed
for name, papers in hop1.items():
    sid = SEED_IDS[name]
    for p in papers:
        pid = strip_prefix(p["id"])
        if pid not in nodes:
            nodes[pid] = {
                "id": pid,
                "title": p.get("title") or "",
                "year": p.get("publication_year"),
                "cited_by_count": p.get("cited_by_count"),
                "node_type": "hop1",
            }
        edges.append({"source": pid, "target": sid, "relationship": "CITES"})

# Add hop-2 papers + edges: hop2_paper → hop1_paper
for hop1_id, papers in hop2.items():
    for p in papers:
        pid = strip_prefix(p["id"])
        if pid not in nodes:
            nodes[pid] = {
                "id": pid,
                "title": p.get("title") or "",
                "year": p.get("publication_year"),
                "cited_by_count": p.get("cited_by_count"),
                "node_type": "hop2",
            }
        edges.append({"source": pid, "target": hop1_id, "relationship": "CITES"})

# Cross-seed edges: if a hop-1 paper references another of our hop-1 papers
hop1_ids = set(nodes.keys()) - set(SEED_IDS.values())
seed_ids = set(SEED_IDS.values())

for name, papers in hop1.items():
    for p in papers:
        pid = strip_prefix(p["id"])
        refs = p.get("referenced_works") or []
        for ref in refs:
            ref_id = strip_prefix(ref)
            # Only add edge if the ref is another seed (cross-pillar dependency)
            if ref_id in seed_ids and ref_id != SEED_IDS[name]:
                edges.append({"source": pid, "target": ref_id, "relationship": "CITES"})

print(f"  nodes: {len(nodes)}")
print(f"  edges: {len(edges)}")

with open("data/raw/nodes_v2.json", "w") as f:
    json.dump(list(nodes.values()), f)

with open("data/raw/edges_v2.json", "w") as f:
    json.dump(edges, f)

print("done — run 05_rebuild_db.py next to create the DuckDB file.")

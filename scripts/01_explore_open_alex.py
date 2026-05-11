import requests
import json
import time
import os

SEED_PAPERS = {
    "backprop": "W1498436455",
    "lstm": "W2064675550",
    "attention": "W2133564696",
    "cnn": "W2147800946",
    "dropout": "W2095705004",
    "word2vec": "W1614298861"
}

BASE_URL = "https://api.openalex.org/works"
os.makedirs("data/raw", exist_ok=True)

def get_citers(paper_id, max_pages=5):
    citers = []
    for page in range(1, max_pages + 1):
        params = {
            "filter": f"cites:{paper_id}",
            "per_page": 200,
            "page": page,
            "select": "id,title,publication_year,cited_by_count,concepts"
        }
        r = requests.get(BASE_URL, params=params)
        data = r.json()
        results = data.get("results", [])
        if not results:
            break
        citers.extend(results)
        time.sleep(0.5)
    return citers

all_data = {}

for name, paper_id in SEED_PAPERS.items():
    citers = get_citers(paper_id, max_pages=5)
    all_data[name] = {"seed_id": paper_id, "citers": citers}
    print(f"{name}: {len(citers)}")

with open("data/raw/citations_1hop.json", "w") as f:
    json.dump(all_data, f)
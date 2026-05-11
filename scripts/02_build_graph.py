import json
import duckdb

with open("data/raw/citations_1hop.json") as f:
    raw = json.load(f)

nodes = {}
edges = []

for seed_name, data in raw.items():
    seed_id = data["seed_id"]
    nodes[seed_id] = {
        "id": seed_id,
        "title": seed_name,
        "year": None,
        "cited_by_count": None,
        "node_type": "seed"
    }
    for paper in data["citers"]:
        pid = paper["id"].replace("https://openalex.org/", "")
        if pid not in nodes:
            nodes[pid] = {
                "id": pid,
                "title": paper.get("title", ""),
                "year": paper.get("publication_year"),
                "cited_by_count": paper.get("cited_by_count"),
                "node_type": "citer"
            }
        edges.append({
            "source": pid,
            "target": seed_id,
            "relationship": "CITES"
        })

with open("data/raw/nodes.json", "w") as f:
    json.dump(list(nodes.values()), f)

with open("data/raw/edges.json", "w") as f:
    json.dump(edges, f)

con = duckdb.connect()

con.execute("CREATE TABLE nodes AS SELECT * FROM read_json_auto('data/raw/nodes.json')")
con.execute("CREATE TABLE edges AS SELECT * FROM read_json_auto('data/raw/edges.json')")

con.execute("COPY nodes TO 'data/nodes.parquet' (FORMAT PARQUET)")
con.execute("COPY edges TO 'data/edges.parquet' (FORMAT PARQUET)")

print(f"nodes: {con.execute('SELECT COUNT(*) FROM nodes').fetchone()[0]}")
print(f"edges: {con.execute('SELECT COUNT(*) FROM edges').fetchone()[0]}")
print(con.execute("DESCRIBE nodes").fetchall())
print(con.execute("DESCRIBE edges").fetchall())
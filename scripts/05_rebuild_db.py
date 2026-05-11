import duckdb
import os

DB_PATH = "data/hidden_pillars.db"

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

con = duckdb.connect(DB_PATH)

con.execute("CREATE TABLE nodes AS SELECT * FROM read_json_auto('data/raw/nodes_v2.json')")
con.execute("""
    CREATE TABLE edges AS
    SELECT row_number() OVER () AS edge_id, source, target, relationship
    FROM read_json_auto('data/raw/edges_v2.json')
""")

con.execute("COPY nodes TO 'data/nodes.parquet' (FORMAT PARQUET)")
con.execute("COPY edges TO 'data/edges.parquet' (FORMAT PARQUET)")

print("nodes:", con.execute("SELECT COUNT(*) FROM nodes").fetchone()[0])
print("edges:", con.execute("SELECT COUNT(*) FROM edges").fetchone()[0])
print()
print("node types:")
for row in con.execute("SELECT node_type, COUNT(*) FROM nodes GROUP BY node_type ORDER BY 2 DESC").fetchall():
    print(" ", row[0], ":", row[1])

con.close()

print(f"\nSaved {DB_PATH}, nodes.parquet, and edges.parquet.")


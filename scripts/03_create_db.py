import duckdb

con = duckdb.connect("data/hidden_pillars.db")
con.execute("DROP TABLE IF EXISTS edges")
con.execute("DROP TABLE IF EXISTS nodes")
con.execute("CREATE TABLE nodes AS SELECT * FROM read_parquet('data/nodes.parquet')")
con.execute("""
    CREATE TABLE edges AS 
    SELECT row_number() OVER () AS edge_id, source, target, relationship
    FROM read_parquet('data/edges.parquet')
""")

print(con.execute("SELECT COUNT(*) FROM nodes").fetchone()[0], "nodes")
print(con.execute("SELECT COUNT(*) FROM edges").fetchone()[0], "edges")
print(con.execute("SELECT * FROM edges LIMIT 2").fetchall())
con.close()
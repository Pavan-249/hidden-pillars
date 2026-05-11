#!/usr/bin/env python3
"""
Phase 1: Data Validation & Testing
Validates all pillar data, product dependencies, and citation chains using DuckDB
"""

import duckdb
import json
import sys
from pathlib import Path

# Setup paths
DB_PATH = "data/hidden_pillars.db"
PILLARS_JSON = "viz_data/pillars.json"
PRODUCTS_JSON = "viz_data/products.json"
OUTPUT_DIR = Path("validation_reports")
OUTPUT_DIR.mkdir(exist_ok=True)

# Load expected data
with open(PILLARS_JSON) as f:
    PILLARS = json.load(f)

with open(PRODUCTS_JSON) as f:
    PRODUCTS = json.load(f)

print("=" * 80)
print("PHASE 1: DATA VALIDATION & TESTING")
print("=" * 80)

# ─── Task 1: Validate Pillar Data Integrity ───────────────────────────────────

print("\n[TASK 1] Validating Pillar Data Integrity...")
print("-" * 80)

con = duckdb.connect(DB_PATH)

pillar_validation = {
    "status": "PASS",
    "pillars": [],
    "issues": []
}

for pillar in PILLARS:
    pillar_id = pillar["id"]
    pillar_title = pillar["title"]
    
    print(f"\nPillar: {pillar_id} ({pillar_title[:50]}...)")
    
    # Query for this pillar in the database
    query = f"""
    SELECT id, title, node_type, COUNT(*) as count
    FROM nodes
    WHERE node_type = 'Paper' 
      AND (id LIKE '%{pillar_id}%' OR title LIKE '%{pillar_title[:30]}%')
    GROUP BY id, title, node_type
    """
    
    try:
        result = con.execute(query).fetchall()
        if result:
            print(f"  ✓ Found in database: {len(result)} match(es)")
            for row in result:
                print(f"    - ID: {row[0]}, Title: {row[1][:60]}...")
            pillar_validation["pillars"].append({
                "id": pillar_id,
                "title": pillar_title,
                "found": True,
                "db_matches": len(result)
            })
        else:
            print(f"  ✗ NOT FOUND in database")
            pillar_validation["status"] = "FAIL"
            pillar_validation["issues"].append(f"Pillar '{pillar_id}' not found in database")
            pillar_validation["pillars"].append({
                "id": pillar_id,
                "title": pillar_title,
                "found": False,
                "db_matches": 0
            })
    except Exception as e:
        print(f"  ✗ Query error: {e}")
        pillar_validation["status"] = "FAIL"
        pillar_validation["issues"].append(f"Error querying pillar '{pillar_id}': {str(e)}")

# ─── Task 2: Validate Product Dependencies ─────────────────────────────────────

print("\n\n[TASK 2] Validating Product Dependencies...")
print("-" * 80)

product_validation = {
    "status": "PASS",
    "products": [],
    "issues": [],
    "dependency_matrix": []
}

for product in PRODUCTS:
    product_id = product["id"]
    product_name = product["name"]
    dependencies = product["dependencies"]
    
    print(f"\nProduct: {product_name}")
    print(f"  Dependencies: {', '.join(dependencies)}")
    
    # Check if all dependencies are valid pillar IDs
    valid_deps = []
    invalid_deps = []
    
    for dep in dependencies:
        if any(p["id"] == dep for p in PILLARS):
            valid_deps.append(dep)
            print(f"    ✓ {dep}")
        else:
            invalid_deps.append(dep)
            print(f"    ✗ {dep} (NOT FOUND)")
            product_validation["status"] = "FAIL"
            product_validation["issues"].append(f"Product '{product_name}' has invalid dependency: '{dep}'")
    
    product_validation["products"].append({
        "id": product_id,
        "name": product_name,
        "dependencies": dependencies,
        "valid_dependencies": valid_deps,
        "invalid_dependencies": invalid_deps,
        "is_valid": len(invalid_deps) == 0
    })
    
    # Add to dependency matrix
    for dep in valid_deps:
        product_validation["dependency_matrix"].append({
            "product": product_name,
            "pillar": dep
        })

# Check for orphaned products (no valid dependencies)
orphaned = [p for p in product_validation["products"] if len(p["valid_dependencies"]) == 0]
if orphaned:
    product_validation["status"] = "FAIL"
    for p in orphaned:
        product_validation["issues"].append(f"Product '{p['name']}' has no valid pillar dependencies")
    print(f"\n✗ Found {len(orphaned)} orphaned product(s)")
else:
    print(f"\n✓ All {len(PRODUCTS)} products have valid dependencies")

# ─── Task 3: Trace Citation Chains ────────────────────────────────────────────

print("\n\n[TASK 3] Tracing Citation Chains...")
print("-" * 80)

citation_chains = {
    "status": "PASS",
    "chains": [],
    "issues": []
}

# Query for citation paths in the database
print("\nQuerying citation edges in database...")
try:
    edge_count = con.execute("SELECT COUNT(*) FROM edges WHERE relationship = 'CITES'").fetchone()[0]
    print(f"  Total CITES edges: {edge_count}")
    
    # Get sample citation paths
    sample_edges = con.execute("""
    SELECT source, target, relationship
    FROM edges
    WHERE relationship = 'CITES'
    LIMIT 10
    """).fetchall()
    
    print(f"  Sample citation edges:")
    for source, target, rel in sample_edges:
        print(f"    {source} --{rel}--> {target}")
        
except Exception as e:
    print(f"  ✗ Error querying edges: {e}")
    citation_chains["status"] = "FAIL"
    citation_chains["issues"].append(f"Error querying citation edges: {str(e)}")

# ─── Task 4: Validate Gremlin Queries ─────────────────────────────────────────

print("\n\n[TASK 4] Validating Gremlin Queries...")
print("-" * 80)

gremlin_validation = {
    "status": "PASS",
    "queries": [],
    "issues": []
}

for pillar in PILLARS:
    pillar_id = pillar["id"]
    query = pillar.get("gremlin_query", "")
    
    print(f"\nPillar: {pillar_id}")
    print(f"  Query: {query[:80]}...")
    
    # Basic syntax validation
    if "g.V()" in query and "count()" in query:
        print(f"  ✓ Query syntax looks valid")
        gremlin_validation["queries"].append({
            "pillar": pillar_id,
            "query": query,
            "syntax_valid": True
        })
    else:
        print(f"  ✗ Query syntax may be invalid")
        gremlin_validation["status"] = "FAIL"
        gremlin_validation["issues"].append(f"Pillar '{pillar_id}' has invalid Gremlin query syntax")
        gremlin_validation["queries"].append({
            "pillar": pillar_id,
            "query": query,
            "syntax_valid": False
        })

# ─── Summary Report ───────────────────────────────────────────────────────────

print("\n\n" + "=" * 80)
print("VALIDATION SUMMARY")
print("=" * 80)

summary = {
    "task_1_pillar_validation": pillar_validation,
    "task_2_product_validation": product_validation,
    "task_3_citation_chains": citation_chains,
    "task_4_gremlin_queries": gremlin_validation,
    "overall_status": "PASS" if all([
        pillar_validation["status"] == "PASS",
        product_validation["status"] == "PASS",
        citation_chains["status"] == "PASS",
        gremlin_validation["status"] == "PASS"
    ]) else "FAIL"
}

print(f"\nTask 1 (Pillar Validation): {pillar_validation['status']}")
print(f"  - Pillars found: {sum(1 for p in pillar_validation['pillars'] if p['found'])}/{len(PILLARS)}")
if pillar_validation["issues"]:
    for issue in pillar_validation["issues"]:
        print(f"    ✗ {issue}")

print(f"\nTask 2 (Product Validation): {product_validation['status']}")
print(f"  - Valid products: {sum(1 for p in product_validation['products'] if p['is_valid'])}/{len(PRODUCTS)}")
if product_validation["issues"]:
    for issue in product_validation["issues"]:
        print(f"    ✗ {issue}")

print(f"\nTask 3 (Citation Chains): {citation_chains['status']}")
print(f"  - Citation edges found: {edge_count if 'edge_count' in locals() else 'N/A'}")
if citation_chains["issues"]:
    for issue in citation_chains["issues"]:
        print(f"    ✗ {issue}")

print(f"\nTask 4 (Gremlin Queries): {gremlin_validation['status']}")
print(f"  - Valid queries: {sum(1 for q in gremlin_validation['queries'] if q['syntax_valid'])}/{len(PILLARS)}")
if gremlin_validation["issues"]:
    for issue in gremlin_validation["issues"]:
        print(f"    ✗ {issue}")

print(f"\n{'='*80}")
print(f"OVERALL STATUS: {summary['overall_status']}")
print(f"{'='*80}")

# ─── Export Report ────────────────────────────────────────────────────────────

report_path = OUTPUT_DIR / "phase1_validation_report.json"
with open(report_path, "w") as f:
    json.dump(summary, f, indent=2)

print(f"\nReport saved to: {report_path}")

# ─── Dependency Matrix ─────────────────────────────────────────────────────────

print("\n\nDEPENDENCY MATRIX:")
print("-" * 80)
print(f"{'Product':<30} {'Pillars':<50}")
print("-" * 80)

for product in product_validation["products"]:
    deps = ", ".join(product["valid_dependencies"])
    print(f"{product['name']:<30} {deps:<50}")

# Export dependency matrix
matrix_path = OUTPUT_DIR / "dependency_matrix.json"
with open(matrix_path, "w") as f:
    json.dump(product_validation["dependency_matrix"], f, indent=2)

print(f"\nDependency matrix saved to: {matrix_path}")

con.close()

print("\n✓ Phase 1 validation complete!")
sys.exit(0 if summary["overall_status"] == "PASS" else 1)

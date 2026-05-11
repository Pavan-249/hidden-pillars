from gremlin_python.driver.driver_remote_connection import DriverRemoteConnection
from gremlin_python.process.anonymous_traversal import traversal
from gremlin_python.process.graph_traversal import __
import json

# 1. Connect to PuppyGraph's Gremlin endpoint
print("Connecting to PuppyGraph...")
connection = DriverRemoteConnection('ws://localhost:8182/gremlin', 'g')
g = traversal().withRemote(connection)

seeds = [
    {"id": "backprop", "title": "Learning representations by back-propagating errors"},
    {"id": "lstm", "title": "Long short-term memory"},
    {"id": "attention", "title": "Neural machine translation by jointly learning to align and translate"},
    {"id": "cnn", "title": "Backpropagation applied to handwritten zip code recognition"},
    {"id": "dropout", "title": "Dropout: a simple way to prevent neural networks from overfitting"},
    {"id": "word2vec", "title": "Efficient estimation of word representations in vector space"}
]

results = []

# 2. Run the multi-hop traversals natively in PuppyGraph
print("Calculating Reachable Impact Scores (RIS) via PuppyGraph...")
for seed in seeds:
    # This is the exact Gremlin query sent to PuppyGraph
    ris_score = g.V().has('Paper', 'title', seed['id']).repeat(__.inE('CITES').outV()).times(2).emit().dedup().count().next()
    
    print(f"{seed['id']}: {ris_score}")
    
    seed['ris_score'] = ris_score
    results.append(seed)

# 3. Export to JSON
with open('viz_data/pillars_puppygraph_export.json', 'w') as f:
    json.dump(results, f, indent=2)

print("\nDone! Exported to viz_data/pillars_puppygraph_export.json")

# Close connection
connection.close()

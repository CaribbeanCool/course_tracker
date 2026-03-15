import json
from collections import Counter

# Load the JSON data
with open("classes.json", "r", encoding="utf-8") as file:
    data = json.load(file)

# Count occurrences of each course name (ignoring wildcard placeholders ending with '****')
name_counts = Counter(
    item["name"]
    for item in data
    if isinstance(item.get("name"), str) and not item["name"].endswith("****")
)

# Find duplicates
duplicates = [name for name, count in name_counts.items() if count > 1]

if duplicates:
    print("Duplicate courses found:")
    for name in duplicates:
        print(f"- {name}")
else:
    print("No duplicates found.")

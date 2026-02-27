#!/bin/bash
# Syncs memory/*.md + MEMORY.md to NERVE v3 docs via API
# Usage: ./scripts/sync-memory.sh [base_url]

BASE_URL="${1:-https://nerve-v3.vercel.app}"
MEMORY_DIR="/Users/giuseppetomasello/.openclaw/workspace/memory"
MEMORY_MD="/Users/giuseppetomasello/.openclaw/workspace/MEMORY.md"
SYNCED=0
SKIPPED=0

sync_file() {
  local file="$1"
  local title="$2"
  local source="$3"
  local content
  content=$(cat "$file")
  
  # Check if doc exists by source
  local existing
  existing=$(curl -s "$BASE_URL/api/docs" | python3 -c "
import sys, json
docs = json.load(sys.stdin).get('docs', [])
for d in docs:
    if d.get('source') == '$source':
        print(d['id'])
        break
" 2>/dev/null)

  if [ -n "$existing" ]; then
    # Update existing
    curl -s -X PATCH "$BASE_URL/api/docs/$existing" \
      -H "Content-Type: application/json" \
      -d "$(python3 -c "import json; print(json.dumps({'content': open('$file').read(), 'title': '$title'}))")" > /dev/null
    SYNCED=$((SYNCED + 1))
  else
    # Create new
    python3 -c "
import json, sys
content = open('$file').read()
print(json.dumps({
    'title': '$title',
    'content': content,
    'category': 'memory',
    'source': '$source'
}))
" | curl -s -X POST "$BASE_URL/api/docs" \
      -H "Content-Type: application/json" \
      -d @- > /dev/null
    SYNCED=$((SYNCED + 1))
  fi
}

# Sync memory/*.md
for f in "$MEMORY_DIR"/*.md; do
  [ -f "$f" ] || continue
  basename=$(basename "$f" .md)
  
  # Format title
  if [[ "$basename" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    title="Daily Notes — $(date -j -f '%Y-%m-%d' "$basename" '+%b %d, %Y' 2>/dev/null || echo "$basename")"
  elif [[ "$basename" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})-(.+)$ ]]; then
    datepart="${BASH_REMATCH[1]}"
    namepart="${BASH_REMATCH[2]}"
    formatted_date=$(date -j -f '%Y-%m-%d' "$datepart" '+%b %d' 2>/dev/null || echo "$datepart")
    formatted_name=$(echo "$namepart" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')
    title="$formatted_date — $formatted_name"
  else
    title="$basename"
  fi
  
  sync_file "$f" "$title" "memory/$(basename "$f")"
done

# Sync MEMORY.md
if [ -f "$MEMORY_MD" ]; then
  sync_file "$MEMORY_MD" "Long-Term Memory" "MEMORY.md"
fi

echo "✅ Memory sync complete: $SYNCED synced"

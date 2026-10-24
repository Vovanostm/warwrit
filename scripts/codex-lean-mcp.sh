#!/usr/bin/env bash
# Print one -c / key=false argument per line. Kept servers are explicitly named
# by WARWRIT_AGENT_MCP (default codebase-memory-mcp). Never change global config.
set -uo pipefail
keep=" ${WARWRIT_AGENT_MCP-codebase-memory-mcp} "
listing="$(codex mcp list --json)" || { echo 'MCP discovery failed' >&2; exit 1; }
names="$(python3 -I -c '
import json,re,sys
servers=json.load(sys.stdin)
assert isinstance(servers,list), "expected MCP server array"
for s in servers:
    assert isinstance(s,dict) and isinstance(s.get("enabled"),bool), "invalid MCP entry"
    assert isinstance(s.get("name"),str) and re.fullmatch(r"[A-Za-z0-9_.-]+",s["name"]), "invalid MCP name"
for s in servers:
    if s["enabled"]: print(s["name"])
' <<< "$listing")" || { echo 'MCP decoder failed' >&2; exit 1; }
for name in $names; do
  if [[ "$keep" == *" $name "* ]]; then
    echo "MCP intentionally kept enabled: $name" >&2
    continue
  fi
  diagnostic="$(codex -c "mcp_servers.$name.enabled=false" mcp list --json 2>&1)"
  status=$?
  if (( status != 0 )); then
    printf '%s\n' "$diagnostic" >&2
    if [[ "$diagnostic" == *'missing field `command`'* && "$diagnostic" == *"mcp_servers.$name"* ]]; then
      echo "MCP unsupported override: $name; refusing to leave it enabled" >&2
    else
      echo "MCP override probe failed: $name (exit $status)" >&2
    fi
    exit 1
  fi
  if ! python3 -I -c '
import json,sys
servers=json.load(sys.stdin)
assert isinstance(servers,list), "expected MCP probe array"
assert any(s["name"] == sys.argv[1] and s.get("enabled") is False for s in servers), "MCP override did not disable server"
' "$name" <<< "$diagnostic"; then
    echo "MCP probe decoder/disable verification failed: $name" >&2
    exit 1
  fi
  printf -- '-c\nmcp_servers.%s.enabled=false\n' "$name"
done

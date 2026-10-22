#!/usr/bin/env bash
# Print `codex exec` arguments that keep the user's unused MCP servers from
# starting for a headless pipeline run. Each enabled server costs a resident
# node process (browser MCPs about 50 MB each) for the whole run although the
# briefs use the playwright-cli skill, gh and git. One `-c` / `key=false` pair
# per line; servers that cannot be overridden (plugin-provided) are skipped.
# Keep servers by name: WARWRIT_AGENT_MCP="codebase-memory-mcp other".
set -uo pipefail
keep=" ${WARWRIT_AGENT_MCP-codebase-memory-mcp} "
names="$(codex mcp list --json 2>/dev/null \
  | python3 -I -c 'import json,sys;[print(s["name"]) for s in json.load(sys.stdin) if s.get("enabled")]' 2>/dev/null)"
for name in $names; do
  [[ "$keep" == *" $name "* ]] && continue
  # A -c key for a server config.toml does not define makes codex refuse to start.
  codex -c "mcp_servers.$name.enabled=false" mcp list --json > /dev/null 2>&1 || continue
  printf -- '-c\nmcp_servers.%s.enabled=false\n' "$name"
done

#!/usr/bin/env bash
# Manual hosted timer for the unchanged pnpm test:migrations command.
set -euo pipefail
BASELINE_SHA=65d7466bb5bd34ae04ad0ef8e252b5d8808fa5a0
CANDIDATE_SHA=cf6a6fb544bca5e553704225f1b6d104ae903298
IMAGE_TAG=postgres:17-alpine
owned_pid= first_status=0 image_ref= image_id= origin= run_key= sample_database_url=
init_paths() {
  harness=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd); results="$harness/integration-timing-results"; inventory="$results/owned-resources.txt"; mkdir -p "$results/pids"
  if [[ "${1:-}" == reuse && -f "$results/work-root.txt" ]]; then
    work=$(cat "$results/work-root.txt")
  else
    work="${INTEGRATION_TIMING_WORK_ROOT:-${RUNNER_TEMP:-${TMPDIR:-/tmp}}/warwrit-integration-timing-$$}"; printf '%s\n' "$work" > "$results/work-root.txt"
  fi; mkdir -p "$work"
}
utc_now() { node -e 'process.stdout.write(new Date().toISOString() + "\n")'; }
own() { printf '%s %s\n' "$1" "$2" >> "$inventory"; }
field() { if [[ -f "$1" ]]; then tr -d '\n' < "$1"; else printf 'missing'; fi; }
median_of() { printf '%s\n' "$1" "$2" "$3" | sort -n | awk 'NR==2 { print; exit }'; }
redact_file() {
  local file=$1 tmp; [[ -f "$file" ]] || return 0; tmp=$(mktemp); sed -E -e 's/\r$//' -e 's/\x1B\[[0-9;]*[[:alpha:]]//g' \
    -e 's#postgres(ql)?://[^[:space:]'\''"<>]+#postgres://[redacted]#g' \
    -e 's#https://[^[:space:]@/]+@#https://[redacted]@#g' \
    -e 's#Bearer [A-Za-z0-9._-]+#Bearer [redacted]#g' \
    -e 's#(ghs_|github_pat_)[A-Za-z0-9_]+#\1[redacted]#g' "$file" > "$tmp"; mv "$tmp" "$file"
}
centiseconds() {
  local s=$1 whole frac; [[ "$s" =~ ^[0-9]+(\.[0-9]+)?$ ]] || return 1; whole=${s%%.*}; frac=; [[ "$s" == *.* ]] && frac=${s#*.}; frac=${frac}00; frac=${frac:0:2}
  printf '%s\n' $((10#$whole * 100 + 10#$frac))
}
timing_passes() {
  local baseline_cs candidate_cs; baseline_cs=$(centiseconds "$1") || return 1; candidate_cs=$(centiseconds "$2") || return 1; [[ "$baseline_cs" -gt 0 ]] || return 1
  ((candidate_cs * 100 <= 120 * baseline_cs))
}
postgres_setting() {
  awk -v key="$2:" '$0 ~ /^  postgres:/ { section = 1; next } section && $0 ~ /^  [^ ]/ { exit } section && $1 == key { print $2; exit }' "$1"
}
origin_url() {
  local url; url=$(git -C "$harness" remote get-url origin); url=${url%.git}
  case "$url" in
    https://*@*) url="https://${url#*@}" ;;
    git@github.com:*) url="https://github.com/${url#git@github.com:}" ;;
  esac; printf '%s.git\n' "$url"
}
remove_docker() {
  local err
  if [[ "$1" == container ]]; then err=$(docker rm -f "$2" 2>&1) && return 0; case "$err" in *"No such container"*) return 0 ;; esac
  else err=$(docker volume rm "$2" 2>&1) && return 0; case "$err" in *"No such volume"* | *"no such volume"*) return 0 ;; esac
  fi; printf '%s\n' "$err" >> "$results/cleanup-errors.txt"; return 1
}
remove_checkout() {
  [[ -n "$work" && "$1" == "$work/"* && "$1" != "$work/" ]] || return 1; rm -rf -- "$1"
}
pid_stamp() { ps -p "$1" -o lstart= 2>/dev/null | sed 's/^ *//;s/ *$//' || true; }
stop_owned_processes() {
  local file pid stamp now; shopt -s nullglob
  for file in "$results/pids"/*; do
    pid=$(basename "$file"); stamp=$(cat "$file"); now=$(pid_stamp "$pid")
    if [[ -n "$now" && "$now" == "$stamp" ]]; then
      kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || return 1; local i
      for i in 1 2 3 4 5 6 7 8 9 10; do now=$(pid_stamp "$pid"); [[ -n "$now" && "$now" == "$stamp" ]] || break; sleep 1; done; now=$(pid_stamp "$pid")
      if [[ -n "$now" && "$now" == "$stamp" ]]; then kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || return 1; fi
    fi; rm -f "$file"
  done; shopt -u nullglob; owned_pid=
}
cleanup_owned_inventory() {
  local kind name status=0; [[ -f "$inventory" ]] || return 0; stop_owned_processes || status=1
  while read -r kind name; do
    case "$kind" in
      container | volume) remove_docker "$kind" "$name" || status=1 ;;
      checkout) remove_checkout "$name" || status=1 ;;
    esac
  done < "$inventory"; return "$status"
}
on_exit() {
  local status=$?; trap - EXIT INT TERM
  if [[ "$status" -eq 0 ]]; then cleanup_owned_inventory || status=1; else cleanup_owned_inventory || true; fi; exit "$status"
}
capture_job() {
  local payload name=${TIMING_JOB_NAME:-Measure integration command} attempt; printf 'NOT_REPORTED\n' > "$results/job.json"
  [[ -n "${GITHUB_REPOSITORY:-}" && -n "${GITHUB_RUN_ID:-}" && -n "${GH_TOKEN:-${GITHUB_TOKEN:-}}" ]] || return 0; command -v gh >/dev/null 2>&1 || return 0
  for attempt in 1 2 3 4 5; do
    payload=$(GH_TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}" gh api "repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/attempts/${GITHUB_RUN_ATTEMPT:-1}/jobs" 2>>"$results/job-api.log" |
      jq --arg job_name "$name" '[.jobs[] | select(.name == $job_name) | {id,run_id,run_attempt,name,runner_id,runner_name,runner_group_id,runner_group_name,labels,started_at,html_url}]' \
      2>>"$results/job-api.log" || true); [[ -n "$payload" ]] && printf '%s\n' "$payload" > "$results/job.json"
    jq -e 'type=="array" and length==1 and .[0].id!=null and .[0].runner_id!=null and .[0].runner_name!=null' "$results/job.json" >/dev/null 2>&1 && break; sleep 2
  done; [[ -f "$results/job-api.log" ]] && redact_file "$results/job-api.log"
}
resolve_image() {
  docker pull "$IMAGE_TAG" > "$results/image-pull.log" 2>&1; redact_file "$results/image-pull.log"
  image_ref=$(docker image inspect "$IMAGE_TAG" --format '{{range .RepoDigests}}{{println .}}{{end}}' | awk '/sha256:/ { print; exit }'); image_id=$(docker image inspect "$IMAGE_TAG" --format '{{.Id}}')
  [[ "$image_ref" == *@sha256:* && -n "$image_id" ]] || return 1; printf '%s\n' "$image_ref" > "$results/image-digest.txt"; printf '%s\n' "$image_id" > "$results/image-id.txt"
}
prepare_sample() {
  local id=$1 sha=$2 dest=$3; local dir="$results/$id"; own checkout "$dest"; rm -rf -- "$dest"; mkdir -p "$dest"
  if ! { git init -q -b main "$dest" && git -C "$dest" remote add origin "$origin" &&
    git -C "$dest" -c protocol.version=2 fetch --no-tags --depth=1 origin "$sha" &&
    git -C "$dest" checkout --detach --quiet FETCH_HEAD; } >"$dir/checkout.log" 2>&1; then
    redact_file "$dir/checkout.log"; return 1
  fi; redact_file "$dir/checkout.log"; git -C "$dest" rev-parse HEAD > "$dir/checkout-sha.txt" || return 1; git -C "$dest" status --porcelain > "$dir/git-status.txt" || return 1
  git -C "$dest" diff --stat > "$dir/git-diff.txt" || return 1; [[ "$(cat "$dir/checkout-sha.txt")" == "$sha" && ! -s "$dir/git-status.txt" && ! -s "$dir/git-diff.txt" ]] || return 1
  node --input-type=module -e 'import {readFileSync} from "node:fs"; const p=JSON.parse(readFileSync(process.argv[1],"utf8")); process.stdout.write(p.scripts["test:migrations"] + "\n")' "$dest/package.json" > "$dir/package-script.txt" || return 1
  if ! (set -euo pipefail; unset GH_TOKEN GITHUB_TOKEN ACTIONS_RUNTIME_TOKEN; cd "$dest"; corepack enable; corepack prepare pnpm@11.25.0 --activate
    pnpm install --frozen-lockfile; pnpm --filter @warwrit/protocol run build && pnpm --filter @warwrit/game-core run build && pnpm --filter @warwrit/testkit run build; git diff --quiet && git diff --cached --quiet) >"$dir/prepare.log" 2>&1; then
    redact_file "$dir/prepare.log"; return 1
  fi; redact_file "$dir/prepare.log"
}
start_postgres() {
  local id=$1 dest=$2 db user pass slug cname vname binding ready i; local dir="$results/$id"; db=$(postgres_setting "$dest/compose.yaml" POSTGRES_DB)
  user=$(postgres_setting "$dest/compose.yaml" POSTGRES_USER); pass=$(postgres_setting "$dest/compose.yaml" POSTGRES_PASSWORD); [[ -n "$db" && -n "$user" && -n "$pass" ]] || return 1; slug=$(printf '%s' "$id" | tr '[:upper:]' '[:lower:]')
  cname="wwt-${slug}-${run_key}"; vname="wwt-${slug}-${run_key}-vol"; printf '%s\n' "$cname" > "$dir/container-name.txt"; printf '%s\n' "$vname" > "$dir/volume-name.txt"
  own container "$cname"; own volume "$vname"; docker volume create "$vname" >/dev/null || return 1; docker run -d --name "$cname" --pull never -e POSTGRES_DB="$db" -e POSTGRES_USER="$user" -e POSTGRES_PASSWORD="$pass" \
    -p '127.0.0.1::5432' -v "$vname:/var/lib/postgresql/data" "$image_ref" >"$dir/container-id.txt" 2>"$dir/container-start.log" || return 1; ready=0
  for i in $(seq 1 30); do
    if docker exec "$cname" pg_isready -U "$user" -d "$db" >/dev/null 2>&1; then ready=1; break; fi; sleep 2
  done; [[ "$ready" -eq 1 ]] || return 1; binding=$(docker port "$cname" 5432) || return 1; [[ "$binding" == 127.0.0.1:* && "${binding##*:}" =~ ^[1-9][0-9]*$ ]] || return 1
  printf '%s\n' "$binding" > "$dir/postgres-binding.txt"; docker exec "$cname" psql -U "$user" -d "$db" -tAc 'SELECT version()' | tr -d '\r' | sed 's/[[:space:]]*$//' > "$dir/postgres-version.txt" || return 1
  docker inspect -f '{{.Image}}' "$cname" > "$dir/container-image.txt" || return 1; sample_database_url="postgres://${user}:${pass}@${binding}/${db}"
}
collect_match() {
  local id=$1 dest=$2 node_version pnpm_version nproc_value cpu docker_version compose_version os_line image_version; local dir="$results/$id"; node_version=$(cd "$dest" && node --version) || return 1
  pnpm_version=$(cd "$dest" && pnpm --version) || return 1; nproc_value=$(nproc 2>/dev/null || true)
  cpu=$(lscpu 2>/dev/null | awk -F: '/^(Architecture|CPU\(s\)|Model name|Vendor ID|Thread\(s\) per core|Core\(s\) per socket|Socket\(s\)):/ { gsub(/^[ \t]+/, "", $2); gsub(/[ \t]+$/, "", $2); printf "%s=%s;", $1, $2 }' || true)
  docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null || true); compose_version=$(docker compose version 2>/dev/null | awk 'NR==1 { print; exit }' || true)
  os_line=$(if [[ -f /etc/os-release ]]; then . /etc/os-release && printf '%s %s' "$NAME" "$VERSION"; else printf 'NOT_REPORTED'; fi); image_version=${ImageVersion:-$(awk -F= '$1=="ImageVersion"{print $2}' /etc/environment 2>/dev/null || true)}
  printf 'node=%s\npnpm=%s\nimage_digest=%s\nimage_id=%s\ncontainer_image=%s\npostgres=%s\nnproc=%s\ncpu=%s\nos=%s\nkernel=%s\nimage_os=%s\nimage_version=%s\nrunner_os=%s\nrunner_arch=%s\nrunner_name=%s\ndocker=%s\ncompose=%s\n' \
    "$node_version" "$pnpm_version" "$image_ref" "$image_id" "$(cat "$dir/container-image.txt")" "$(tr -d '\n' < "$dir/postgres-version.txt")" \
    "${nproc_value:-NOT_REPORTED}" "${cpu:-NOT_REPORTED}" "${os_line:-NOT_REPORTED}" "$(uname -srm)" "${ImageOS:-NOT_REPORTED}" \
    "${image_version:-NOT_REPORTED}" "${RUNNER_OS:-NOT_REPORTED}" "${RUNNER_ARCH:-NOT_REPORTED}" "${RUNNER_NAME:-NOT_REPORTED}" \
    "${docker_version:-NOT_REPORTED}" "${compose_version:-NOT_REPORTED}" > "$dir/match.txt"
}
measure_sample() {
  local id=$1 dest=$2 status=0 pid stamp; local dir="$results/$id"; local time_file="$dir/time.txt"; : >"$dir/stdout.log"; : >"$dir/stderr.log"; utc_now > "$dir/utc-start.txt" || true; printf '%s\n' "/usr/bin/time -p -o $time_file pnpm test:migrations" > "$dir/command.txt"
  set -m; (cd "$dest" || exit 1; env -u IDENTITY_TEST_DATABASE_URL -u WARWRIT_ENCOUNTER_DATABASE_URL -u WARWRIT_COMPANY_DATABASE_URL \
      -u WARWRIT_FIRST_HUNT_ISOLATED_DATABASE_URL -u VITEST_MAX_WORKERS -u VITEST_MIN_WORKERS \
      -u VITEST_MAX_THREADS -u VITEST_MIN_THREADS -u VITEST_MAX_FORKS -u VITEST_MIN_FORKS \
      -u GH_TOKEN -u GITHUB_TOKEN -u ACTIONS_RUNTIME_TOKEN -u NODE_OPTIONS \
      NO_COLOR=1 FORCE_COLOR=0 DATABASE_URL="$sample_database_url" \
      /usr/bin/time -p -o "$time_file" pnpm test:migrations) >"$dir/stdout.log" 2>"$dir/stderr.log" &
  pid=$!; owned_pid=$pid; stamp=$(pid_stamp "$pid"); printf '%s\n' "$stamp" > "$results/pids/$pid"; printf '%s\n' "$pid" > "$dir/command-pid.txt"; wait "$pid" || status=$?; rm -f "$results/pids/$pid"; owned_pid=; set +m
  utc_now > "$dir/utc-end.txt" || true; printf '%s\n' "$status" > "$dir/exit.txt"; redact_file "$dir/stdout.log"; redact_file "$dir/stderr.log"; cat "$dir/stdout.log" "$dir/stderr.log" > "$dir/combined.txt"
  tail -n 80 "$dir/combined.txt" > "$dir/output-tail.txt"; awk '/^real /{print $2}' "$time_file" > "$dir/real.txt" || true; awk '/^user /{print $2}' "$time_file" > "$dir/user.txt" || true; awk '/^sys /{print $2}' "$time_file" > "$dir/sys.txt" || true
  return "$status"
}
cleanup_sample() {
  local id=$1 cname= vname= status=0; local dir="$results/$id"; [[ -f "$dir/container-name.txt" ]] && cname=$(cat "$dir/container-name.txt"); [[ -f "$dir/volume-name.txt" ]] && vname=$(cat "$dir/volume-name.txt")
  if [[ -n "$cname" ]]; then remove_docker container "$cname" || status=1; fi
  if [[ -n "$vname" ]]; then remove_docker volume "$vname" || status=1; fi
  if [[ -n "$cname" ]] && docker container inspect "$cname" >/dev/null 2>&1; then status=1; fi
  if [[ -n "$vname" ]] && docker volume inspect "$vname" >/dev/null 2>&1; then status=1; fi
  if [[ "$status" -eq 0 ]]; then printf 'ok\n' > "$dir/cleanup.txt"; else printf 'failed\n' > "$dir/cleanup.txt"; fi; return "$status"
}
run_sample() {
  local id=$1 sha=$2 cmd_status=0; local dest="$work/$id"; local dir="$results/$id"; mkdir -p "$dir"; printf '%s %s\n' "$(utc_now)" "$id" >> "$results/order.txt"; sample_database_url=
  if ! prepare_sample "$id" "$sha" "$dest"; then
    printf 'prepare_failed\n' > "$dir/invalid.txt"; printf 'ok\n' > "$dir/cleanup.txt"; remove_checkout "$dest" || true; return 0
  fi
  if ! start_postgres "$id" "$dest"; then
    cleanup_sample "$id" || true; printf 'start_failed\n' > "$dir/invalid.txt"; remove_checkout "$dest" || true; return 0
  fi; collect_match "$id" "$dest" || true; measure_sample "$id" "$dest" || cmd_status=$?; cleanup_sample "$id" || true
  remove_checkout "$dest" || true; return "$cmd_status"
}
suite_ok() {
  local id=$1 file=$2 expected line tests
  case $id in B*) expected=2 ;; C*) expected=8 ;; *) return 1 ;; esac
  line=$(grep -E '^[[:space:]]*Test Files[[:space:]]' "$file" | tail -n 1 || true); tests=$(grep -E '^[[:space:]]*Tests[[:space:]]' "$file" | tail -n 1 || true)
  [[ "$line" =~ ^[[:space:]]*Test\ Files[[:space:]]+${expected}\ passed\ \(${expected}\)[[:space:]]*$ ]] || return 1; [[ "$tests" =~ ^[[:space:]]*Tests[[:space:]]+([0-9]+)\ passed\ \(([0-9]+)\)[[:space:]]*$ ]] || return 1
  [[ "${BASH_REMATCH[1]}" == "${BASH_REMATCH[2]}" ]] || return 1; grep -F '{"event":"migration.smoke","status":"ok"}' "$file" >/dev/null
}
sample_valid() {
  local id=$1 sha image container; local dir="$results/$id"
  [[ -f "$dir/exit.txt" && -f "$dir/real.txt" && -f "$dir/time.txt" && -f "$dir/cleanup.txt" && -f "$dir/match.txt" && -f "$dir/combined.txt" && -f "$dir/checkout-sha.txt" && -f "$dir/git-status.txt" ]] || return 1
  [[ "$(field "$dir/exit.txt")" == 0 && "$(field "$dir/cleanup.txt")" == ok && ! -s "$dir/git-status.txt" ]] || return 1; sha=$(field "$dir/checkout-sha.txt")
  case $id in B*) [[ "$sha" == "$BASELINE_SHA" ]] || return 1 ;; C*) [[ "$sha" == "$CANDIDATE_SHA" ]] || return 1 ;; esac
  suite_ok "$id" "$dir/combined.txt" || return 1; grep -q '^node=v24.20.0$' "$dir/match.txt" || return 1; grep -q '^pnpm=11.25.0$' "$dir/match.txt" || return 1; grep -q '^image_digest=.*@sha256:' "$dir/match.txt" || return 1
  grep -q 'NOT_REPORTED' "$dir/match.txt" && return 1; image=$(awk -F= '$1=="image_id"{print substr($0,index($0,"=")+1)}' "$dir/match.txt")
  container=$(awk -F= '$1=="container_image"{print substr($0,index($0,"=")+1)}' "$dir/match.txt"); [[ -n "$image" && "$image" == "$container" ]] || return 1; centiseconds "$(field "$dir/real.txt")" >/dev/null
}
job_ok() {
  jq -e 'type=="array" and length==1 and .[0].id!=null and .[0].runner_id!=null and .[0].runner_name!=null' "$results/job.json" >/dev/null 2>&1
}
summarize() {
  local id verdict=NOT_MEASURED valid=1 lines baseline_median candidate_median ratio; lines=$(awk 'END { print NR+0 }' "$results/order.txt" 2>/dev/null || echo 0); [[ "$lines" -eq 6 && ! -f "$results/interrupted.txt" ]] || valid=0; job_ok || valid=0
  {
    printf '# Integration timing\n\nHarness %s\n\nRun %s\n\n' "$(field "$results/harness-sha.txt")" "$(field "$results/run-url.txt")"
    if job_ok; then jq -r '.[0] | "Job \(.id) runner \(.runner_id) \(.runner_name)\n"' "$results/job.json"; else printf 'Job NOT_REPORTED\n\n'; fi
    printf 'Image %s\n\n| Sample | Exit | Real | User | Sys | UTC start | UTC end |\n| --- | --- | --- | --- | --- | --- | --- |\n' "$(field "$results/image-digest.txt")"
    for id in B1 C1 B2 C2 B3 C3; do
      sample_valid "$id" || valid=0; printf '| %s | %s | %s | %s | %s | %s | %s |\n' "$id" "$(field "$results/$id/exit.txt")" "$(field "$results/$id/real.txt")" \
        "$(field "$results/$id/user.txt")" "$(field "$results/$id/sys.txt")" "$(field "$results/$id/utc-start.txt")" "$(field "$results/$id/utc-end.txt")"
    done
    if [[ "$valid" -eq 1 ]]; then for id in C1 B2 C2 B3 C3; do cmp -s "$results/B1/match.txt" "$results/$id/match.txt" || valid=0; done; fi
    if [[ "$valid" -eq 1 ]]; then
      baseline_median=$(median_of "$(field "$results/B1/real.txt")" "$(field "$results/B2/real.txt")" "$(field "$results/B3/real.txt")")
      candidate_median=$(median_of "$(field "$results/C1/real.txt")" "$(field "$results/C2/real.txt")" "$(field "$results/C3/real.txt")")
      ratio=$(awk -v baseline="$baseline_median" -v candidate="$candidate_median" 'BEGIN { printf "%.6f", candidate / baseline }')
      if timing_passes "$baseline_median" "$candidate_median"; then verdict=PASS; else verdict=FAIL; fi; printf '\nbaseline_median=%s\ncandidate_median=%s\nratio=%s\n' "$baseline_median" "$candidate_median" "$ratio"
    else
      verdict=NOT_MEASURED; printf '\nbaseline_median=NOT_MEASURED\ncandidate_median=NOT_MEASURED\nratio=NOT_MEASURED\n'
    fi; printf 'result=%s\n' "$verdict"
  } > "$results/summary.md"; printf '%s\n' "$verdict" > "$results/verdict.txt"; cat "$results/summary.md"
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then cat "$results/summary.md" >> "$GITHUB_STEP_SUMMARY"; fi; [[ "$verdict" == PASS ]]
}
write_run_meta() {
  git -C "$harness" rev-parse HEAD > "$results/harness-sha.txt"; printf '%s\n' "${GITHUB_REF:-NOT_REPORTED}" > "$results/workflow-ref.txt"
  printf '%s\n' "${GITHUB_RUN_ID:-NOT_REPORTED}" > "$results/run-id.txt"; printf '%s\n' "${GITHUB_RUN_ATTEMPT:-NOT_REPORTED}" > "$results/run-attempt.txt"
  printf '%s\n' "$BASELINE_SHA" > "$results/baseline-sha.txt"; printf '%s\n' "$CANDIDATE_SHA" > "$results/candidate-sha.txt"
  if [[ -n "${GITHUB_REPOSITORY:-}" && -n "${GITHUB_RUN_ID:-}" ]]; then
    printf '%s/%s/actions/runs/%s/attempts/%s\n' "${GITHUB_SERVER_URL:-https://github.com}" "$GITHUB_REPOSITORY" "$GITHUB_RUN_ID" "${GITHUB_RUN_ATTEMPT:-1}" > "$results/run-url.txt"
  else printf 'NOT_REPORTED\n' > "$results/run-url.txt"; fi
}
run_harness() {
  local id sha cmd; init_paths; trap on_exit EXIT; trap 'exit 130' INT; trap 'exit 143' TERM; export GIT_TERMINAL_PROMPT=0 COREPACK_ENABLE_DOWNLOAD_PROMPT=0
  run_key="${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-0}-$$"; origin=$(origin_url); : >"$inventory"; : >"$results/order.txt"; write_run_meta
  capture_job || true; [[ "$(node --version)" == v24.20.0 ]] || exit 1; resolve_image
  for id in B1 C1 B2 C2 B3 C3; do
    case $id in B*) sha=$BASELINE_SHA ;; C*) sha=$CANDIDATE_SHA ;; esac
    cmd=0; run_sample "$id" "$sha" || cmd=$?
    if [[ "$cmd" -ne 0 && "$first_status" -eq 0 ]]; then first_status=$cmd; fi
    if [[ -f "$results/$id/cleanup.txt" && "$(cat "$results/$id/cleanup.txt")" != ok ]]; then break; fi
  done; summarize || true
  if [[ "$first_status" -ne 0 ]]; then exit "$first_status"; fi; [[ "$(cat "$results/verdict.txt")" == PASS ]] || exit 1
}
main() {
  case "${1:-run}" in
    run) run_harness ;;
    cleanup-owned)
      init_paths reuse; status=0; cleanup_owned_inventory || status=$?
      if [[ ! -f "$results/summary.md" ]]; then summarize || true; fi; exit "$status"
      ;;
    *) printf 'usage: %s [run|cleanup-owned]\n' "$0" >&2; exit 2 ;;
  esac
}
if [[ "${BASH_SOURCE[0]:-}" == "$0" ]]; then main "$@"; fi

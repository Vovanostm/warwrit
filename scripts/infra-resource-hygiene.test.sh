#!/usr/bin/env bash
# Isolated regression: copied candidates and PATH stubs, never live cleanup.
set -euo pipefail
repo="$(git rev-parse --show-toplevel)"
fixture="$(mktemp -d "$repo/.orca/infra-resource-hygiene/fixtures.XXXXXX")"
python3 -I - "$repo" "$fixture" <<'PY'
import json, os, pathlib, shutil, signal, subprocess, sys, time
repo, root = map(pathlib.Path, sys.argv[1:])
(root / 'scripts').mkdir()
(root / 'bin').mkdir()
(root / 'common').mkdir()
for name in ('agent-cleanup.sh', 'codex-lean-mcp.sh', 'orca-codex-worker.sh', 'orca-pipeline-tick.sh'):
    shutil.copy(repo / 'scripts' / name, root / 'scripts' / name)
(root / '.worktree-ports').write_text('COMBAT_API_PORT=12345\nCOMBAT_WEB_PORT=12346\n')
(root / 'brief').write_text('stub task\n')

def script(path, text):
    path.write_text('#!/usr/bin/env bash\nset -eu\n' + text)
    path.chmod(0o755)

script(root / 'bin/git', '''case "$*" in
  'rev-parse --show-toplevel') echo "$FIXTURE" ;;
  'rev-parse --git-common-dir') echo "$FIXTURE/common" ;;
  'fetch -q origin'|'checkout -q --detach origin/main') : ;;
  *) echo "unexpected git: $*" >&2; exit 90 ;;
esac
''')
script(root / 'bin/playwright-cli', '''echo "browser $*" >> "$TRACE"
if [[ "$*" == list ]]; then
  if [[ "${BROWSER:-}" == fail ]]; then echo 'list unavailable' >&2; exit 7; fi
  if [[ "${BROWSER:-}" == open ]]; then printf -- '- warwrit-task:\\n  - status: open\\n'; fi
  printf -- '- warwrit-neighbour:\\n  - status: open\\n'
else
  if [[ "${BROWSER:-}" == fail ]]; then echo 'close unavailable' >&2; exit 8; fi
fi
''')
script(root / 'bin/lsof', '''echo 'lsof' >> "$TRACE"
case "${LAB:-}" in
  leftover) echo 98765 ;;
  inspect-fail) echo 'port inspection failed' >&2; exit 2 ;;
  inspect-fail-1) echo 'port inspection failed with exit 1' >&2; exit 1 ;;
  *) exit 1 ;;
esac
''')
script(root / 'scripts/orca-play.sh', '''echo "lab $*" >> "$TRACE"
[[ "${LAB:-}" != stop-fail ]]
''')
script(root / 'bin/npx', "echo 'unexpected npx' >&2; exit 90\n")
script(root / 'bin/codex', '''echo "codex $*" >> "$TRACE"
if [[ "$1" == mcp ]]; then
  case "${MCP:-}" in
    enum-fail) echo 'enumeration unavailable' >&2; exit 9 ;;
    decode-fail) echo broken; exit 0 ;;
    schema-fail) echo '{}'; exit 0 ;;
  esac
  echo '[{"name":"unused","enabled":true},{"name":"codebase-memory-mcp","enabled":true},{"name":"disabled","enabled":false}]'
elif [[ "$1" == -c ]]; then
  case "${MCP:-}" in
    probe-fail) echo 'probe unavailable' >&2; exit 10 ;;
    probe-decode-fail) echo broken; exit 0 ;;
    probe-enabled) echo '[{"name":"unused","enabled":true}]'; exit 0 ;;
    unsupported) echo 'missing field `command` in `mcp_servers.unused`' >&2; exit 11 ;;
  esac
  echo '[{"name":"unused","enabled":false}]'
elif [[ "$1" == exec ]]; then
  output=''
  while (($#)); do
    if [[ "$1" == -o ]]; then output="$2"; shift; fi
    shift
  done
  printf '%s\\n' '{"outcome":"succeeded","summary":"Source passed.","files_modified":["scripts/example.sh"],"report_path":"proof.md"}' > "$output"
  if [[ "${EXEC_MODE:-}" == block ]]; then
    trap 'echo child-stopped >> "$TRACE"; exit 0' TERM HUP INT
    echo $$ > "$FIXTURE/stub-child.pid"
    echo child-ready >> "$TRACE"
    while true; do sleep 0.05; done
  fi
  exit "${CODEX_EXIT:-0}"
else echo 'unexpected codex command' >&2; exit 90
fi
''')
script(root / 'bin/orca', '''echo "orca $*" >> "$TRACE"
case "$*" in
  'repo list --json') echo '{"result":{"repos":[{"id":"stub-repo","path":"/learn/warwrit"}]}}' ;;
  'orchestration check '*) echo '{"ok":true}' ;;
  'orchestration run-use '*) echo '{}' ;;
  'orchestration send '*) printf '%s\\0' "$@" > "$FIXTURE/message"; exit "${SEND_EXIT:-0}" ;;
  *) echo 'unexpected orca command' >&2; exit 90 ;;
esac
''')
for name in ('orca-checkpoint-compact.sh', 'orca-state-digest.sh'):
    script(root / 'scripts' / name, "echo fixture-state\n")
state = root / '.orca/pipeline'
state.mkdir(parents=True)
(state / 'coordinator.env').write_text('MAILBOX=stub-mailbox\nRUN=stub-run\n')
# Count finalizer calls around the real candidate cleanup in this fixture only.
shutil.move(root / 'scripts/agent-cleanup.sh', root / 'scripts/cleanup-candidate.sh')
script(root / 'scripts/agent-cleanup.sh', '''echo cleanup >> "$TRACE"
if [[ "${CLEANUP_BLOCK:-}" == 1 ]]; then
  echo cleanup-ready >> "$TRACE"
  while [[ ! -f "$FIXTURE/release-cleanup" ]]; do sleep 0.05; done
fi
exec bash "$FIXTURE/scripts/cleanup-candidate.sh" "$@"
''')
env = dict(os.environ, PATH=str(root / 'bin') + ':' + os.environ['PATH'],
           FIXTURE=str(root), TRACE=str(root / 'trace'))
for key in ('WARWRIT_LAB_OWNER', 'WARWRIT_AGENT_MCP', 'PLAYWRIGHT_CLI_SESSION'):
    env.pop(key, None)

def run(name, *args, **extra):
    return subprocess.run(['/bin/bash', str(root / 'scripts' / name), *args], cwd=root,
                          env=dict(env, **extra), text=True, capture_output=True, timeout=10)

def reset():
    (root / 'trace').write_text('')
    (root / 'message').unlink(missing_ok=True)
    (root / 'stub-child.pid').unlink(missing_ok=True)
    shutil.rmtree(root / '.orca/runs', ignore_errors=True)

def snapshot(label):
    dest = root / 'evidence' / label
    dest.mkdir(parents=True)
    for name in ('trace', 'message', '.orca/runs', '.orca/pipeline/ticks'):
        src = root / name
        if src.is_dir(): shutil.copytree(src, dest / src.name)
        elif src.exists(): shutil.copy(src, dest / src.name)

def trace(): return (root / 'trace').read_text()
def message():
    args = (root / 'message').read_text().split('\0')
    return args[args.index('--outcome') + 1], args[args.index('--body') + 1]
def check(ok, detail):
    assert ok, detail
    print('PASS', detail, flush=True)

reset()
r = run('agent-cleanup.sh', 'warwrit-reader')
check(r.returncode == 0 and 'lab stop' not in trace() and 'lsof' not in trace()
      and 'browser -s=warwrit-reader close' in trace(), 'reader closes only its browser in a shared worktree')
reset()
r = run('agent-cleanup.sh', 'warwrit-reader', WARWRIT_LAB_OWNER='warwrit-neighbour')
check(r.returncode == 0 and 'lab stop' not in trace(), 'another task grant cannot stop neighbour lab')
reset()
r = run('agent-cleanup.sh', 'warwrit-task', WARWRIT_LAB_OWNER='warwrit-task')
check(r.returncode == 0 and trace().count('lab stop') == 1 and 'lsof' in trace()
      and 'CLEAN' in r.stdout and not r.stderr,
      'explicit owner stops its lab once; empty no-match exit 1 certifies CLEAN')
for mode, expected in [('fail', 'UNVERIFIED'), ('open', 'LEFTOVER')]:
    reset()
    r = run('agent-cleanup.sh', 'warwrit-task', BROWSER=mode)
    check(r.returncode != 0 and 'CLEAN' not in r.stdout and expected in r.stdout + r.stderr,
          f'browser {mode} cannot certify CLEAN')
    if mode == 'fail':
        check('list unavailable' in r.stderr and 'close unavailable' in r.stderr,
              'close and listing diagnostics survive')
for mode in ('leftover', 'inspect-fail', 'inspect-fail-1', 'stop-fail'):
    reset()
    r = run('agent-cleanup.sh', 'warwrit-task', WARWRIT_LAB_OWNER='warwrit-task', LAB=mode)
    check(r.returncode != 0 and 'CLEAN' not in r.stdout, f'lab {mode} stays failed')
    if mode.startswith('inspect-fail'):
        check('port inspection failed' in r.stderr and 'UNVERIFIED lab port inspection' in r.stderr,
              f'lab {mode} preserves inspection diagnostics')

for mode, diagnostic in [('enum-fail', 'discovery failed'), ('decode-fail', 'decoder failed'),
                         ('schema-fail', 'decoder failed'), ('probe-fail', 'probe failed'),
                         ('unsupported', 'unsupported override'),
                         ('probe-decode-fail', 'probe decoder/disable verification failed'),
                         ('probe-enabled', 'probe decoder/disable verification failed')]:
    reset()
    r = run('codex-lean-mcp.sh', MCP=mode)
    check(r.returncode != 0 and diagnostic in r.stderr, f'MCP {mode} fails closed with diagnostics')
    for caller, args in [('orca-codex-worker.sh', ('task', 'dispatch', 'handle', str(root / 'brief'))),
                         ('orca-pipeline-tick.sh', (str(root),))]:
        reset()
        r = run(caller, *args, MCP=mode)
        check(r.returncode != 0 and not any(line.startswith('codex exec ') for line in trace().splitlines()), f'{caller} refuses exec after {mode}')
        if caller == 'orca-codex-worker.sh':
            outcome, body = message()
            check(outcome == 'failed' and '/mcp.log' in body and trace().count('\ncleanup\n') == 1,
                  'MCP startup failure reports failed worker and finalizes once')
        else:
            check(not (state / 'tick.lock').exists(), 'failed tick releases only fixture lease')
        snapshot(caller + '-' + mode)

reset()
r = run('codex-lean-mcp.sh')
check(r.returncode == 0 and r.stdout.splitlines() == ['-c', 'mcp_servers.unused.enabled=false']
      and 'intentionally kept enabled: codebase-memory-mcp' in r.stderr, 'lean arguments and intentional keep remain explicit')
for options, expected, label in [({}, 'succeeded', 'normal worker success'),
                                ({'BROWSER':'open'}, 'failed', 'cleanup failure'),
                                ({'CODEX_EXIT':'12'}, 'failed', 'Codex failure'),
                                ({'SEND_EXIT':'13'}, 'succeeded', 'dispatch transport failure')]:
    reset()
    r = run('orca-codex-worker.sh', 'task', 'dispatch', 'handle', str(root / 'brief'), **options)
    outcome, body = message()
    check(outcome == expected and trace().count('\ncleanup\n') == 1
          and (r.returncode == 0) == (not options), label + ' preserves completion/exit status')
    if 'BROWSER' in options:
        check('Source verdict: succeeded' in body and 'cleanup failed' in body and '/cleanup.log' in body,
              'source verdict survives separately from cleanup failure')
    snapshot(label.replace(' ', '-'))

for mode, expected in [('', 'succeeded'), ('inspect-fail-1', 'failed')]:
    reset()
    r = run('orca-codex-worker.sh', 'task', 'dispatch', 'handle', str(root / 'brief'),
            WARWRIT_LAB_OWNER='warwrit-task', LAB=mode)
    outcome, body = message()
    cleanup_log = (root / '.orca/runs/task/cleanup.log').read_text()
    source = json.loads((root / '.orca/runs/task/result.json').read_text())
    check(outcome == expected and (r.returncode == 0) == (expected == 'succeeded')
          and trace().count('\ncleanup\n') == 1 and source['outcome'] == 'succeeded',
          f'lab exit 1 {mode or "no-match"} settles {expected} and retains source verdict')
    if mode:
        check('Source verdict: succeeded' in body and 'cleanup failed' in body and '/cleanup.log' in body
              and 'CLEAN' not in cleanup_log and 'port inspection failed with exit 1' in cleanup_log
              and 'UNVERIFIED lab port inspection failed (exit 1)' in cleanup_log,
              'lab exit 1 diagnostics survive in failed worker cleanup log')
    else:
        check('CLEAN' in cleanup_log, 'ordinary lab no-match remains successful through worker settlement')
    snapshot('lab-' + (mode or 'no-match'))

def await_trace(text):
    deadline = time.monotonic() + 5
    while text not in trace():
        if time.monotonic() > deadline: raise AssertionError('timeout: ' + text)
        time.sleep(0.02)

for sig in (signal.SIGTERM, signal.SIGHUP, signal.SIGINT):
    reset()
    with (root / f'signal-{sig.name}.log').open('w') as log:
        p = subprocess.Popen(['/bin/bash', str(root / 'scripts/orca-codex-worker.sh'),
                              'task', 'dispatch', 'handle', str(root / 'brief')], cwd=root,
                             env=dict(env, EXEC_MODE='block'), stdout=log, stderr=log)
        try:
            await_trace('child-ready')
            p.send_signal(sig)
            p.wait(timeout=5)
        finally:
            if p.poll() is None:
                # Only this fixture stub PID, never a discovered/live worker.
                stub_pid = int((root / 'stub-child.pid').read_text())
                os.kill(stub_pid, signal.SIGTERM)
                try: p.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    p.kill()
                    p.wait()
    outcome, body = message()
    check(p.returncode == 128 + sig and outcome == 'failed' and 'interrupted' in body
          and trace().count('\ncleanup\n') == 1 and trace().index('child-stopped') < trace().index('\ncleanup\n'),
          f'{sig.name} forwards to child, waits, finalizes once, reports failure')
    try: os.kill(int((root / 'stub-child.pid').read_text()), 0)
    except ProcessLookupError: pass
    else: raise AssertionError('stub child survived wrapper settlement')
    snapshot(sig.name)

reset()
with (root / 'signal-cleanup.log').open('w') as log:
    p = subprocess.Popen(['/bin/bash', str(root / 'scripts/orca-codex-worker.sh'),
                          'task', 'dispatch', 'handle', str(root / 'brief')], cwd=root,
                         env=dict(env, CLEANUP_BLOCK='1'), stdout=log, stderr=log)
    try:
        await_trace('cleanup-ready')
        p.send_signal(signal.SIGTERM)
        time.sleep(0.1)
        check(p.poll() is None and not (root / 'message').exists(), 'signal during cleanup waits before settlement')
        (root / 'release-cleanup').touch()
        p.wait(timeout=5)
    finally:
        if p.poll() is None:
            (root / 'release-cleanup').touch()
            p.kill()
            p.wait()
outcome, body = message()
check(p.returncode == 143 and outcome == 'failed' and trace().count('\ncleanup\n') == 1,
      'signal during finalization cannot settle success or repeat cleanup')
snapshot('signal-during-cleanup')
reset()
r = run('orca-pipeline-tick.sh', str(root))
check(r.returncode == 0 and any(line.startswith('codex exec ') for line in trace().splitlines()) and 'mcp_servers.unused.enabled=false' in trace(),
      'tick success passes lean arguments to fixture Codex')
print('Fixture retained:', root)
PY

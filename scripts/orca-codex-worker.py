"""One lifecycle owner; settlement commits after cleanup and complete decoding."""
import contextlib, json, os, pathlib, signal, subprocess, sys

task, dispatch, handle, brief = sys.argv[1:]
root = pathlib.Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip())
common = pathlib.Path(subprocess.check_output(['git', 'rev-parse', '--git-common-dir'], text=True).strip()).resolve()
out = root / '.orca/runs' / task
out.mkdir(parents=True, exist_ok=True)
os.environ['PLAYWRIGHT_CLI_SESSION'] = session = 'warwrit-' + task
signals = {signal.SIGTERM, signal.SIGHUP, signal.SIGINT}
child = None
phase, cancelled, late_signal = 'running', 0, 0


def on_signal(number, frame):
    global cancelled, late_signal
    if phase == 'finished':
        print(f'Signal after transport (exit {128 + number}); settlement immutable; no retry.', file=sys.stderr)
        if send_code or late_signal:
            print(f'UNVERIFIED delivery; see {out}/worker-done.json', file=sys.stderr)
        raise SystemExit(cancelled or late_signal or 128 + number)
    if phase == 'transport':
        late_signal = late_signal or 128 + number
    else:
        cancelled = cancelled or 128 + number
    if phase == 'running' and child is not None:
        child.send_signal(number)


for sig in signals:
    signal.signal(sig, on_signal)


def run_owned(args, stdout, stderr=None, stdin=None):
    global child
    try:
        with open(stdout, 'w') as output, (open(stderr, 'w') if stderr else contextlib.nullcontext(output)) as errors:
            child = subprocess.Popen(args, stdin=stdin, stdout=output, stderr=errors, start_new_session=True)
            # Cancellation during spawn must also reach the newly owned child.
            if cancelled and phase == 'running':
                child.send_signal(cancelled - 128)
            return child.wait()
    except OSError as error:
        print(f'Cannot run {args[0]}: {error}', file=sys.stderr)
        return 127
    finally:
        child = None


code, startup, failures = 1, False, []
try:
    code = run_owned(['bash', str(root / 'scripts/codex-lean-mcp.sh')], out / 'mcp.args', out / 'mcp.log')
    startup = code != 0
    if not startup and not cancelled:
        lean = (out / 'mcp.args').read_text().splitlines()
        with open(brief) as prompt:
            code = run_owned(['codex', 'exec', '--approve-for-me', '-C', str(root), *lean,
                              '--add-dir', str(common), '--add-dir', str(pathlib.Path.home() / 'Library/pnpm'),
                              '--add-dir', str(pathlib.Path.home() / 'Library/Caches/ms-playwright'),
                              '--output-schema', str(root / '.agents/skills/warwrit-orca/worker-result.schema.json'),
                              '-o', str(out / 'result.json'), '--json', '-'],
                             out / 'events.jsonl', out / 'stderr.log', prompt)
except OSError as error:
    failures.append(f'Worker startup failed: {error}')
finally:
    phase = 'finalizing'
    cleanup = run_owned(['bash', str(root / 'scripts/agent-cleanup.sh'), session], out / 'cleanup.log')

source, summary, files, report = 'unavailable', '', '', ''
try:
    with open(out / 'result.json') as result:
        data = json.load(result)
    source, summary = data['outcome'], data['summary']
    paths, report = data['files_modified'], data['report_path']
    if source not in ('succeeded', 'failed') or not isinstance(paths, list):
        raise ValueError('invalid outcome or files_modified')
    if any(not isinstance(value, str) or '\0' in value for value in [summary, report, *paths]):
        raise ValueError('invalid summary, report_path or file name')
    files = ','.join(paths)
    report = str(root / report) if report else ''
except (OSError, ValueError, KeyError, TypeError) as error:
    failures.append(f'No valid source result ({error})')
    summary, files, report = '', '', ''
if startup:
    failures.append(f'MCP setup failed; see {out}/mcp.log')
if cleanup:
    failures.append(f'cleanup failed (exit {cleanup}); see {out}/cleanup.log')
args = ['orca', 'orchestration', 'send', '--from', handle, '--type', 'worker_done',
        '--task-id', task, '--dispatch-id', dispatch]
if files:
    args += ['--files-modified', files]
if report:
    args += ['--report-path', report]

# Commit boundary: after all decoding, mask handlers and sample queued signals.
# Already accepted or pending cancellation wins. Signals queued after this
# sample are post-commit transport interruptions, never a reason to resend.
previous_mask = signal.pthread_sigmask(signal.SIG_BLOCK, signals)
pending = signal.sigpending() & signals
cancelled = cancelled or (128 + min(pending) if pending else 0)
for sig in pending:
    signal.sigwait({sig})  # Already included in cancellation, not a transport signal.
if cancelled:
    failures.append(f'interrupted (exit {cancelled})')
outcome = 'succeeded' if source == 'succeeded' and code == 0 and not failures else 'failed'
body = f'Source verdict: {source}; Codex exit {code}. {summary}'
if failures:
    body += ' Infrastructure: ' + '; '.join(failures)
settlement_exit = cancelled or int(outcome != 'succeeded')
args += ['--subject', f'codex exec {outcome}', '--body', body, '--outcome', outcome, '--json']
phase = 'transport'
signal.pthread_sigmask(signal.SIG_SETMASK, previous_mask)
send_code = run_owned(args, out / 'worker-done.json')
phase = 'finished'
if send_code or late_signal:
    print(f'UNVERIFIED delivery (transport exit {send_code}, signal exit {late_signal}); '
          f'settlement may have arrived; no retry. See {out}/worker-done.json', file=sys.stderr)
print(f'worker {task}: {outcome} (codex exit {code}); logs in {out}')
sys.exit(cancelled or late_signal or (1 if send_code else settlement_exit))

# #297 / PR #298 — rework 1

Дата: 2026-10-23. Локальная ветка: `Vovanostm/infra-297-resource-review`.
Исходный head: `57541c35cb7e6b870f15af4d6fca394b7f7c972a`.
Удалённая PR-ветка: `claude/agent-resource-hygiene`; push/merge не выполнялись.
Исходное рабочее дерево было чистым. Изменены только четыре разрешённых скрипта,
один shell regression и этот отчёт; launcher текущей задачи не менялся.

## Исправления и доказательства по AC

- AC1 / finding 1: `agent-cleanup.sh` останавливает lab только при непустой session
  и точном совпадении `WARWRIT_LAB_OWNER=<session>`. Это явный grant текущей задаче,
  который координатор передаёт только владельцу runtime; наличие портов само по
  себе grant не даёт. Без grant cleanup закрывает только именованный browser.
  Regression: reader и другая task ownership в общей fixture не вызывают lab stop;
  владелец вызывает его ровно один раз.
- AC1 / finding 2: stdout browser listing и status разделены; close/list ошибки
  сохраняют diagnostics, возвращают failure и не печатают CLEAN. LEFTOVER browser,
  lab stop failure, port inspection failure и оставшийся listener также дают failure.
- AC1 / finding 3: `worker_done` получает failed при неуспешной cleanup и путь
  `cleanup.log`; source verdict и Codex exit сохранены отдельно в body, исходный
  `result.json` не переписывается. Regression: source succeeded + cleanup failure
  даёт failed, тогда как исходный verdict остаётся succeeded. Ошибки Codex и
  dispatch transport также сохраняют ненулевой exit wrapper.
- AC2 / finding 4: ошибки enumeration, JSON/schema decoder, override probe и
  проверки фактического disable закрывают запуск. Оба callers проверяют status
  helper перед exec. Unsupported override явно диагностируется и блокирует запуск,
  а не превращается в неявное разрешение оставить server enabled. Явный keep через
  `WARWRIT_AGENT_MCP` диагностируется отдельно. Probe обязан вернуть JSON с этим
  server disabled; generic probe failure не считается unsupported. Global config
  не менялся. Проверены все семь failure modes на helper и обоих callers, а также
  положительные lean arguments и tick. Plugin-error signature проверена stub,
  реальные plugin/config варианты в этом проходе NOT_RUN.
- AC1 / finding 5: один идемпотентный EXIT finalizer используется для normal,
  TERM/HUP/INT; handler передаёт signal точному owned child PID, wrapper ждёт child,
  затем cleanup. Background jobs получают обычные signal dispositions через Bash
  monitor mode: INT больше не наследуется как ignored. Во время finalizer signal
  помечает interrupted, но не обрывает cleanup; settlement ждёт её и становится
  failed. Regression: все три сигнала, child exit до cleanup, child PID отсутствует
  после settlement, cleanup ровно один раз; отдельно TERM во время cleanup.
- AC3: существующие instructions/docs оставлены read-only по allocation. Ниже
  перечислены необходимые coordinator-owned consistency corrections; AC3 в полном
  виде пока не закрыт этим worker.

## Проверки и локальные артефакты

- PASS: `bash -n` четырёх скриптов и `scripts/infra-resource-hygiene.test.sh`.
- PASS: `bash scripts/infra-resource-hygiene.test.sh`, 56 assertions;
  `.orca/infra-resource-hygiene/regression-final.log`.
- PASS: обычные working/staged `git diff --check`; после source commit
  `bash scripts/check-pr-scope.sh origin/main .orca/infra-resource-hygiene/pr-body.md`:
  203 / 300 source lines без tests, closes 1 issue, refs 0; `scope.log`.
- Первый `pnpm check:changes`: FAIL exit 2, отсутствовал
  `coverage/coverage-final.json`; `.orca/infra-resource-hygiene/check-changes.log`.
  Затем normal commit hook обновил coverage своим штатным
  `vitest related --run --coverage --mode coverage --passWithNoTests package.json`
  и выполнил `pnpm --silent check:changes`: PASS exit 0, no new findings.
  Вывод focused coverage hook подавляет; число его tests NOT_MEASURED, отдельный
  game-suite pass не заявляется. Audit сохранил warnings об entry points и
  syntactic attribution вместо сопоставления semantic identities base/head;
  `.orca/infra-resource-hygiene/commit-source.log`. Hooks не ослаблялись.
- Зависимости для audit установлены offline из pinned lockfile без lifecycle
  scripts: `pnpm install --offline --frozen-lockfile --ignore-scripts`, exit 0;
  `.orca/infra-resource-hygiene/install.log`. Tracked dependency files не менялись.
- Ранние regression попытки сохранены: `regression-1.log` — ошибочный test matcher
  спутал dispatch subject с exec; `regression-2.log` — SIGINT timeout обнаружил
  ignored INT у background Bash child; `regression-3.log` — PASS до добавления
  retained per-case artifacts. Итоговый файл выше проверяет финальный source.

Fixture: `.orca/infra-resource-hygiene/fixtures.a92p2F/`.
Копии кандидатов, PATH stubs и искусственные порты находятся только внутри неё.
Per-case evidence: `evidence/<case>/trace`, `message`, `runs/task/cleanup.log`,
`runs/task/mcp.log`, `runs/task/worker-done.json`; tick logs — `evidence/<case>/ticks/`.
Например: `evidence/cleanup-failure/runs/task/cleanup.log`,
`evidence/SIGTERM/`, `evidence/signal-during-cleanup/`.
Предыдущие fixture directories сохранены рядом для диагностики.
Реальные browser/lab/Codex/Orca команды не выполнялись; эти имена в regression
всегда указывают на fixture stubs. Все запущенные fixture wrappers/children
завершены; browser/MCP/DB/dev stand не открывались и не требуют cleanup.

NOT_RUN: generic build brief smoke-play, setup (он включает запрещённый build),
coordinator validate, реальные browser/MCP/lab/full Orca wave, DB, отдельные game/full suites,
CI, independent exact-head review. Реальная экономия ресурсов — NOT_MEASURED.
Авторские stubs подтверждают только указанные control-flow cases, не source
acceptance или runtime acceptance.

## Коммиты

- `d59953503e573b4fa50bd229cb8103df33b6adb6` — `fix(agents): preserve resource ownership and cleanup failures`;
  пять owned source/test paths, normal commit hook PASS. Коммит содержит только
  rework этой задачи; существующие instructions/docs сохранены.
- Этот отчёт добавляется следующим normal docs-only commit
  `docs: record resource hygiene rework proof` (его revision — local HEAD).

Статус: LOCAL, NOT_PUSHED, NOT_MERGED. Branch не переключалась; origin/main
не merge-ился: для ограниченных shell fixes интеграционного конфликта нет,
merge-base для scope остаётся `7444199da585820079ed4923a0133a05d9c6552c`.
Remote PR head остаётся исходным до действия координатора.

## Предлагаемые записи координатору (не внесены)

CHANGELOG Unreleased, 2026-10-23, branch `Vovanostm/infra-297-resource-review`,
статус LOCAL: #297 / PR #298 rework устраняет пять review findings в четырёх
скриптах: explicit task lab ownership, failure-preserving inspection/settlement,
fail-closed MCP setup обоих callers, signal-aware finalizer. 56 isolated shell
assertions PASS; normal commit audit PASS, source scope 203 / 300. Final review,
validate/CI и реальные runtime/resource measurements остаются незавершёнными.

CURRENT_PLAN: локальный source head из раздела commits, no push; перед публикацией
координатор должен принять этот head, применить consistency corrections и провести
fresh Tier D review + validate + final CI/PR scope. Никакие чужие gates не менялись.

Consistency corrections к существующим PR docs/instructions/body:
1. Уточнить AGENTS cleanup examples, common/evaluate briefs, LOCAL_DEVELOPMENT,
   README и AGENT_TEAM: только runtime owner получает
   `WARWRIT_LAB_OWNER=warwrit-<task>` на invocation wrapper либо cleanup; diff-only
   worker grant не получает. Именованная browser cleanup остаётся автоматической.
   Существующий текст «this worktree's lab» не должен обещать безусловную остановку.
2. Уточнить описание lean helper: unsupported/probe/decoder/discovery failures
   блокируют exec; plugin-provided server не skip молча. Явный keep логируется.
3. Уточнить worker failure описание: source verdict отдельно от infrastructure
   failure с cleanup/mcp log; normal и interrupted completion проходят finalizer.
   Исторические resource measurements сохранить как прежние авторские claims.

Изменения shared records и этих docs здесь запрещены; это handoff координатору,
а не заявление о завершённой независимой приёмке #297.

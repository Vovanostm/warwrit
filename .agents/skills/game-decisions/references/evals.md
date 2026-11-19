# Evaluation cases

One script-backed skill and a local HTTP/file service support the owner and
other AI agents. The agent interviews, generates images in parallel and creates
and reviews specifications. The service retains facts, choices and reports.

The skill contains SKILL.md, agents/openai.yaml, scripts/decisions.py,
scripts/specification.py, scripts/test_decisions.py, the three UI assets,
board-format.md, agent-api.md and this guide. Automatic discovery remains enabled.

## Activation cases

| Prompt                                               | Expected outcome                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Помоги выбрать интерфейс таверны                     | Clarify missing purpose/actions/context, save the interview, then ten distinct concepts |
| Создай 10 концептов параллельно                      | Dispatch ten bounded workers before waiting, record actual execution                    |
| Давай сначала уточним требования                     | Save a versioned interview with answers and unresolved questions                        |
| Из второго ракурс, из пятого материалы, сделай ещё 3 | Exact submitted feedback and three parallel refined outputs                             |
| Нравятся второй и пятый, ещё думаю                   | Preserve likes while waiting for submitted refinement                                   |
| Выбираю этот вариант как решение                     | Accept the concept, then write the specification and a new working prompt               |
| Составь промпт по принятому варианту и перепроверь   | Inspect source facts/image, save artifact, review exact revision, fix failures          |
| Покажи промпты всех концептов таверны                | Original recipes remain visible per card and in history/export                          |
| Экспортируй решения для другой нейросети             | Complete JSON, readable Markdown and ZIP with relative local media                      |
| Покажи, кто и как проверил рабочий промпт            | Actual author/reviewer identity when known, checks and evidence                         |
| Я изменил рабочий промпт после проверки              | New revision awaits its own review                                                      |
| Продолжай с того места, где остановились             | Read work, requests, briefs and saved round JSON, resume missing outputs                |
| Отзови принятый вариант после правки карточки        | Exact approval withdrawal with retained history                                         |
| Сохрани оба уточнения одного раунда                  | Every refinement request stays visible with child status                                |
| Открой сразу третий раунд таверны                    | Direct round URL survives reload and browser navigation                                 |
| Нарисуй один меч                                     | Ordinary asset production                                                               |
| Исправь формулу урона                                | Bounded code task                                                                       |
| Сделай карточку товара магазина                      | Generic commerce UI                                                                     |

## Outcome checks

- A selected set can start refinement with an empty optional comment. The agent
  then inspects liked images and labels its inferred synthesis as a proposal.
- The interview contains the actual user request/questions/answers and separates
  accepted constraints, variable traits and unresolved facts.
- A batch contains distinct real concept images. Actual prompt, supported inputs,
  supplied references and output exist for every card. Inspect real dispatch
  evidence to evaluate parallel execution. Identify fixture-only verification.
- Refinement uses the submitted source/revision, selected cards and exact traits.
  A completed child matches its saved count and retains source lineage.
- The owner accepts a concept. The agent subsequently creates its specification
  and working prompt. Its original generation prompt remains exact provenance.
- A review states actual criteria, pass/fail observations and remaining issues.
  Empty checks fail validation. Failed checks or issues yield needs_changes.
  New drafts await review, and stale reports cannot verify a newer revision.
- Revocation or a newer final selection prevents fresh writes to an old approval.
  Exact retries preserve later state. Old interviews, drafts and reports persist.
- Exported ZIP includes the Markdown specification, complete project JSON,
  per-component decisions, original recipes and resolvable relative media.
  Prompt text remains literal, including whitespace and nested backticks.

## Process and style checks

Keep the parent as the writer of board/service records. Each worker owns one
image/result path and preserves other writers' changes. Follow the repository's
model rules. Save the round JSON before generation and resume successful outputs.
Wait for submitted refinement and continue through the post-selection review.

Use concise Russian owner-facing text. Show briefs, source prompts, new working
prompts, review state and evidence in the browser. Use direct links to the actual
round. Keep protocol verification isolated from actual owner choices.

## Limits and evaluation

The service stores AI-authored reviews. Inspect real outputs to evaluate visual
quality, faithfulness to chosen traits and playable behavior. The HTTP/browser
suite verifies storage, revision binding and export mechanics. An actual image
batch is needed to evaluate generation quality and observed concurrency.

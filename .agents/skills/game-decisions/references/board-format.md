# Board and generation format

`import-board` accepts `{ "project": "Warwrit", "questions": [...] }` and
upserts its questions. IDs use lowercase letters, digits, hyphens or underscores
and start with a letter/digit. Use a new question ID for every generated round.

## Component and round

The following is a single-card schema example. An exploration batch normally
contains ten distinct generated cards, and a refined batch uses the owner's
saved count, normally three.

```json
{
  "project": "Warwrit",
  "questions": [
    {
      "id": "combat-field-r1",
      "topic": "Боёвка — поле боя",
      "title": "Какие решения поля боя развиваем?",
      "context": "Сравниваем композицию и обработку материалов в одной сцене.",
      "mode": "multiple",
      "study": {
        "componentId": "combat-field",
        "phase": "explore",
        "brief": {
          "goal": "Читаемое поле боя в фактическом масштабе игры",
          "fixed": ["Принятая камера", "Сдержанный графический роман"],
          "vary": ["Крупность теневых масс", "Степень детализации грунта"],
          "output": "Отдельный кадр 16:9, одинаковая сцена и масштаб",
          "sources": ["docs/wiki/battlefield-test-maps.md"]
        }
      },
      "cards": [
        {
          "id": "broad-shadows",
          "title": "Крупные тени и спокойный грунт",
          "summary": "Силуэты читаются на плоских цветовых массах.",
          "consequence": "В следующем раунде наследуем выбранные черты по уточнению владельца.",
          "image": "assets/concepts/combat-field/r1/broad-shadows.png",
          "source": "Новый концепт, полный промпт и входные референсы сохранены",
          "generation": {
            "generator": "image_gen",
            "prompt": "The complete exact prompt actually submitted for this image.",
            "parameters": { "transparent_background": false },
            "references": ["assets/art/styles/references/approved-frame.png"]
          }
        }
      ]
    }
  ]
}
```

Every study card needs an image and a `generation` object with a nonempty
`generator` and exact `prompt`. `parameters` is an object of actual supported
generator inputs. `references` is a list of project-local raster paths.
Keep complete prompts independently usable. Preserve the exact tool input when
its wording differs from an earlier draft. The generation JSON records the
inputs used. Available generator behavior determines reproducibility.

The brief requires `goal`, `fixed` and `vary`. Additional fields such as output,
scene, sources, inherited traits and provenance are retained. These fields let
the agent define the part precisely and compare equivalent concepts.

Phases are `explore` and `refine` with multiple selection, and `final` with
single selection. Refine/final rounds require `study.parentFeedbackId`, the ID
returned by a saved feedback request from the same component. Their card count
must equal that request's `nextCount`. Original source definitions, selected
cards and exact notes remain in the feedback event. A source-round edit or later
like changes preserve that already submitted refinement brief.

## Saved feedback and lineage

The agent prepares each round JSON before generation with full prompts,
supported parameters, input references and planned output paths. That file
supports resuming an interrupted batch. Import it after its images are ready.
In a refined brief, `inheritedTraits` maps retained traits to source card IDs
and records requested changes for the agent to incorporate in each prompt.
Prompt and note strings retain their exact whitespace on import/save.

`POST /api/feedback` accepts the exact source selection shown by the browser.
Its notes field is optional. The owner can submit the liked set directly with
**Уточнить выбранное**. The agent inspects the images and records its proposed
synthesis when the owner supplies no additional comment.

```json
{
  "boardId": "uuid-returned-by-board",
  "questionId": "combat-field-r1",
  "revision": 1,
  "requestId": "unique-request-uuid",
  "selected": ["broad-shadows", "another-liked-card"],
  "notes": "Из первого берём тени, из второго — материалы. Убираем мелкий шум.",
  "nextCount": 3
}
```

The response's `eventId` becomes the child round's `parentFeedbackId`. The event
captures the whole source round/revision, selected IDs and notes. The agent
reads it with `export`/`history` and generates the requested child concepts.
The `export` feedback includes `selectedImages` as local absolute paths to the
chosen outputs, ready to use as image inputs for the next generation.
The UI keeps an unfinished comment draft in local browser storage.
After browser storage is cleared, saved notes and the requested count are
restored from the current server revision.

`GET /api/requests` and the `requests` CLI command expose every saved refinement
request. Each includes its original source round and selection, notes, count,
local `selectedImages`, `status` and `children`. A request starts as `pending`.
Importing its child round marks it `completed`, with child question ID,
revision, phase and title. Final approval follows in the chosen child's round.
The `feedback` map in the existing export retains the latest request per source
question. The `requests` list includes all requests. The UI displays those
requests under their source round and links to the delivered child rounds.

## HTTP and CLI

- `GET /api/board` returns definitions, active votes, history, feedback and masters.
- `GET /api/project` returns the full board, interviews, document versions and history.
- `GET /api/decisions` exports selected cards, round metadata, feedback and masters.
- `GET /api/masters` exports approved main recipes with local absolute media paths.
- `GET /api/requests` exports all refinement requests and delivered children.
- `POST /api/vote` saves a like or unlike.
- `POST /api/feedback` captures a refinement request.
- `POST /api/revoke` withdraws the exact approved main recipe.

```json
{
  "boardId": "uuid-returned-by-board",
  "questionId": "combat-field-r1",
  "cardId": "broad-shadows",
  "revision": 1,
  "liked": true,
  "requestId": "unique-request-uuid"
}
```

`export`, `history`, `masters` and `requests` are corresponding read-only CLI commands.
Global arguments such as `--project-root` and `--state-dir` precede the command.

A final-round like accepts one concept for its `componentId`. Further single
selections replace it. Unliking its current final selection withdraws it.
Its exact original image recipe remains provenance. After selection, the agent
writes a specification and a new working prompt, then reviews that revision.
Every component has its own accepted concept and post-selection document.
The `masters` export includes its source question, revision, brief, parent
feedback, image, original generation JSON and current document/review status.
The [agent API](agent-api.md) describes interview, artifact and review writes,
parallel execution, work/watch and portable specification exports.
It also includes `approvalId`. The UI can revoke that approval after the source
round is edited, using its exact approval ID.

```json
{
  "boardId": "uuid-returned-by-board",
  "componentId": "combat-field",
  "approvalId": "id-returned-in-the-master-recipe",
  "requestId": "unique-request-uuid"
}
```

A changed current approval returns HTTP 409. Exact revoke retries keep their
original receipt and preserve any later approval. Vote requests that leave the
selection unchanged return `changed: false`, `eventId: null` and a durable
receipt. They preserve the existing history and current main recipes.

POSTs require JSON and a local Origin/Host. HTTP 409 identifies a different
board, stale content/selection, or conflicting request-ID reuse. Exact retries
return the original receipt. The browser retains uncertain requests for retry
across reload. File locks and atomic replacement serialize writes.

## Persistence and compatibility

PNG/JPEG/WebP/GIF sources resolve inside the project. The importer copies output
images and input references into immutable hashed local media paths. Content
changes create a new question revision and clear that question's active likes.
History and approved main recipes retain their exact earlier snapshots.

Keep board definitions under the project, for example `.studioigor/boards/`.
The service accepts direct links `/#round=<question-id>` and
`/#brief=<component-id>`. Open the generated round's link for the owner.
Navigation survives reload and browser history.
Runtime decisions, receipts, history and copied media stay under the selected
state directory. Preserve it to resume. Existing questions without `study` or
`generation` remain usable with their original single/multiple vote behavior.

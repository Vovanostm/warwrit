# Agent language and context: research rationale

Date: 2026-09-08. Scope: the owner-requested language/context addition to
[AGENTS.md](../../AGENTS.md), not a new game specification or work package.
AGENTS owns the operating rule; this document explains its evidence and limits.
Load it when reviewing that rule, not as mandatory context for every coding task.

## Decision and limits

Use concise English by default for newly authored or revised developer-facing
instructions, while retaining Russian owner-facing communication and required
source/content languages. This is a reversible project convention, informed by
tokenization evidence and the repository's existing English technical vocabulary;
it is not an experimentally established optimum for Warwrit's agents.

Three questions must not be conflated: how many tokens a text uses, how faithfully
it expresses the requirements, and how correctly an agent executes them. Lower
input-token count alone proves neither improved coding nor lower total task cost.
A fixed Cyrillic surcharge, guaranteed English superiority and automatic rewriting
of the approved Russian source corpus are not supported by the evidence below.

## Primary research

### Tokenization disparity: Petrov et al., NeurIPS 2023

[Language Model Tokenizers Introduce Unfairness Between Languages](https://proceedings.neurips.cc/paper_files/paper/2023/hash/74bb24dca8334adce292883b4b651eda-Abstract-Conference.html)
reports substantially different token lengths for equivalent translated content,
including with multilingual tokenizers. Extreme differences reach 15 times in
some comparisons. That maximum is not a Russian/English multiplier, a measurement
of the current backend or a reason to discard source-language meaning.

### Cost and utility: Ahia et al., EMNLP 2023

[Do All Languages Cost the Same? Tokenization in the Era of Commercial Language Models](https://aclanthology.org/2023.emnlp-main.614/)
analyzes 22 typologically diverse languages and links model/training-dependent
tokenization to disparities in API cost and utility. These are historical models,
benchmarks and pricing conditions, not today's usage or a Warwrit prompt estimate.

### Translation is not universally best: Liu et al., NAACL 2025

[Is Translation All You Need? A Study on Solving Multilingual Tasks with Large Language Models](https://aclanthology.org/2025.naacl-long.485/)
finds that English translation can help English-centric models on NLP tasks, but
native-language prompting can be more effective on culture-related tasks; outcomes
vary by model and task. Preserving language-sensitive lore, original decisions
and localization is our application of this finding, not a measured Warwrit result.
Translation does not authorize reinterpretation of approved rules.

### Coding counterevidence: Afrin et al., arXiv, 2026-07-16

[Large Language Models for Code Generation from Multilingual Prompts: A Curated Benchmark and a Study on Code Quality](https://arxiv.org/abs/2607.14816)
reports 460 Python/Java tasks comparing English prompts with curated Chinese,
Hindi, Spanish and Italian translations. English does not consistently give the
best functional correctness or code quality. This is a preprint, not asserted
peer-reviewed evidence. Its described scope excludes Russian and TypeScript and
does not test a long-running repository agent. It challenges a universal claim,
not establishes a different Warwrit default.

### Context use: Liu et al., TACL 2024

[Lost in the Middle: How Language Models Use Long Contexts](https://aclanthology.org/2024.tacl-1.9/)
finds position-dependent performance in multi-document QA and key-value retrieval:
relevant information in the middle of long contexts can be harder to use. This
motivates selective, well-structured context, not a universal prompt-length limit,
a claim that shorter is always better, or permission to omit mandatory sources.

The first four studies address language/tokenization or task-language choice. The
fifth addresses a distinct context-use risk. None supplies an exact token saving
or coding-success rate for the current Warwrit launcher and target agent.

## Official accounting guidance, separate from research

OpenAI's [Understanding and counting tokens](https://help.openai.com/en/articles/4936856)
distinguishes words from model/encoding-specific token counts and labels the
four-characters-per-token rule as an English approximation. It distinguishes
plain text from a full request with message framing, tools and other inputs.
Use the supported input-count interface when full-request accounting is needed.

The official [tiktoken documentation](https://github.com/openai/tiktoken) exposes
model-to-encoding selection and text encoding. The example model/encoding in its
README does not identify the tokenizer used by an unknown future agent or by a
particular hosted chat session. Do not silently substitute a familiar encoding
and call its count exact for another backend. These references describe tools,
not empirical evidence that English instructions always improve task results.

## Applying the evidence without creating another source of truth

The language default applies prospectively, not as a migration of existing
approved documents. A Russian owner decision keeps its original wording and
source identity. An English execution instruction may paraphrase it faithfully,
but must retain exceptions, negation, scope, numbers, units and permissions.
Names, command identifiers, filenames and Unicode-sensitive fixtures stay exact.
When translation changes the meaning, resolve the source conflict rather than
choosing the shorter version. Locale-specific prose follows the requested locale.

Context economy starts with avoiding needless duplication. An agent still reads
all sources mandated by the active contract, including full Notes and dated
Purpose amendments. It requests those records directly and optional references
only when relevant, rather than loading unrelated records or repeated full
bilingual versions. After reading, a compact checkpoint records source versions,
current work, remaining requirements and evidence pointers; changed material is
re-read on resume. A summary does not acquire source authority or prove a source
was read. This workflow is an engineering application, not an experimental result
from the cited papers.

## Optional measurement protocol

For a claimed token saving, compare semantically equivalent RU/EN texts under the
same documented target encoding. Record model/encoding identity, tool version,
text hashes, counts and whether the measurement covers just the launcher or the
full submitted request. Keep identifiers and obligations constant. Count actual
retrieved content and tool schemas when they are part of the measured request;
separately identify content the host adds that cannot be measured. Report a named
proxy as a proxy, or `NOT_MEASURED` when exact counting is unavailable. Use local or
already authorized tooling; no public upload of private project sources and no
new game dependency or paid call without permission.

For a quality claim, use representative matched tasks with the same starting
repository, supplied facts, tool permissions and model settings where controllable.
Observe existing behavior tests, unauthorized actions, source/translation fidelity,
retries and total usage rather than only the final answer length. State sample size
and limitations; a single favorable run is not universal proof. This evaluation is
optional process research, not a new gate or prerequisite for WP-02.4 development.

## Evidence actually obtained for this change

The review used the indexed primary abstracts/publication records above and
official token-count guidance; the tiktoken README was read through GitHub.
Direct full-page retrieval repeatedly returned service errors in this environment.
Full-paper tables and experimental code were not independently audited, and the
published experiments were not replicated. No per-language numeric conclusion
beyond the explicitly attributed abstract statements is inferred.

Local `tiktoken` was unavailable. The Warwrit launcher's actual target-model token
count, equivalent RU/EN token savings and agent A/B performance are **NOT_MEASURED**.
Earlier word/Unicode-character counts are not token measurements. Structural
Markdown/diff checks and repository CI, when reported in the PR, validate this
documentation delivery and unchanged software invariants, not language-policy
performance. No game mechanics, source authority, test policy, runtime dependency,
work-package status or merge/deployment permission is changed by this rationale.

# Source and local adaptation

- Upstream repository https://github.com/edhahn/agent-skills
- Source commit `ffc6fc4bf1408bc3cac522916bb58e603f39ab45`
- Source entry https://github.com/edhahn/agent-skills/blob/ffc6fc4bf1408bc3cac522916bb58e603f39ab45/eval-driven-game-development/SKILL.md
- License MIT, retained in [LICENSE](LICENSE).
- Modified for Warwrit on 2026-11-06 under the owner's review/add/try request.

Narrowed activation to assigned existing-rule measurements. Retained simulation coverage, seeds/sample/policy and model limits. Required approval for regression-delta gates as well as absolute targets. Replaced aggregate win-rate equivalence with per-seed/replay checks. Removed studio handoffs, scenario catalogs, generic harness construction and automatic CI work.

Only the adapted instruction entry and license/provenance are installed. The
installer's pinned download is retained in ignored output for source comparison.
These instructions provide no executable engine or new product dependency.

# Review the affected player experience

Read only the section relevant to the assigned change. Use the current slice and
its existing evidence. These checks are project-authored from Warwrit's contracts.

## Narrative and environmental details

Read [writing rules](../../../../docs/wiki/world/writing.md), the applicable
canonical place/contract facts and [text rubric](../../../../docs/engineering/TEXT_CRITIQUE.md).
For a material assertion, identify speaker/observer, event time and how that person
acquired the information. A rumor belongs to its source and uncertainty. Check
what the current scene makes visible and what the prose asks the player to infer.
Correct contradictions using established evidence. Flag missing authority for
new witnesses, motives or events. Preserve the existing voice and localization.

## Quest state and saved consequences

Trace the affected accepted transition through prerequisites, commands, public
projection and saved state. Use `packages/game-core/src/contracts/` and the owning
adapter for the actual rule. Check reachable normal entry, completion/failure,
retry and reload where the change affects them. A success line must follow the
confirmed outcome, and a reward must follow its canonical grant. Identify the
smallest state/input sequence that exposes a contradiction or blocks progression.

## Interface and battle feedback

Follow the requested player action from its visible control to the response.
Check whether available actions, targets, costs and consequences can be understood
from the permitted information. A disabled control needs an understandable reason
when that reason is safe to reveal. Check overlays and pointer targets together
with screenshots and actual input. Inspect the rendered frame relevant to the
claim and the saved effect when persistence matters.

For combat, separate command validation/resolution from rendering and narration.
Compare the preview, committed result and visible feedback for the affected action.
Replays can diagnose rule/state differences. The browser journey establishes
input and presentation behavior. Use current desktop acceptance and final critic
timing from AGENTS. Player comprehension/enjoyment needs player observations.

## Finding

Return the violated accepted fact or requirement, affected screen/state, concrete
sequence or quoted line, observed/source evidence and smallest owning fix. Keep
unexecuted checks visible and subjective preferences separate from defects.

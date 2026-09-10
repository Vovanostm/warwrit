import { companySourceKey } from './guards.js';
import { canonicalJson } from './input.js';
import { admitPractice } from './practice-admission.js';
import { creditProgression } from './progression.js';
import { readSkillProgress } from './skill-progress.js';
import { requireEconomy } from './economy-state.js';
import type { EconomyContext } from './economy-types.js';
import type { CommandOf } from './lifecycle-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import type { PracticeContext } from './practice-admission.js';

/** Exact practice credit only; admission and A01 arithmetic keep their own responsibilities. */
export function preparePracticeCredit(
  root: MaterializedCompanyState,
  command: CommandOf<'CreditPractice'>,
  context: EconomyContext & Pick<PracticeContext, 'practiceFacts'>,
): MaterializedCompanyState {
  const admitted = admitPractice(command, context);
  const character = root.lifecycle.characters.find(
    (entry) => entry.identity.characterId === command.payload.characterId,
  );
  requireEconomy(character, 'INVALID_SOURCE');
  const stored = character.skills[command.payload.skillId];
  requireEconomy(stored !== undefined, 'INVALID_STATE');
  const progress = readSkillProgress(stored);
  requireEconomy(typeof progress !== 'number', 'INVALID_STATE');

  const sourceKey = companySourceKey(command);
  requireEconomy(sourceKey !== null, 'INVALID_STATE');
  requireEconomy(!root.finance.sourceEffects.some((entry) => entry.key === sourceKey), 'INVALID_STATE');
  const nextProgress = {
    ...progress,
    amount: creditProgression(progress.amount, admitted.baseMilliXp, admitted.coefficients),
  };
  return {
    ...root,
    lifecycle: {
      ...root.lifecycle,
      characters: root.lifecycle.characters.map((entry) =>
        entry === character
          ? {
              ...entry,
              skills: { ...entry.skills, [command.payload.skillId]: nextProgress },
            }
          : entry,
      ),
    },
    finance: {
      ...root.finance,
      sourceEffects: [
        ...root.finance.sourceEffects,
        { key: sourceKey, requestKey: canonicalJson(admitted.source) },
      ],
    },
  };
}

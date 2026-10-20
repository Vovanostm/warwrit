import type { ReactNode } from 'react';
import type { CombatLabAction, CombatLabHex, CombatLabSkillId } from '@warwrit/protocol';
import type { BattlePresentationView } from './battle-presentation.js';
import type { CombatLabView } from '@warwrit/protocol';

export interface BattleViewProps {
  readonly view: BattlePresentationView | CombatLabView;
  readonly selectedUnitId: string | null;
  readonly selectedHex: CombatLabHex | null;
  readonly onSelectUnit: (id: string) => void;
  readonly onSelectHex: (hex: CombatLabHex) => void;
  readonly children?: ReactNode;
  readonly menu?: ReactNode;
  readonly onRefusal?: (reason: string) => void;
  readonly onAct?: (action: CombatLabAction['intent']) => void;
  readonly onRestart?: () => void;
  readonly onEditor?: () => void;
  readonly busy?: boolean;
  readonly selectedSkillId?: CombatLabSkillId | null;
  readonly onSelectSkill?: (id: CombatLabSkillId) => void;
  readonly skillDisabledReason?: string;
}

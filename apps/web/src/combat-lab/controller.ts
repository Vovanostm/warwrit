export function combatSkillReasonText(reason: string | undefined): string {
  const reasons: Readonly<Record<string, string>> = {
    BATTLE_TERMINAL: 'Бой завершён.',
    NOT_ACTIVE_UNIT: 'Сейчас ходит другой боец.',
    PANICKED: 'Боец в панике.',
    SKILL_NOT_AVAILABLE: 'Приём недоступен с этим снаряжением или уже применён.',
    INVALID_TARGET: 'Приём нельзя применить к этой цели.',
    OUT_OF_RANGE: 'Цель вне дальности приёма.',
    BLOCKED_LINE_OF_SIGHT: 'Линия до цели перекрыта.',
    INSUFFICIENT_ACTION_POINTS: 'Не хватает очков действий.',
    INSUFFICIENT_STAMINA: 'Не хватает сил.',
  };
  return reason ? (reasons[reason] ?? reason) : 'Нет допустимой цели.';
}

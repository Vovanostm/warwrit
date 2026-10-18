/** Presentation refusal priority; command admission remains in the server projection. */
export function manualControlReasons(input: {
  readonly commonReason: string;
  readonly pending: object | null;
  readonly autoplay: boolean;
  readonly menuOpen: boolean;
  readonly selectedSkillId: string | null;
}) {
  const pendingReason = input.pending ? 'Ожидается ответ' : '';
  const autoplayReason = input.autoplay ? 'Автобой включён' : '';
  const menuReason = input.menuOpen ? 'Меню открыто' : '';
  const controlReason = input.commonReason || pendingReason || autoplayReason;
  const manualReason = input.selectedSkillId
    ? 'Выбран приём · Esc — отменить'
    : menuReason || controlReason;
  return { manualReason, menuReason };
}

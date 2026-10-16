import type { CombatLabView, CombatLabHex, CombatLabSkillId } from '@warwrit/protocol';
import { Icon, type Unit } from './BattleUnitCard.js';
import { damageRange } from './battle-hud-format.js';
import { combatSkillReasonText } from './controller.js';
interface Props {
  view: CombatLabView;
  blockedCell: CombatLabHex | undefined;
  selectedSkillId: CombatLabSkillId | null;
  forecastSkill: NonNullable<CombatLabView['skillPreview']>[number] | undefined;
  forecastAttack: NonNullable<CombatLabView['attackPreview']>[number] | undefined;
  forecastMove: NonNullable<CombatLabView['movementPreview']>[number] | undefined;
  target: Unit | undefined;
  attackId: string | null | undefined;
  remainingAP: number;
  activeActor: Unit | undefined;
}
export function BattleForecast({
  view,
  blockedCell,
  selectedSkillId,
  forecastSkill,
  forecastAttack,
  forecastMove,
  target,
  attackId,
  remainingAP,
  activeActor,
}: Props) {
  return (
    <>
      {view.status === 'active' && blockedCell && !selectedSkillId && (
        <aside className="battle-target-forecast" aria-label="Непроходимая клетка">
          <p className="battle-forecast-heading">
            Завал · клетка {blockedCell.q}, {blockedCell.r}
          </p>
          <p>
            <strong>Непроходимо</strong>
          </p>
          <small>Выберите соседнюю свободную клетку</small>
        </aside>
      )}
      <SkillForecast view={view} forecastSkill={forecastSkill} />
      {(forecastAttack || forecastMove) && (
        <aside
          className={`battle-target-forecast${forecastMove ? ' battle-move-forecast' : ''}`}
          aria-label="Предпросмотр действия"
        >
          <p className="battle-forecast-heading">
            {forecastMove ? 'Движение' : `Атака · ${target?.name ?? attackId}`}
          </p>
          <AttackDetails forecastAttack={forecastAttack} />
          <MoveDetails
            forecastMove={forecastMove}
            view={view}
            remainingAP={remainingAP}
            activeActor={activeActor}
          />
          <ActionCost forecastMove={forecastMove} forecastAttack={forecastAttack} />
          <small>ПКМ — {forecastMove ? 'идти' : 'атаковать'}</small>
        </aside>
      )}
    </>
  );
}

function AttackDetails({ forecastAttack }: Pick<Props, 'forecastAttack'>) {
  return (
    <>
      {' '}
      {forecastAttack && (
        <>
          <div className="battle-chance-row">
            <div
              className="battle-chance-ring"
              style={{
                background: `conic-gradient(#d3bb7e ${forecastAttack.hitChance}%, #3d5052 0)`,
              }}
            >
              <strong>
                {forecastAttack.hitChance}
                <small>%</small>
              </strong>
            </div>
            <div>
              <b>Попадание</b>
              <span>
                Промах <strong>{100 - forecastAttack.hitChance}%</strong>
              </span>
            </div>
          </div>
          <span className="battle-sr-only">Шанс попадания {forecastAttack.hitChance}%</span>
          {forecastAttack.damage && (
            <div className="battle-damage-channels">
              <div>
                <Icon name="health" />
                <strong>{damageRange(forecastAttack.damage.health)}</strong>
                <small>здоровье</small>
              </div>
              <div>
                <Icon name="armor" />
                <strong>{damageRange(forecastAttack.damage.armor)}</strong>
                <small>броня</small>
              </div>
            </div>
          )}
          <small>При попадании{!forecastAttack.damage && ' · урон недоступен'}</small>
        </>
      )}
    </>
  );
}

function MoveDetails({
  forecastMove,
  view,
  remainingAP,
  activeActor,
}: Pick<Props, 'forecastMove' | 'view' | 'remainingAP' | 'activeActor'>) {
  return (
    <>
      {' '}
      {forecastMove && (
        <>
          <div className="battle-move-ap">
            <strong>
              {forecastMove.actionPointCost}
              <small>ОД</small>
            </strong>
            <span>цена пути</span>
            <strong>
              {remainingAP}
              <small>ОД</small>
            </strong>
            <span>останется</span>
          </div>
          <div
            className="battle-move-pips"
            aria-label={`Будет потрачено ${forecastMove.actionPointCost} ОД, останется ${remainingAP} из ${view.activation?.actionPoints.maximum ?? 0}`}
          >
            {Array.from({ length: view.activation?.actionPoints.maximum ?? 0 }, (_, index) => (
              <i
                key={index}
                data-ap={
                  index < forecastMove.actionPointCost
                    ? 'spent'
                    : index < (view.activation?.actionPoints.current ?? 0)
                      ? 'remaining'
                      : 'empty'
                }
              />
            ))}
          </div>
          <p className="battle-path">
            {forecastMove.path.length}{' '}
            {forecastMove.path.length === 1
              ? 'клетка пути'
              : forecastMove.path.length < 5
                ? 'клетки пути'
                : 'клеток пути'}
          </p>
          {(forecastMove.reactions?.length ?? 0) > 0 && (
            <div className="battle-danger-warning">
              <strong>Свободные удары при отходе</strong>
              {forecastMove.reactions?.map((reaction) => (
                <p key={reaction.attackerId}>
                  {view.units.find((unit) => unit.id === reaction.attackerId)?.name ??
                    reaction.attackerId}
                  : {reaction.hitChance}% · здоровье {damageRange(reaction.damage.health)} / броня{' '}
                  {damageRange(reaction.damage.armor)}
                </p>
              ))}
              <small>
                При попадании; последующие удары могут пробить ослабленную броню. Выживший продолжит
                путь.
              </small>
            </div>
          )}
          {(forecastMove.fireDamage ?? 0) > 0 && (
            <p className="battle-danger-warning">
              {activeActor && (forecastMove.fireDamage ?? 0) >= activeActor.pools.health.current
                ? 'Боец погибнет на пути и не достигнет клетки.'
                : `Огонь: −${forecastMove.fireDamage} здоровья.`}
            </p>
          )}
        </>
      )}
    </>
  );
}

function SkillForecast({ view, forecastSkill }: Pick<Props, 'view' | 'forecastSkill'>) {
  return (
    <>
      {' '}
      {forecastSkill && (
        <aside className="battle-target-forecast" aria-label="Предпросмотр приёма">
          <p className="battle-forecast-heading">
            {forecastSkill.name} · ранг {forecastSkill.rank}
          </p>
          <strong>
            {view.units.find((unit) => unit.id === forecastSkill.targetId)?.name ??
              forecastSkill.targetId}
          </strong>
          {forecastSkill.hitChance !== undefined && <p>Попадание {forecastSkill.hitChance}%</p>}
          {forecastSkill.damage && (
            <p>
              Здоровье {damageRange(forecastSkill.damage.health)} · броня{' '}
              {damageRange(forecastSkill.damage.armor)}
            </p>
          )}
          {forecastSkill.moraleGain !== undefined && <p>Мораль +{forecastSkill.moraleGain}</p>}
          {forecastSkill.damageReductionPercent !== undefined && (
            <p>Сила входящего удара −{forecastSkill.damageReductionPercent}%</p>
          )}
          <p>
            {forecastSkill.actionPointCost} ОД · {forecastSkill.staminaCost} сил
          </p>
          <small>
            {forecastSkill.legal
              ? 'ПКМ — применить приём'
              : combatSkillReasonText(forecastSkill.reason)}
          </small>
        </aside>
      )}
    </>
  );
}

function ActionCost({
  forecastMove,
  forecastAttack,
}: Pick<Props, 'forecastMove' | 'forecastAttack'>) {
  return (
    <footer>
      <span>{forecastAttack ? 'Атака' : 'Путь'}</span>
      <b>
        {forecastMove?.actionPointCost ?? forecastAttack?.actionPointCost} ОД ·{' '}
        {forecastMove?.staminaCost ?? forecastAttack?.staminaCost} сил
      </b>
    </footer>
  );
}

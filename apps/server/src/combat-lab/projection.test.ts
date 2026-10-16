import { assert, describe, expect, it } from 'vitest';
import * as combat from '@warwrit/game-core';
import { createCombatLabFixture } from './scenario.js';
import { projectCombatLabView } from './projection.js';

describe('projectCombatLabView initiative forecast', () => {
  it('projects the core forecast only while a future round can occur', () => {
    const fixture = createCombatLabFixture('initiative-projection');
    let transition = fixture.start();
    let view = projectCombatLabView(
      'session',
      fixture.controlledSideId,
      transition.state,
      transition.events,
    );
    expect(view.nextRoundInitiative).toEqual(combat.previewCombatInitiative(transition.state));

    const activation = transition.state.activation;
    assert(activation);
    const result = combat.applyCombatCommand(transition.state, {
      type: 'wait',
      commandId: combat.commandId('initiative-projection-wait'),
      actorId: activation.unitId,
      activationId: activation.id,
    });
    assert(result.ok);
    transition = { state: result.state, events: [...transition.events, ...result.events] };
    view = projectCombatLabView(
      'session',
      fixture.controlledSideId,
      transition.state,
      transition.events,
    );
    expect(view.nextRoundInitiative).toEqual(combat.previewCombatInitiative(transition.state));

    const battle = combat.runAiBattle(fixture.originalSetup());
    const resolved = projectCombatLabView(
      'session',
      fixture.controlledSideId,
      battle.state,
      battle.events,
    );
    expect(resolved.status).toBe('resolved');
    expect(resolved).not.toHaveProperty('nextRoundInitiative');
  });
});

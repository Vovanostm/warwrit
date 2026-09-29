import { canonicalJson } from './input.js';
import { evidence, event, person, requireLifecycle } from './lifecycle-state.js';
import type {
  LifecycleChange,
  LifecycleContext,
  LifecycleNicknameProposal,
  LifecycleState,
  CommandOf,
} from './lifecycle-types.js';
import { entityId, isEntityId, publicRevision } from './values.js';

function proposeNickname(
  state: LifecycleState,
  command: CommandOf<'ProposeNickname'>,
  context: LifecycleContext,
): LifecycleChange {
  const payload = command.payload;
  const fact = evidence(context, payload.sourceEventId, 'NICKNAME_DEED');
  const character = person(state, payload.characterId);
  requireLifecycle(
    fact.id === payload.sourceEventId &&
      fact.sourceEventId === payload.sourceEventId &&
      fact.characterId === payload.characterId &&
      fact.cultureId === character.identity.birthCultureId &&
      isEntityId(fact.deedKind) &&
      isEntityId(fact.reasonKey) &&
      fact.textKey === payload.textKey,
    'INVALID_SOURCE',
  );
  const proposals = state.nicknameProposals ?? [];
  requireLifecycle(
    !proposals.some(
      (proposal) =>
        proposal.proposalId === payload.proposalId ||
        (proposal.characterId === payload.characterId &&
          proposal.sourceEventId === payload.sourceEventId),
    ),
    'INVALID_SOURCE',
  );
  const proposal: LifecycleNicknameProposal = {
    proposalId: payload.proposalId,
    characterId: entityId<'Character'>(payload.characterId),
    sourceEventId: payload.sourceEventId,
    cultureId: fact.cultureId,
    deedKind: fact.deedKind,
    reasonKey: fact.reasonKey,
    textKey: payload.textKey,
    proposedAt: context.atTick,
    resolution: 'PENDING',
    resolvedAt: null,
  };
  return {
    next: { ...state, nicknameProposals: [...proposals, proposal] },
    events: [event(command.commandId, 'NicknameProposed', context.atTick, [payload.characterId])],
    requirements: [],
  };
}

function resolveNickname(
  state: LifecycleState,
  command: CommandOf<'ResolveNickname'>,
  context: LifecycleContext,
): LifecycleChange {
  const observed = state.knowledge.nicknameProposals ?? [];
  const proposalView = observed.find(
    (proposal) => proposal.proposalId === command.payload.proposalId,
  );
  requireLifecycle(proposalView, 'INVALID_SOURCE');
  const proposals = state.nicknameProposals ?? [];
  const index = proposals.findIndex((proposal) => proposal.proposalId === proposalView.proposalId);
  const proposal = proposals[index];
  requireLifecycle(
    proposal?.resolution === 'PENDING' &&
      canonicalJson({
        proposalId: proposal.proposalId,
        characterId: proposal.characterId,
        sourceEventId: proposal.sourceEventId,
        cultureId: proposal.cultureId,
        deedKind: proposal.deedKind,
        reasonKey: proposal.reasonKey,
        textKey: proposal.textKey,
        proposedAt: proposal.proposedAt,
      }) === canonicalJson(proposalView),
    'INVALID_SOURCE',
  );

  const resolved = {
    ...proposal,
    resolution: command.payload.accept ? ('ACCEPTED' as const) : ('REJECTED' as const),
    resolvedAt: context.atTick,
  };
  const nextProposals = proposals.map((item, at) => (at === index ? resolved : item));
  const acceptedAt = context.atTick;
  const accepted = command.payload.accept
    ? {
        proposalId: proposal.proposalId,
        characterId: proposal.characterId,
        sourceEventId: proposal.sourceEventId,
        cultureId: proposal.cultureId,
        deedKind: proposal.deedKind,
        reasonKey: proposal.reasonKey,
        textKey: proposal.textKey,
        acceptedAt,
      }
    : null;
  const characters = command.payload.accept
    ? state.characters.map((character) =>
        character.identity.characterId === proposal.characterId
          ? {
              ...character,
              nickname: { proposalId: proposal.proposalId, textKey: proposal.textKey },
            }
          : character,
      )
    : state.characters;
  const resolvedEvent = event(
    command.commandId,
    command.payload.accept ? 'NicknameAccepted' : 'NicknameRejected',
    context.atTick,
    [proposal.characterId],
  );
  const knowledge = {
    ...state.knowledge,
    revision: publicRevision((BigInt(state.knowledge.revision) + 1n).toString()),
    eventIds: [...state.knowledge.eventIds, resolvedEvent.id],
    nicknameProposals: observed.filter((item) => item.proposalId !== proposal.proposalId),
    nicknameHistory: accepted
      ? [
          ...(state.knowledge.nicknameHistory ?? []).filter(
            (item) => item.proposalId !== proposal.proposalId,
          ),
          accepted,
        ]
      : (state.knowledge.nicknameHistory ?? []),
    characters: command.payload.accept
      ? state.knowledge.characters.map((known) =>
          known.identity.characterId === proposal.characterId
            ? {
                ...known,
                nickname: { proposalId: proposal.proposalId, textKey: proposal.textKey },
              }
            : known,
        )
      : state.knowledge.characters,
  };
  return {
    next: { ...state, nicknameProposals: nextProposals, characters, knowledge },
    events: [resolvedEvent],
    requirements: [],
  };
}

export function prepareNicknameCommand(
  state: LifecycleState,
  command: CommandOf<'ProposeNickname'> | CommandOf<'ResolveNickname'>,
  context: LifecycleContext,
): LifecycleChange {
  return command.type === 'ProposeNickname'
    ? proposeNickname(state, command, context)
    : resolveNickname(state, command, context);
}

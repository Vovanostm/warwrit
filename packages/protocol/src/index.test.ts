import { describe, expect, it } from 'vitest';

import { envelope, MAIN_WORLD_ID, PROTOCOL_VERSION } from './index.js';
import type { OrdinaryPlayerCompanyCommandV2Dto } from './company.js';
import type { WorldAvailableDepartureDto, WorldTravelRejectionDto } from './index.js';
import {
  isFirstHuntCommand,
  isFirstHuntReadResponse,
  isWorldTravelPreviewRequest,
} from './contracts.js';

describe('protocol foundation', () => {
  it('wraps data with the current protocol version', () => {
    expect(envelope({ accepted: true })).toEqual({
      data: { accepted: true },
      protocolVersion: PROTOCOL_VERSION,
    });
  });

  it('reserves a stable world identifier from the first schema version', () => {
    expect(MAIN_WORLD_ID).toBe('main');
  });

  it('pairs each supported V2 company action with its payload at compile time', () => {
    const rename: OrdinaryPlayerCompanyCommandV2Dto = {
      schemaVersion: 2,
      commandId: 'rename-company',
      expectedPublicRevision: '0',
      type: 'RenameCompany',
      payload: { name: 'The Ashen Company', bannerId: 'ashen-banner' },
    };
    const choosePerk: OrdinaryPlayerCompanyCommandV2Dto = {
      schemaVersion: 2,
      commandId: 'choose-perk',
      expectedPublicRevision: '0',
      type: 'ChoosePerk',
      payload: { characterId: 'leader', perkId: 'leadership-25-a', milestone: 25 },
    };

    const mismatched: OrdinaryPlayerCompanyCommandV2Dto = {
      schemaVersion: 2,
      commandId: 'mismatched-company-command',
      expectedPublicRevision: '0',
      type: 'ChoosePerk',
      // @ts-expect-error ChoosePerk must not accept RenameCompany's payload.
      payload: { name: 'Not a perk selection', bannerId: 'ashen-banner' },
    };

    expect([rename.type, choosePerk.type, mismatched.type]).toEqual([
      'RenameCompany',
      'ChoosePerk',
      'ChoosePerk',
    ]);
  });

  it('accepts both versioned world travel rejection schemas', () => {
    const multiEdge: WorldAvailableDepartureDto = {
      purpose: 'NEW',
      edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
      fromSiteId: 'severny-dvor',
      toSiteId: 'bereznyak',
    };
    const v1: WorldTravelRejectionDto = {
      schemaVersion: 1,
      commandId: 'legacy-travel',
      ok: false,
      publicRevision: '7',
      code: 'STALE_REVISION',
    };
    const v2: WorldTravelRejectionDto = {
      schemaVersion: 2,
      commandId: 'multi-edge-travel',
      ok: false,
      publicRevision: '8',
      code: 'INVALID_ROUTE',
    };
    const invalid: WorldTravelRejectionDto = {
      // @ts-expect-error The rejection contract is versioned and only supports V1 or V2.
      schemaVersion: 3,
      commandId: 'unsupported-travel',
      ok: false,
      publicRevision: '8',
      code: 'INVALID_ROUTE',
    };

    expect([
      multiEdge.edgeIds.length,
      v1.schemaVersion,
      v2.schemaVersion,
      invalid.schemaVersion,
    ]).toEqual([2, 1, 2, 3]);
  });

  it('keeps FIRST HUNT commands and its public view strict and actor-scoped', () => {
    const accept = {
      schemaVersion: 1,
      commandId: 'accept-first-hunt',
      expectedPublicRevision: '4',
      type: 'ACCEPT',
      payload: { instanceId: 'ci.m1.raider-standard.01', termsDigest: 'a'.repeat(64) },
    };
    expect(isFirstHuntCommand(accept)).toBe(true);
    expect(isFirstHuntCommand({ ...accept, actorId: 'client-selected' })).toBe(false);
    expect(isFirstHuntCommand({ ...accept, payload: { ...accept.payload, rewardQ: '0' } })).toBe(
      false,
    );
    expect(
      isFirstHuntCommand({
        schemaVersion: 1,
        commandId: 'pickup-proof',
        expectedPublicRevision: '4',
        type: 'PICKUP',
        payload: { instanceId: 'ci.m1.raider-standard.01', toContainerId: 'pack-1' },
      }),
    ).toBe(true);

    const contractView = {
      instanceId: 'ci.m1.raider-standard.01',
      definitionEdition: 'ct-m1-authored-v1',
      termsDigest: 'a'.repeat(64),
      terms: {
        profileId: 'first-hunt-runtime-profile-2026-10-01-v1',
        issuerId: 'npc.city-watch-contact.kamenny-brod.01',
        issuerLocation: { siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' },
        objectiveLocation: { siteId: 'staraya-melnitsa', areaId: 'staraya-melnitsa-yard' },
        rewardQ: '100000000',
        claimPolicy: 'UNIQUE_CURRENT_BEARER',
        maximumHelpers: 1,
      },
      yourRole: 'OWNER',
      knownState: 'ACTIVE',
      yourJoinIntent: false,
      helperSlot: 'AVAILABLE',
      encounterId: null,
      pickupTargets: [
        { containerId: 'company-pack', label: 'Carried container', availableWeightG: '1500' },
      ],
      yourProof: null,
    };
    expect(
      isFirstHuntReadResponse({ schemaVersion: 1, publicRevision: '5', contract: contractView }),
    ).toBe(true);
    expect(
      isFirstHuntReadResponse({
        schemaVersion: 1,
        publicRevision: '5',
        contract: { ...contractView, pickupTargets: [{ containerId: 'company-pack', hidden: true }] },
      }),
    ).toBe(false);
    expect(
      isFirstHuntReadResponse({
        schemaVersion: 1,
        publicRevision: '5',
        contract: { ...contractView, hostilePositions: ['hidden'] },
      }),
    ).toBe(false);
  });

  it('accepts only an unprivileged authored-edge travel preview request', () => {
    expect(
      isWorldTravelPreviewRequest({
        schemaVersion: 1,
        purpose: 'NEW',
        edgeIds: ['kamenny-brod-tikhaya-gat', 'tikhaya-gat-staraya-melnitsa'],
      }),
    ).toBe(true);
    expect(
      isWorldTravelPreviewRequest({
        schemaVersion: 1,
        purpose: 'RETURN',
        edgeIds: ['tikhaya-gat-staraya-melnitsa'],
        companyId: 'client-selected',
      }),
    ).toBe(false);
  });
});

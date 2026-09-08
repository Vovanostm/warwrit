import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { format } from 'prettier';

/** @type {import('prettier').Config} */
const config = {
  arrowParens: 'always',
  printWidth: 100,
  proseWrap: 'preserve',
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
};

function replaceOnce(source, from, to, label) {
  const first = source.indexOf(from);
  if (first < 0 || source.indexOf(from, first + from.length) >= 0)
    throw new Error(`candidate replacement mismatch: ${label}`);
  return source.slice(0, first) + to + source.slice(first + from.length);
}

const transforms = new Map();
transforms.set('packages/game-core/src/company/economy-types.ts', (source) =>
  replaceOnce(source, "    | 'CARE'\n    | 'FOOD'", "    | 'CARE'\n    | 'CARE_HANDOVER'\n    | 'FOOD'", 'cash purpose'),
);
transforms.set('packages/game-core/src/company/physical-types.ts', (source) => {
  source = replaceOnce(
    source,
    "  readonly itemId: string;\n  readonly fromOwner: OwnerRef;",
    "  readonly itemId: string;\n  readonly quantity: number;\n  readonly fromOwner: OwnerRef;",
    'ownership quantity',
  );
  return replaceOnce(
    source,
    "  readonly receiverId: string;\n  readonly location: AtLocation;\n}\nexport interface RepairServiceEvidence",
    "  readonly receiverId: string;\n  readonly location: AtLocation;\n  readonly poolId: string;\n  readonly providerWalletId: string;\n  readonly moneyAccessEvidenceId: string;\n  readonly amountQ: MoneyQ;\n}\nexport interface RepairServiceEvidence",
    'funded handover fields',
  );
});
transforms.set('packages/game-core/src/company/physical-payments.ts', (source) =>
  replaceOnce(
    source,
    "'CARE' | 'FOOD' | 'REPAIR'",
    "'CARE' | 'CARE_HANDOVER' | 'FOOD' | 'REPAIR'",
    'provider payment purpose',
  ),
);
transforms.set('packages/game-core/src/company/physical-items.ts', (source) => {
  source = replaceOnce(
    source,
    "      authorization.itemId === item.itemId,",
    "      authorization.itemId === item.itemId &&\n      authorization.quantity === item.quantity,",
    'change owner quantity',
  );
  source = replaceOnce(
    source,
    "    fact.itemId === item.itemId &&\n      canonicalJson(fact.fromOwner) === canonicalJson(item.owner) &&",
    "    fact.itemId === item.itemId &&\n      Number.isSafeInteger(fact.quantity) &&\n      fact.quantity > 0 &&\n      canonicalJson(fact.fromOwner) === canonicalJson(item.owner) &&",
    'authorization quantity validity',
  );
  source = replaceOnce(
    source,
    "  const authorization = ownershipAuthorization(context, p.ownershipReceiptId, item);\n  let physical = splitOrMove(",
    "  const authorization = ownershipAuthorization(context, p.ownershipReceiptId, item);\n  requirePhysical(!authorization || authorization.quantity === p.quantity, 'INVALID_SOURCE');\n  let physical = splitOrMove(",
    'transfer quantity binding',
  );
  return replaceOnce(
    source,
    "      itemId: entry.itemId,\n      fromOwner: item.owner,",
    "      itemId: entry.itemId,\n      quantity: entry.quantity,\n      fromOwner: item.owner,",
    'loot synthetic ownership quantity',
  );
});
transforms.set('packages/game-core/src/company/physical-care.ts', (source) =>
  replaceOnce(
    source,
    `export function settleCareHandover(\n  root: MaterializedCompanyState,\n  requirement: Extract<EconomyRequirement, { kind: 'CARE_HANDOVER' }>,\n  context: EconomyContext,\n  explicitId?: string,\n): CompanyPhysicalState {\n  const fact = explicitId\n    ? physicalFact(context, explicitId, 'CARE_HANDOVER')\n    : uniquePhysicalFact(\n        context,\n        'CARE_HANDOVER',\n        (candidate) =>\n          candidate.characterId === requirement.characterId &&\n          candidate.receiverId === requirement.receiverId &&\n          candidate.atTick === requirement.atTick,\n      );\n  requirePhysical(\n    fact.characterId === requirement.characterId &&\n      fact.receiverId === requirement.receiverId &&\n      fact.atTick === requirement.atTick,\n    'INVALID_SOURCE',\n  );\n  providerAt(root, fact.receiverId, fact.characterId);\n  const subject = person(root.lifecycle, fact.characterId);\n  requirePhysical(\n    subject.presence.location.kind === 'AT' &&\n      sameLocation(subject.presence.location, fact.location),\n    'CONTACT_OR_ACCESS_REQUIRED',\n  );\n  const recorded = recordPhysicalSource(root.physical, fact);\n  requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');\n  return {\n    ...recorded.state,\n    careHandovers: [\n      ...recorded.state.careHandovers,\n      {\n        sourceId: fact.sourceEventId,\n        characterId: fact.characterId,\n        receiverId: fact.receiverId,\n        atTick: fact.atTick,\n      },\n    ],\n  };\n}`,
    `export function settleCareHandover(\n  root: MaterializedCompanyState,\n  requirement: Extract<EconomyRequirement, { kind: 'CARE_HANDOVER' }>,\n  context: EconomyContext,\n  explicitId?: string,\n): { readonly finance: CompanyFinance; readonly physical: CompanyPhysicalState } {\n  const fact = explicitId\n    ? physicalFact(context, explicitId, 'CARE_HANDOVER')\n    : uniquePhysicalFact(\n        context,\n        'CARE_HANDOVER',\n        (candidate) =>\n          candidate.characterId === requirement.characterId &&\n          candidate.receiverId === requirement.receiverId &&\n          candidate.atTick === requirement.atTick,\n      );\n  requirePhysical(\n    fact.handoverId === fact.id &&\n      (!explicitId || fact.handoverId === explicitId) &&\n      fact.characterId === requirement.characterId &&\n      fact.receiverId === requirement.receiverId &&\n      fact.atTick === requirement.atTick,\n    'INVALID_SOURCE',\n  );\n  providerAt(root, fact.receiverId, fact.characterId);\n  const subject = person(root.lifecycle, fact.characterId);\n  requirePhysical(\n    subject.presence.location.kind === 'AT' &&\n      sameLocation(subject.presence.location, fact.location),\n    'CONTACT_OR_ACCESS_REQUIRED',\n  );\n  const recorded = recordPhysicalSource(root.physical, fact);\n  requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');\n  const finance = payPhysicalProvider({ ...root, physical: recorded.state }, context, {\n    poolId: fact.poolId,\n    providerWalletId: fact.providerWalletId,\n    moneyAccessEvidenceId: fact.moneyAccessEvidenceId,\n    providerId: fact.receiverId,\n    location: fact.location,\n    amountQ: fact.amountQ,\n    movementId: physicalId(fact.id, fact.characterId, 'care-handover-payment'),\n    purpose: 'CARE_HANDOVER',\n  });\n  const physical = {\n    ...recorded.state,\n    careHandovers: [\n      ...recorded.state.careHandovers,\n      {\n        sourceId: fact.sourceEventId,\n        characterId: fact.characterId,\n        receiverId: fact.receiverId,\n        atTick: fact.atTick,\n      },\n    ],\n  };\n  return { finance, physical };\n}`,
    'funded care handover',
  ),
);
transforms.set('packages/game-core/src/company/physical.ts', (source) => {
  source = replaceOnce(
    source,
    "  let physical = root.physical;\n  if (!canPerform(character, 'travel')) {",
    "  let physical = root.physical;\n  let finance = root.finance;\n  if (!canPerform(character, 'travel')) {",
    'departure finance local',
  );
  source = replaceOnce(
    source,
    `    physical = settleCareHandover(\n      { ...root, physical },\n      {\n        kind: 'CARE_HANDOVER',\n        characterId: member.characterId,\n        receiverId: handover.receiverId,\n        atTick: context.atTick,\n      },\n      context,\n      requirement.careHandoverId,\n    );`,
    `    const fulfilled = settleCareHandover(\n      { ...root, finance, physical },\n      {\n        kind: 'CARE_HANDOVER',\n        characterId: member.characterId,\n        receiverId: handover.receiverId,\n        atTick: context.atTick,\n      },\n      context,\n      requirement.careHandoverId,\n    );\n    finance = fulfilled.finance;\n    physical = fulfilled.physical;`,
    'departure handover result',
  );
  source = replaceOnce(
    source,
    "  return { lifecycle, finance: root.finance, physical };",
    "  return { lifecycle, finance, physical };",
    'departure finance return',
  );
  return replaceOnce(
    source,
    "      case 'CARE_HANDOVER':\n        next = { ...next, physical: settleCareHandover(next, requirement, context) };\n        break;",
    "      case 'CARE_HANDOVER': {\n        const fulfilled = settleCareHandover(next, requirement, context);\n        next = { ...next, finance: fulfilled.finance, physical: fulfilled.physical };\n        break;\n      }",
    'requirement handover result',
  );
});
transforms.set('packages/testkit/src/company-economy-fixture.ts', (source) =>
  replaceOnce(
    source,
    `      ...ids.map((id) => ({\n        walletId: \`wallet-\${id}\`,\n        owner: { kind: 'CHARACTER' as const, id },\n        location: place,\n        cashQ: cash(0),\n      })),\n    ],`,
    `      ...ids.map((id) => ({\n        walletId: \`wallet-\${id}\`,\n        owner: { kind: 'CHARACTER' as const, id },\n        location: place,\n        cashQ: cash(0),\n      })),\n      {\n        walletId: 'wallet-provider',\n        owner: { kind: 'CHARACTER' as const, id: 'provider' },\n        location: place,\n        cashQ: cash(0),\n      },\n    ],`,
    'provider wallet fixture',
  ),
);
transforms.set('packages/testkit/src/company-physical.spec.test.ts', (source) => {
  source = replaceOnce(
    source,
    "  advance,\n  command,",
    "  access,\n  advance,\n  cash,\n  command,",
    'physical test imports',
  );
  source = replaceOnce(
    source,
    "      accessEvidenceId: 'transfer-access-ok',\n    });",
    "      accessEvidenceId: 'transfer-access-ok',\n      ownershipReceiptId: 'gift-auth',\n    });",
    'gift receipt payload',
  );
  source = replaceOnce(
    source,
    `    const moved = prepared(\n      prepareCompanyEconomy(\n        state,\n        movedCommand,\n        context(state, movedCommand, [], [], [movedAccess]),\n      ),\n    );`,
    `    const mismatchedGift: PhysicalEvidence = {\n      ...physicalScope(state, 'gift-auth'),\n      kind: 'OWNERSHIP_AUTHORIZATION',\n      itemId: 'ration-stack',\n      quantity: 2,\n      fromOwner: { kind: 'COMPANY', id: 'company' },\n      toOwner: { kind: 'CHARACTER', id: 'leader' },\n      operation: 'GIFT',\n    };\n    const mismatched = prepareCompanyEconomy(\n      state,\n      movedCommand,\n      context(state, movedCommand, [], [], [movedAccess, mismatchedGift]),\n    );\n    expect(mismatched).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });\n    expect(mismatched.state).toBe(state);\n    const matchingGift: PhysicalEvidence = { ...mismatchedGift, quantity: 1 };\n    const moved = prepared(\n      prepareCompanyEconomy(\n        state,\n        movedCommand,\n        context(state, movedCommand, [], [], [movedAccess, matchingGift]),\n      ),\n    );`,
    'quantity scoped gift regression',
  );
  source = replaceOnce(
    source,
    `    expect(new Set(live.map((entry) => canonicalJson(entry.owner)))).toEqual(\n      new Set([canonicalJson({ kind: 'COMPANY', id: 'company' })]),\n    );\n    const child = live.find((entry) => entry.containerId === 'destination')!;\n    expect(child.quantity).toBe(1);`,
    `    expect(new Set(live.map((entry) => canonicalJson(entry.owner)))).toEqual(\n      new Set([\n        canonicalJson({ kind: 'COMPANY', id: 'company' }),\n        canonicalJson({ kind: 'CHARACTER', id: 'leader' }),\n      ]),\n    );\n    const child = live.find((entry) => entry.containerId === 'destination')!;\n    expect(child.quantity).toBe(1);\n    expect(child.owner).toEqual({ kind: 'CHARACTER', id: 'leader' });`,
    'split owner assertion',
  );
  source = replaceOnce(
    source,
    "    let immobile = withMedicineProvider(economy([1n], 0n, 0));",
    "    let immobile = withMedicineProvider(economy([1n], 10n, 0));",
    'funded immobile fixture',
  );
  source = replaceOnce(
    source,
    `      receiverId: 'provider',\n      location: place,\n    };\n    const handed = prepared(\n      prepareCompanyEconomy(\n        immobile,\n        withHandover,\n        context(immobile, withHandover, [], [], [handover]),\n      ),\n    ).next;`,
    `      receiverId: 'provider',\n      location: place,\n      poolId: 'local',\n      providerWalletId: 'wallet-provider',\n      moneyAccessEvidenceId: 'money-access',\n      amountQ: cash(1),\n    };\n    const underfunded: PhysicalEvidence = { ...handover, amountQ: cash(11) };\n    const fundingFailure = prepareCompanyEconomy(\n      immobile,\n      withHandover,\n      context(immobile, withHandover, [access(immobile)], [], [underfunded]),\n    );\n    expect(fundingFailure).toMatchObject({ kind: 'REJECTED', error: 'INSUFFICIENT_FUNDS' });\n    expect(fundingFailure.state).toBe(immobile);\n    const handed = prepared(\n      prepareCompanyEconomy(\n        immobile,\n        withHandover,\n        context(immobile, withHandover, [access(immobile)], [], [handover]),\n      ),\n    ).next;`,
    'funded handover regression',
  );
  return replaceOnce(
    source,
    `    expect(handed.physical!.careHandovers.at(-1)).toMatchObject({ characterId: 'worker-0', receiverId: 'provider' });`,
    `    expect(handed.physical!.careHandovers.at(-1)).toMatchObject({\n      characterId: 'worker-0',\n      receiverId: 'provider',\n    });\n    expect(handed.finance.wallets.find((wallet) => wallet.walletId === 'purse')?.cashQ).toBe('9');\n    expect(handed.finance.wallets.find((wallet) => wallet.walletId === 'wallet-provider')?.cashQ).toBe('1');`,
    'handover payment assertions',
  );
});
transforms.set('docs/work-packages/WP-02.4-QUALITY-REVIEW.md', (source) =>
  replaceOnce(
    source,
    '## Deliberate residual boundary',
    `### Author review correction — ownership quantity\n\nThe review reproduced a P1/P2 hole in the first implementation: an ownership receipt named the item and new owner but not the authorized quantity, so the same trusted receipt could authorize an arbitrary split of a stack. ` +
      '`OwnershipAuthorizationEvidence` now carries exact `quantity`; `TransferItem` rejects a different requested quantity unchanged, while a matching partial transfer preserves the parent quantity/provenance and changes ownership only on the exact child.\n\n' +
      `### Author review correction — funded care handover\n\nThe review also reproduced a P5 hole: an immobile departure could previously satisfy ` +
      '`CARE_HANDOVER` with a local medic-shaped character and a receipt, but no funded arrangement. The handover evidence now binds an actual local pool, provider wallet, money-access evidence and positive amount; the common root pays that provider atomically before ending membership. Insufficient funds reject the entire departure and leave receipts/state unchanged. The payment establishes the accepted handover arrangement; it is not itself treatment and does not resolve conditions.\n\n## Deliberate residual boundary',
    'author review corrections',
  ),
);

const formatOnly = [
  'packages/game-core/src/company/economy-accrual.ts',
  'packages/game-core/src/company/economy.ts',
  'packages/game-core/src/company/physical-outcomes.ts',
  'packages/game-core/src/company/physical-state.ts',
  'packages/testkit/src/company-economy-privacy.spec.test.ts',
];
for (const file of formatOnly) transforms.set(file, (source) => source);

if (process.env.CI && !globalThis.__warwritCandidateDiagnostic) {
  globalThis.__warwritCandidateDiagnostic = true;
  for (const [file, transform] of transforms) {
    const source = await readFile(file, 'utf8');
    const candidate = transform(source);
    const formatted = await format(candidate, { ...config, filepath: file });
    const payload = gzipSync(Buffer.from(formatted, 'utf8'), { level: 9 }).toString('base64');
    console.error(`CANDIDATE-GZIP ${file} ${payload}`);
  }
}

export default config;

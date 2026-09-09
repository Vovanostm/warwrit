import { readFile, readdir, writeFile } from 'node:fs/promises';

function replaceOnce(source, from, to, label) {
  const first = source.indexOf(from);
  if (first < 0 || source.indexOf(from, first + from.length) >= 0) {
    throw new Error(`replacement mismatch: ${label}`);
  }
  return source.slice(0, first) + to + source.slice(first + from.length);
}

async function edit(path, transform) {
  const source = await readFile(path, 'utf8');
  const next = transform(source);
  if (next !== source) await writeFile(path, next);
}

async function moveRootTypeImports(path) {
  await edit(path, (source) => {
    const moved = [];
    let next = source.replace(
      /import type \{([\s\S]*?)\} from '\.\/physical-types\.js';/g,
      (whole, body) => {
        const names = body.split(',').map((name) => name.trim()).filter(Boolean);
        const keep = names.filter((name) => {
          if (name === 'MaterializedCompanyState' || name === 'PhysicalChange') {
            moved.push(name);
            return false;
          }
          return true;
        });
        if (keep.length === names.length) return whole;
        if (keep.length === 0) return '';
        return `import type {\n  ${keep.join(',\n  ')},\n} from './physical-types.js';`;
      },
    );
    if (moved.length === 0) return next;
    const unique = [...new Set(moved)];
    const statement = `import type { ${unique.join(', ')} } from './physical-root-types.js';\n`;
    const lastImport = [...next.matchAll(/^import .*;$/gm)].at(-1);
    if (!lastImport) throw new Error(`no import insertion point: ${path}`);
    const at = lastImport.index + lastImport[0].length + 1;
    return next.slice(0, at) + statement + next.slice(at);
  });
}

const directory = 'packages/game-core/src/company';
for (const name of await readdir(directory)) {
  if (!name.endsWith('.ts') || name === 'physical-types.ts' || name === 'physical-root-types.ts') continue;
  await moveRootTypeImports(`${directory}/${name}`);
}

await edit(`${directory}/index.ts`, (source) =>
  source.includes("export type * from './physical-root-types.js';")
    ? source
    : source.replace(
        "export type * from './physical-types.js';",
        "export type * from './physical-types.js';\nexport type * from './physical-root-types.js';",
      ),
);

await edit(`${directory}/economy-types.ts`, (source) =>
  source.includes("| 'CARE_HANDOVER'")
    ? source
    : replaceOnce(source, "    | 'CARE'\n    | 'FOOD'", "    | 'CARE'\n    | 'CARE_HANDOVER'\n    | 'FOOD'", 'cash purpose'),
);

await edit(`${directory}/physical-payments.ts`, (source) =>
  source.replace("'CARE' | 'FOOD' | 'REPAIR'", "'CARE' | 'CARE_HANDOVER' | 'FOOD' | 'REPAIR'"),
);

await edit(`${directory}/physical-state.ts`, (source) =>
  source.replace(
    'const allowed = new Set(characters.map((character) => character.identity.characterId));',
    'const allowed = new Set<string>(characters.map((character) => character.identity.characterId));',
  ),
);

await edit(`${directory}/physical-items.ts`, (source) => {
  if (!source.includes('authorization.quantity === item.quantity')) {
    source = replaceOnce(
      source,
      '      authorization.itemId === item.itemId,',
      '      authorization.itemId === item.itemId &&\n      authorization.quantity === item.quantity,',
      'owner quantity',
    );
    source = replaceOnce(
      source,
      "    fact.itemId === item.itemId &&\n      canonicalJson(fact.fromOwner) === canonicalJson(item.owner) &&",
      "    fact.itemId === item.itemId &&\n      Number.isSafeInteger(fact.quantity) &&\n      fact.quantity > 0 &&\n      canonicalJson(fact.fromOwner) === canonicalJson(item.owner) &&",
      'authorization quantity validation',
    );
    source = replaceOnce(
      source,
      "  const authorization = ownershipAuthorization(context, p.ownershipReceiptId, item);\n  let physical = splitOrMove(",
      "  const authorization = ownershipAuthorization(context, p.ownershipReceiptId, item);\n  requirePhysical(!authorization || authorization.quantity === p.quantity, 'INVALID_SOURCE');\n  let physical = splitOrMove(",
      'transfer quantity binding',
    );
    source = replaceOnce(
      source,
      "      itemId: entry.itemId,\n      fromOwner: item.owner,",
      "      itemId: entry.itemId,\n      quantity: entry.quantity,\n      fromOwner: item.owner,",
      'loot owner quantity',
    );
  }
  return source;
});

await edit(`${directory}/physical-care.ts`, (source) => {
  if (source.includes("purpose: 'CARE_HANDOVER'")) return source;
  return replaceOnce(
    source,
    `export function settleCareHandover(\n  root: MaterializedCompanyState,\n  requirement: Extract<EconomyRequirement, { kind: 'CARE_HANDOVER' }>,\n  context: EconomyContext,\n  explicitId?: string,\n): CompanyPhysicalState {\n  const fact = explicitId\n    ? physicalFact(context, explicitId, 'CARE_HANDOVER')\n    : uniquePhysicalFact(\n        context,\n        'CARE_HANDOVER',\n        (candidate) =>\n          candidate.characterId === requirement.characterId &&\n          candidate.receiverId === requirement.receiverId &&\n          candidate.atTick === requirement.atTick,\n      );\n  requirePhysical(\n    fact.characterId === requirement.characterId &&\n      fact.receiverId === requirement.receiverId &&\n      fact.atTick === requirement.atTick,\n    'INVALID_SOURCE',\n  );\n  providerAt(root, fact.receiverId, fact.characterId);\n  const subject = person(root.lifecycle, fact.characterId);\n  requirePhysical(\n    subject.presence.location.kind === 'AT' &&\n      sameLocation(subject.presence.location, fact.location),\n    'CONTACT_OR_ACCESS_REQUIRED',\n  );\n  const recorded = recordPhysicalSource(root.physical, fact);\n  requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');\n  return {\n    ...recorded.state,\n    careHandovers: [\n      ...recorded.state.careHandovers,\n      {\n        sourceId: fact.sourceEventId,\n        characterId: fact.characterId,\n        receiverId: fact.receiverId,\n        atTick: fact.atTick,\n      },\n    ],\n  };\n}`,
    `export function settleCareHandover(\n  root: MaterializedCompanyState,\n  requirement: Extract<EconomyRequirement, { kind: 'CARE_HANDOVER' }>,\n  context: EconomyContext,\n  explicitId?: string,\n): { readonly finance: CompanyFinance; readonly physical: CompanyPhysicalState } {\n  const fact = explicitId\n    ? physicalFact(context, explicitId, 'CARE_HANDOVER')\n    : uniquePhysicalFact(\n        context,\n        'CARE_HANDOVER',\n        (candidate) =>\n          candidate.characterId === requirement.characterId &&\n          candidate.receiverId === requirement.receiverId &&\n          candidate.atTick === requirement.atTick,\n      );\n  requirePhysical(\n    fact.handoverId === fact.id &&\n      (!explicitId || fact.handoverId === explicitId) &&\n      fact.characterId === requirement.characterId &&\n      fact.receiverId === requirement.receiverId &&\n      fact.atTick === requirement.atTick,\n    'INVALID_SOURCE',\n  );\n  providerAt(root, fact.receiverId, fact.characterId);\n  const subject = person(root.lifecycle, fact.characterId);\n  requirePhysical(\n    subject.presence.location.kind === 'AT' &&\n      sameLocation(subject.presence.location, fact.location),\n    'CONTACT_OR_ACCESS_REQUIRED',\n  );\n  const recorded = recordPhysicalSource(root.physical, fact);\n  requirePhysical(!recorded.replayed, 'IDEMPOTENCY_CONFLICT');\n  const finance = payPhysicalProvider({ ...root, physical: recorded.state }, context, {\n    poolId: fact.poolId,\n    providerWalletId: fact.providerWalletId,\n    moneyAccessEvidenceId: fact.moneyAccessEvidenceId,\n    providerId: fact.receiverId,\n    location: fact.location,\n    amountQ: fact.amountQ,\n    movementId: physicalId(fact.id, fact.characterId, 'care-handover-payment'),\n    purpose: 'CARE_HANDOVER',\n  });\n  const physical = {\n    ...recorded.state,\n    careHandovers: [\n      ...recorded.state.careHandovers,\n      {\n        sourceId: fact.sourceEventId,\n        characterId: fact.characterId,\n        receiverId: fact.receiverId,\n        atTick: fact.atTick,\n      },\n    ],\n  };\n  return { finance, physical };\n}`,
    'funded care handover',
  );
});

await edit(`${directory}/physical.ts`, (source) => {
  if (!source.includes('let finance = root.finance;')) {
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
      '  return { lifecycle, finance: root.finance, physical };',
      '  return { lifecycle, finance, physical };',
      'departure finance return',
    );
    source = replaceOnce(
      source,
      "      case 'CARE_HANDOVER':\n        next = { ...next, physical: settleCareHandover(next, requirement, context) };\n        break;",
      "      case 'CARE_HANDOVER': {\n        const fulfilled = settleCareHandover(next, requirement, context);\n        next = { ...next, finance: fulfilled.finance, physical: fulfilled.physical };\n        break;\n      }",
      'requirement handover result',
    );
  }
  const oldReconcile = `export function reconcileClosedFoodRequirements(\n  root: MaterializedCompanyState,\n  requirements: readonly EconomyRequirement[],\n): readonly EconomyRequirement[] {\n  return requirements.flatMap((requirement) => {\n    if (requirement.kind !== 'FOOD_CONSUMPTION') return [requirement];\n    const from = BigInt(requirement.fromTick);\n    const to = BigInt(requirement.toTick);\n    const row = root.finance.food.find(\n      (entry) => entry.membershipId === requirement.membershipId,\n    );\n    if (!row) return [];\n    return row.intervals.flatMap((interval) => {\n      if (interval.agreementId !== null) return [];\n      const start = BigInt(interval.fromTick) > from ? BigInt(interval.fromTick) : from;\n      const end = BigInt(interval.toTick) < to ? BigInt(interval.toTick) : to;\n      if (end <= start) return [];\n      return [\n        {\n          kind: 'FOOD_CONSUMPTION' as const,\n          membershipId: requirement.membershipId,\n          fromTick: campaignTick(start.toString()),\n          toTick: campaignTick(end.toString()),\n          tickUnits: (\n            (end - start) * BigInt(COMPANY_RULES.economy.foodUnitsPerPersonDay)\n          ).toString(),\n        },\n      ];\n    });\n  });\n}`;
  if (source.includes(oldReconcile)) {
    source = source.replace(
      oldReconcile,
      `export function reconcileClosedFoodRequirements(\n  root: MaterializedCompanyState,\n  requirements: readonly EconomyRequirement[],\n): readonly EconomyRequirement[] {\n  const result: EconomyRequirement[] = [];\n  for (const requirement of requirements) {\n    if (requirement.kind !== 'FOOD_CONSUMPTION') {\n      result.push(requirement);\n      continue;\n    }\n    const from = BigInt(requirement.fromTick);\n    const to = BigInt(requirement.toTick);\n    const row = root.finance.food.find(\n      (entry) => entry.membershipId === requirement.membershipId,\n    );\n    if (!row) continue;\n    for (const interval of row.intervals) {\n      if (interval.agreementId !== null) continue;\n      const start = BigInt(interval.fromTick) > from ? BigInt(interval.fromTick) : from;\n      const end = BigInt(interval.toTick) < to ? BigInt(interval.toTick) : to;\n      if (end <= start) continue;\n      result.push({\n        kind: 'FOOD_CONSUMPTION',\n        membershipId: requirement.membershipId,\n        fromTick: campaignTick(start.toString()),\n        toTick: campaignTick(end.toString()),\n        tickUnits: ((end - start) * BigInt(COMPANY_RULES.economy.foodUnitsPerPersonDay)).toString(),\n      });\n    }\n  }\n  return result;\n}`,
    );
  }
  return source;
});

await edit(`${directory}/physical-outcomes.ts`, (source) =>
  source
    .replace('sameLocation(destination.location, p.locationRef)', 'sameLocation(destination.location, fact.location)')
    .replace("movePresence(root.lifecycle, p.characterId, 'CAPTIVE', p.locationRef)", "movePresence(root.lifecycle, p.characterId, 'CAPTIVE', fact.location)")
    .replace("movePresence(root.lifecycle, p.characterId, 'AVAILABLE', p.locationRef)", "movePresence(root.lifecycle, p.characterId, 'AVAILABLE', fact.location)")
    .replace("movePresence(root.lifecycle, p.characterId, 'CAPTIVE', p.locationRef)", "movePresence(root.lifecycle, p.characterId, 'CAPTIVE', fact.location)"),
);

await edit('packages/testkit/src/company-economy-fixture.ts', (source) => {
  if (source.includes("walletId: 'wallet-provider'")) return source;
  return replaceOnce(
    source,
    `      ...ids.map((id) => ({\n        walletId: \`wallet-\${id}\`,\n        owner: { kind: 'CHARACTER' as const, id },\n        location: place,\n        cashQ: cash(0),\n      })),\n    ],`,
    `      ...ids.map((id) => ({\n        walletId: \`wallet-\${id}\`,\n        owner: { kind: 'CHARACTER' as const, id },\n        location: place,\n        cashQ: cash(0),\n      })),\n      {\n        walletId: 'wallet-provider',\n        owner: { kind: 'CHARACTER' as const, id: 'provider' },\n        location: place,\n        cashQ: cash(0),\n      },\n    ],`,
    'provider wallet fixture',
  );
});

await edit('packages/testkit/src/company-physical.spec.test.ts', (source) => {
  if (!source.includes('mismatchedGift')) {
    source = replaceOnce(source, "  advance,\n  command,", "  access,\n  advance,\n  cash,\n  command,", 'test imports');
    source = replaceOnce(source, "      accessEvidenceId: 'transfer-access-ok',\n    });", "      accessEvidenceId: 'transfer-access-ok',\n      ownershipReceiptId: 'gift-auth',\n    });", 'gift payload');
    source = replaceOnce(
      source,
      `    const moved = prepared(\n      prepareCompanyEconomy(\n        state,\n        movedCommand,\n        context(state, movedCommand, [], [], [movedAccess]),\n      ),\n    );`,
      `    const mismatchedGift: PhysicalEvidence = {\n      ...physicalScope(state, 'gift-auth'),\n      kind: 'OWNERSHIP_AUTHORIZATION',\n      itemId: 'ration-stack',\n      quantity: 2,\n      fromOwner: { kind: 'COMPANY', id: 'company' },\n      toOwner: { kind: 'CHARACTER', id: 'leader' },\n      operation: 'GIFT',\n    };\n    const mismatched = prepareCompanyEconomy(\n      state,\n      movedCommand,\n      context(state, movedCommand, [], [], [movedAccess, mismatchedGift]),\n    );\n    expect(mismatched).toMatchObject({ kind: 'REJECTED', error: 'INVALID_SOURCE' });\n    expect(mismatched.state).toBe(state);\n    const matchingGift: PhysicalEvidence = { ...mismatchedGift, quantity: 1 };\n    const moved = prepared(\n      prepareCompanyEconomy(\n        state,\n        movedCommand,\n        context(state, movedCommand, [], [], [movedAccess, matchingGift]),\n      ),\n    );`,
      'quantity gift regression',
    );
    source = replaceOnce(
      source,
      `    expect(new Set(live.map((entry) => canonicalJson(entry.owner)))).toEqual(\n      new Set([canonicalJson({ kind: 'COMPANY', id: 'company' })]),\n    );\n    const child = live.find((entry) => entry.containerId === 'destination')!;\n    expect(child.quantity).toBe(1);`,
      `    expect(new Set(live.map((entry) => canonicalJson(entry.owner)))).toEqual(\n      new Set([\n        canonicalJson({ kind: 'COMPANY', id: 'company' }),\n        canonicalJson({ kind: 'CHARACTER', id: 'leader' }),\n      ]),\n    );\n    const child = live.find((entry) => entry.containerId === 'destination')!;\n    expect(child.quantity).toBe(1);\n    expect(child.owner).toEqual({ kind: 'CHARACTER', id: 'leader' });`,
      'gift assertions',
    );
    source = replaceOnce(source, "    let immobile = withMedicineProvider(economy([1n], 0n, 0));", "    let immobile = withMedicineProvider(economy([1n], 10n, 0));", 'funded handover fixture');
    source = replaceOnce(
      source,
      `      receiverId: 'provider',\n      location: place,\n    };\n    const handed = prepared(\n      prepareCompanyEconomy(\n        immobile,\n        withHandover,\n        context(immobile, withHandover, [], [], [handover]),\n      ),\n    ).next;`,
      `      receiverId: 'provider',\n      location: place,\n      poolId: 'local',\n      providerWalletId: 'wallet-provider',\n      moneyAccessEvidenceId: 'money-access',\n      amountQ: cash(1),\n    };\n    const underfunded: PhysicalEvidence = { ...handover, amountQ: cash(11) };\n    const fundingFailure = prepareCompanyEconomy(\n      immobile,\n      withHandover,\n      context(immobile, withHandover, [access(immobile)], [], [underfunded]),\n    );\n    expect(fundingFailure).toMatchObject({ kind: 'REJECTED', error: 'INSUFFICIENT_FUNDS' });\n    expect(fundingFailure.state).toBe(immobile);\n    const handed = prepared(\n      prepareCompanyEconomy(\n        immobile,\n        withHandover,\n        context(immobile, withHandover, [access(immobile)], [], [handover]),\n      ),\n    ).next;`,
      'funded handover regression',
    );
    source = replaceOnce(
      source,
      `    expect(handed.physical!.careHandovers.at(-1)).toMatchObject({ characterId: 'worker-0', receiverId: 'provider' });`,
      `    expect(handed.physical!.careHandovers.at(-1)).toMatchObject({\n      characterId: 'worker-0',\n      receiverId: 'provider',\n    });\n    expect(handed.finance.wallets.find((wallet) => wallet.walletId === 'purse')?.cashQ).toBe('9');\n    expect(handed.finance.wallets.find((wallet) => wallet.walletId === 'wallet-provider')?.cashQ).toBe('1');`,
      'handover assertions',
    );
  }
  return source;
});

console.log('wp024-normalize: applied');

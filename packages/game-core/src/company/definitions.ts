import {
  array,
  bool,
  choice,
  freezeRegistry,
  id,
  snapshotJson,
  natural,
  object,
  optional,
  unsigned,
} from './input.js';
import type { ValueOf } from './input.js';
import { COMPANY_CATALOGUE_VERSION, COMPANY_RULESET_ID } from './model.js';

export const EQUIPMENT_SLOTS = Object.freeze([
  'HEAD',
  'BODY',
  'MAIN_HAND',
  'OFF_HAND',
  'BELT',
] as const);
const effect = object({
  attribute: choice(
    'accuracy',
    'initiative',
    'defense',
    'maxStamina',
    'careRecoveryBps',
    'careCostBps',
    'studyDurationBps',
    'trainingCostBps',
    'startingMorale',
    'trainingDurationBps',
  ),
  value: natural(-10000, 20000),
});
const skill = object({ id, enabled: bool });
const perk = object({
  id,
  skillId: id,
  milestone: choice(25, 60),
  option: choice('a', 'b'),
  effect,
});
const item = object({
  id,
  kind: choice('weapon', 'shield', 'armor', 'consumable', 'book', 'permission'),
  weightG: natural(),
  stackMax: natural(1),
  enabled: bool,
  slot: optional(choice(...EQUIPMENT_SLOTS)),
  hands: optional(choice(1, 2)),
  skillId: optional(id),
  weaponProfile: optional(choice('sword-shield', 'spear', 'great-weapon', 'bow', 'raider')),
  requiresOffHand: optional(id),
  maxArmor: optional(natural()),
  workId: optional(id),
  foodUnits: optional(natural(1)),
  repairArmorPoints: optional(natural(1)),
  careIds: optional(array(id, 1, 3, true)),
});
const work = object({
  id,
  version: natural(1),
  sectionId: id,
  durationTicks: unsigned,
  skillId: id,
  finiteXp: natural(),
  requiresLevel: natural(0, 100),
  factId: id,
});
const method = object({
  id,
  enabled: bool,
  target: id,
  xp: optional(natural()),
  interval: choice('EVENT', 'CAMPAIGN_DAY', 'FINITE_SECTION'),
});
const care = object({ id, enabled: bool, permitItemId: optional(id) });
const condition = object({
  id,
  category: choice('REST_RECOVERABLE', 'TREATMENT_REQUIRED_STABLE', 'CRITICAL', 'PERMANENT'),
  recoveryTicks: optional(unsigned),
  deadlineTicks: optional(unsigned),
  careId: optional(id),
  initiative: natural(-100, 100),
  accuracy: natural(-100, 100),
  deniedCapabilities: array(
    choice('travel', 'basicWork', 'localDuty', 'lead', 'study'),
    0,
    5,
    true,
  ),
});
const body = object({
  id,
  slots: array(choice(...EQUIPMENT_SLOTS), 1, 5, true),
  beltSlots: natural(1),
  capacityG: natural(1),
});
const species = object({ id, enabled: bool, bodyId: id, adultAtDays: natural(1) });
const origin = object({
  id,
  contactRespect: natural(0, 100),
  contactRivalry: natural(0, 100),
  cashCrowns: natural(),
  skillId: id,
  skillBonus: natural(),
  debtCrowns: natural(),
  hookId: id,
  familyStoryIds: array(id, 1, 3, true),
});
const family = object({ id, relativeCount: natural(0, 2), ageDays: optional(natural()) });
const candidateTemplate = object({
  id,
  skills: array(object({ skillId: id, level: natural(0, 100) }), 1),
  gearIds: array(id, 1, 6, true),
});
const openingProfile = object({
  id,
  leaderBaseLevel: natural(0, 100),
  defaultAptitudeBps: natural(1),
  candidateAgeMinDays: natural(1),
  candidateAgeMaxDays: natural(1),
  variation: natural(),
  signingCrowns: natural(),
  dailyWageMilli: unsigned,
  leaderGearIds: array(id, 1, 6, true),
  sharedItems: array(object({ definitionId: id, quantity: natural(1) })),
});
const catalogueSections = {
  skills: array(skill, 1),
  perks: array(perk),
  items: array(item),
  works: array(work),
  methods: array(method),
  cares: array(care),
  conditions: array(condition),
  bodies: array(body),
  species: array(species),
  origins: array(origin),
  familyStories: array(family),
  candidateTemplates: array(candidateTemplate),
  openingProfiles: array(openingProfile),
};
export const catalogueInput = freezeRegistry(
  object({
    schemaVersion: choice(1),
    version: id,
    rulesetId: id,
    productionBalanceApproved: choice(false),
    ...catalogueSections,
  }),
);
export type CompanyCatalogue = ValueOf<typeof catalogueInput>;
export type CatalogueSection = keyof typeof catalogueSections;
export const CATALOGUE_SECTIONS = Object.freeze(
  Object.keys(catalogueSections) as CatalogueSection[],
);

const skillIds = [
  'blades',
  'polearms',
  'heavy',
  'archery',
  'defense',
  'medicine',
  'scholarship',
  'leadership',
] as const;
const perkEffects = {
  blades: ['accuracy', 'initiative', 3, 5, 3, 5],
  polearms: ['accuracy', 'defense', 3, 5, 3, 5],
  heavy: ['accuracy', 'maxStamina', 3, 5, 5, 7],
  archery: ['accuracy', 'initiative', 3, 5, 3, 5],
  defense: ['defense', 'maxStamina', 3, 5, 5, 7],
  medicine: ['careRecoveryBps', 'careCostBps', 11000, 12000, 9000, 8000],
  scholarship: ['studyDurationBps', 'trainingCostBps', 9000, 8000, 9000, 8000],
  leadership: ['startingMorale', 'trainingDurationBps', 3, 5, 9000, 8000],
} as const;
const familyIds = ['no-present-kin', 'adult-sibling-home', 'younger-sibling-home'];

/** Finite data reconstructed from reci8qK8KmIhPzasI, with recuq6OOuKnmc1yJL D09. */
export const COMPANY_CATALOGUE: CompanyCatalogue = freezeRegistry({
  schemaVersion: 1,
  version: COMPANY_CATALOGUE_VERSION,
  rulesetId: COMPANY_RULESET_ID,
  productionBalanceApproved: false,
  skills: [
    ...skillIds.map((id) => ({ id, enabled: true })),
    { id: 'alchemy-test', enabled: false },
  ],
  perks: skillIds.flatMap((skillId) =>
    ([25, 60] as const).flatMap((milestone) => {
      const [a, b, a25, a60, b25, b60] = perkEffects[skillId];
      return (
        [
          { option: 'a', attribute: a, value: milestone === 25 ? a25 : a60 },
          { option: 'b', attribute: b, value: milestone === 25 ? b25 : b60 },
        ] as const
      ).map(({ option, attribute, value }) => ({
        id: `${skillId}-${milestone}-${option}`,
        skillId,
        milestone,
        option,
        effect: { attribute, value },
      }));
    }),
  ),
  items: (
    [
      {
        id: 'sword',
        kind: 'weapon',
        weightG: 1600,
        slot: 'MAIN_HAND',
        hands: 1,
        skillId: 'blades',
        weaponProfile: 'sword-shield',
        requiresOffHand: 'shield',
      },
      { id: 'shield', kind: 'shield', weightG: 3500, slot: 'OFF_HAND' },
      {
        id: 'spear',
        kind: 'weapon',
        weightG: 2600,
        slot: 'MAIN_HAND',
        hands: 2,
        skillId: 'polearms',
        weaponProfile: 'spear',
      },
      {
        id: 'great-weapon',
        kind: 'weapon',
        weightG: 3800,
        slot: 'MAIN_HAND',
        hands: 2,
        skillId: 'heavy',
        weaponProfile: 'great-weapon',
      },
      {
        id: 'bow',
        kind: 'weapon',
        weightG: 1500,
        slot: 'MAIN_HAND',
        hands: 2,
        skillId: 'archery',
        weaponProfile: 'bow',
      },
      {
        id: 'raider-weapon',
        kind: 'weapon',
        weightG: 1500,
        slot: 'MAIN_HAND',
        hands: 1,
        skillId: 'blades',
        weaponProfile: 'raider',
      },
      {
        id: 'simple-helmet',
        kind: 'armor',
        weightG: 2000,
        slot: 'HEAD',
        maxArmor: 20,
      },
      {
        id: 'padded-coat',
        kind: 'armor',
        weightG: 5000,
        slot: 'BODY',
        maxArmor: 40,
      },
      { id: 'ration', kind: 'consumable', weightG: 500, stackMax: 100, foodUnits: 1 },
      {
        id: 'medical-unit',
        kind: 'consumable',
        weightG: 200,
        stackMax: 100,
        careIds: ['stabilize', 'wound-care'],
      },
      {
        id: 'repair-unit',
        kind: 'consumable',
        weightG: 250,
        stackMax: 100,
        repairArmorPoints: 5,
      },
      {
        id: 'study-book-medicine',
        kind: 'book',
        weightG: 800,
        workId: 'wound-care-basics',
      },
      {
        id: 'study-book-command',
        kind: 'book',
        weightG: 800,
        workId: 'small-unit-service',
      },
      {
        id: 'study-book-knowledge',
        kind: 'book',
        weightG: 800,
        workId: 'local-knowledge',
      },
      { id: 'rare-treatment-token', kind: 'permission', weightG: 0, enabled: false },
    ] as const
  ).map((item) => ({ stackMax: 1, enabled: true, ...item })),
  works: (
    [
      {
        id: 'wound-care-basics',
        sectionId: 'wound-care-basics-1',
        skillId: 'medicine',
        factId: 'care-method-known',
      },
      {
        id: 'small-unit-service',
        sectionId: 'small-unit-service-1',
        skillId: 'leadership',
        factId: 'watch-organization-known',
      },
      {
        id: 'local-knowledge',
        sectionId: 'local-knowledge-1',
        skillId: 'scholarship',
        factId: 'local-geography-known',
      },
    ] as const
  ).map((work) => ({
    version: 1,
    durationTicks: '1000',
    finiteXp: 100,
    requiresLevel: 0,
    ...work,
  })),
  methods: [
    { id: 'weapon-attack', enabled: true, target: 'mapped-weapon', xp: 20, interval: 'EVENT' },
    { id: 'guard-interaction', enabled: true, target: 'defense', xp: 10, interval: 'EVENT' },
    { id: 'care-provided', enabled: true, target: 'medicine', xp: 40, interval: 'EVENT' },
    { id: 'command-cycle', enabled: true, target: 'leadership', xp: 10, interval: 'EVENT' },
    {
      id: 'funded-practice',
      enabled: true,
      target: 'task-skill',
      xp: 100,
      interval: 'CAMPAIGN_DAY',
    },
    { id: 'book-study', enabled: true, target: 'work-section', interval: 'FINITE_SECTION' },
    { id: 'brew-test-only', enabled: false, target: 'alchemy-test', xp: 30, interval: 'EVENT' },
  ],
  cares: [
    { id: 'wound-care', enabled: true },
    { id: 'stabilize', enabled: true },
    { id: 'exceptional-care', enabled: false, permitItemId: 'rare-treatment-token' },
  ],
  conditions: [
    {
      id: 'minor-field-wound',
      category: 'REST_RECOVERABLE',
      recoveryTicks: '50',
      initiative: -2,
      accuracy: 0,
      deniedCapabilities: [],
    },
    {
      id: 'severe-stable-wound',
      category: 'TREATMENT_REQUIRED_STABLE',
      recoveryTicks: '250',
      careId: 'wound-care',
      initiative: -4,
      accuracy: -4,
      deniedCapabilities: ['localDuty'],
    },
    {
      id: 'critical-bleed',
      category: 'CRITICAL',
      deadlineTicks: '250',
      careId: 'stabilize',
      initiative: 0,
      accuracy: 0,
      deniedCapabilities: ['travel', 'basicWork', 'localDuty', 'lead', 'study'],
    },
    {
      id: 'old-impairment',
      category: 'PERMANENT',
      careId: 'exceptional-care',
      initiative: -3,
      accuracy: 0,
      deniedCapabilities: [],
    },
  ],
  bodies: [{ id: 'humanoid', slots: [...EQUIPMENT_SLOTS], beltSlots: 2, capacityG: 30000 }],
  species: [
    { id: 'human', enabled: true, bodyId: 'humanoid', adultAtDays: 6570 },
    { id: 'fixture-other-species', enabled: false, bodyId: 'humanoid', adultAtDays: 7300 },
  ],
  origins: [
    {
      id: 'broken-company',
      contactRespect: 5,
      contactRivalry: 0,
      cashCrowns: 900,
      skillId: 'blades',
      skillBonus: 2,
      debtCrowns: 0,
      hookId: 'lost-standard',
      familyStoryIds: familyIds,
    },
    {
      id: 'disgraced-banner',
      contactRespect: 0,
      contactRivalry: 10,
      cashCrowns: 1000,
      skillId: 'leadership',
      skillBonus: 2,
      debtCrowns: 0,
      hookId: 'restore-name',
      familyStoryIds: familyIds,
    },
    {
      id: 'community-debt',
      contactRespect: 5,
      contactRivalry: 0,
      cashCrowns: 1200,
      skillId: 'defense',
      skillBonus: 2,
      debtCrowns: 200,
      hookId: 'community-obligation',
      familyStoryIds: familyIds,
    },
    {
      id: 'escaped-captive',
      contactRespect: 5,
      contactRivalry: 0,
      cashCrowns: 700,
      skillId: 'defense',
      skillBonus: 3,
      debtCrowns: 0,
      hookId: 'trace-of-captors',
      familyStoryIds: familyIds,
    },
    {
      id: 'hunter-apprentice',
      contactRespect: 5,
      contactRivalry: 0,
      cashCrowns: 900,
      skillId: 'archery',
      skillBonus: 3,
      debtCrowns: 0,
      hookId: 'first-tracking-job',
      familyStoryIds: familyIds,
    },
    {
      id: 'ruined-caravan',
      contactRespect: 5,
      contactRivalry: 0,
      cashCrowns: 1100,
      skillId: 'scholarship',
      skillBonus: 2,
      debtCrowns: 100,
      hookId: 'recover-cargo',
      familyStoryIds: familyIds,
    },
  ],
  candidateTemplates: [
    {
      id: 'front',
      skills: [
        { skillId: 'blades', level: 5 },
        { skillId: 'defense', level: 5 },
      ],
      gearIds: ['sword', 'shield', 'padded-coat'],
    },
    {
      id: 'reach',
      skills: [
        { skillId: 'polearms', level: 5 },
        { skillId: 'defense', level: 3 },
      ],
      gearIds: ['spear', 'padded-coat'],
    },
    {
      id: 'support',
      skills: [
        { skillId: 'medicine', level: 5 },
        { skillId: 'blades', level: 3 },
      ],
      gearIds: ['raider-weapon', 'padded-coat'],
    },
  ],
  openingProfiles: [
    {
      id: 'm1-company-start',
      leaderBaseLevel: 3,
      defaultAptitudeBps: 10000,
      candidateAgeMinDays: 6570,
      candidateAgeMaxDays: 16425,
      variation: 2,
      signingCrowns: 50,
      dailyWageMilli: '10000',
      leaderGearIds: ['sword', 'shield', 'simple-helmet', 'padded-coat'],
      sharedItems: [
        { definitionId: 'ration', quantity: 6 },
        { definitionId: 'medical-unit', quantity: 2 },
        { definitionId: 'repair-unit', quantity: 2 },
      ],
    },
  ],
  familyStories: [
    { id: 'no-present-kin', relativeCount: 0 },
    { id: 'adult-sibling-home', relativeCount: 1, ageDays: 8030 },
    { id: 'younger-sibling-home', relativeCount: 1, ageDays: 5475 },
  ],
});
export const COMPANY_RULES = freezeRegistry({
  id: COMPANY_RULESET_ID,
  productionBalanceApproved: false,
  ticksPerDay: '1000',
  daysPerYear: 365,
  moneyQPerCrown: '1000000',
  maxSkillLevel: 100,
  perkMilestones: [25, 60],
  partyHardMax: 6,
  leadershipBands: [
    { level: 0, capacity: 3 },
    { level: 25, capacity: 4 },
    { level: 50, capacity: 5 },
    { level: 75, capacity: 6 },
  ],
  overflowPenalty: { perExcess: 5, maximum: 15 },
  successionStandingRetentionBps: 8000,
  maxF1Groups: 1,
  restHealthTicks: '100',
  restStaminaTicks: '10',
  farewellMaxDays: 7,
  economy: {
    version: 's02-economy-parameters-1',
    baseDailyWageMilli: '10000',
    qualificationBands: [
      { level: 0, multiplierBps: 10000 },
      { level: 25, multiplierBps: 12500 },
      { level: 50, multiplierBps: 15000 },
      { level: 75, multiplierBps: 20000 },
    ],
    warningAfterTicks: '2000',
    warningBaseWindowTicks: '2000',
    warningMinimumWindowTicks: '1000',
    warningMaximumWindowTicks: '3000',
    warningRelationThreshold: 40,
    warningRelationAdjustmentTicks: '1000',
    significantServiceTicks: '30000',
    significantFriendship: 40,
    farewellServiceDaysPerExtraDay: 30,
    foodUnitsPerPersonDay: 1,
  },
  heirBypass: { respectDelta: -6, rivalryDelta: 8, respectAtMost: 20, rivalryAtLeast: 60 },
});

export function catalogueHas(
  catalogue: CompanyCatalogue,
  section: CatalogueSection,
  key: string,
  enabledOnly = true,
): boolean {
  return catalogue[section].some(
    (entry) => entry.id === key && (!enabledOnly || !('enabled' in entry) || entry.enabled),
  );
}
/** Validates structural references, not playability, world facts, or learned prerequisites. */
export function validateCompanyCatalogue(input: unknown): readonly string[] {
  const value = snapshotJson(input);
  if (!catalogueInput.read(value)) return ['INVALID_CATALOGUE_SHAPE'];
  const errors: string[] = [];
  if (value.version !== COMPANY_CATALOGUE_VERSION || value.rulesetId !== COMPANY_RULESET_ID)
    errors.push('UNSUPPORTED_CATALOGUE_VERSION');
  for (const section of CATALOGUE_SECTIONS) {
    if (new Set(value[section].map((entry) => entry.id)).size !== value[section].length)
      errors.push(`DUPLICATE_ID:${section}`);
  }
  const ref = (section: CatalogueSection, key: string, owner: string, enabled = false): void => {
    if (!catalogueHas(value, section, key, enabled))
      errors.push(`BROKEN_REFERENCE:${owner}:${section}:${key}`);
  };
  for (const entry of value.perks) ref('skills', entry.skillId, entry.id, true);
  const choices = new Set<string>();
  for (const entry of value.perks) {
    const slot = `${entry.skillId}:${entry.milestone}:${entry.option}`;
    if (choices.has(slot)) errors.push(`DUPLICATE_PERK_CHOICE:${slot}`);
    choices.add(slot);
  }
  for (const entry of value.items) {
    if (entry.skillId) ref('skills', entry.skillId, entry.id, entry.enabled);
    if (entry.workId) ref('works', entry.workId, entry.id);
    if (entry.requiresOffHand) ref('items', entry.requiresOffHand, entry.id, entry.enabled);
    for (const careId of entry.careIds ?? []) ref('cares', careId, entry.id);
    if (entry.kind !== 'consumable' && entry.stackMax !== 1)
      errors.push(`NONSTACKABLE:${entry.id}`);
    if (entry.kind === 'book' && !entry.workId) errors.push(`BOOK_WITHOUT_WORK:${entry.id}`);
    if (
      entry.kind === 'weapon' &&
      (!entry.weaponProfile || !entry.skillId || !entry.hands || entry.slot !== 'MAIN_HAND')
    )
      errors.push(`INVALID_WEAPON:${entry.id}`);
    if (entry.kind === 'shield' && entry.slot !== 'OFF_HAND')
      errors.push(`INVALID_SHIELD:${entry.id}`);
    if (
      entry.kind === 'armor' &&
      (entry.maxArmor === undefined || (entry.slot !== 'HEAD' && entry.slot !== 'BODY'))
    )
      errors.push(`INVALID_ARMOR:${entry.id}`);
  }
  for (const entry of value.works) {
    ref('skills', entry.skillId, entry.id, true);
    if (BigInt(entry.durationTicks) === 0n) errors.push(`ZERO_STUDY_DURATION:${entry.id}`);
  }
  for (const entry of value.familyStories) {
    if (entry.relativeCount > 0 !== (entry.ageDays !== undefined))
      errors.push(`INVALID_FAMILY_AGE:${entry.id}`);
  }
  for (const entry of value.species) ref('bodies', entry.bodyId, entry.id);
  for (const entry of value.conditions) {
    if (entry.careId) ref('cares', entry.careId, entry.id);
    if ((entry.category === 'CRITICAL') !== (entry.deadlineTicks !== undefined))
      errors.push(`INVALID_DEADLINE:${entry.id}`);
    if (['CRITICAL', 'TREATMENT_REQUIRED_STABLE'].includes(entry.category) && !entry.careId)
      errors.push(`MISSING_CARE:${entry.id}`);
    if (
      ['REST_RECOVERABLE', 'TREATMENT_REQUIRED_STABLE'].includes(entry.category) &&
      (!entry.recoveryTicks || BigInt(entry.recoveryTicks) === 0n)
    )
      errors.push(`MISSING_RECOVERY:${entry.id}`);
    if (entry.category === 'PERMANENT' && entry.recoveryTicks !== undefined)
      errors.push(`PERMANENT_RECOVERY:${entry.id}`);
  }
  for (const entry of value.cares)
    if (entry.permitItemId) ref('items', entry.permitItemId, entry.id);
  for (const entry of value.methods)
    if (!['mapped-weapon', 'task-skill', 'work-section'].includes(entry.target))
      ref('skills', entry.target, entry.id, entry.enabled);
  for (const entry of value.origins) {
    ref('skills', entry.skillId, entry.id, true);
    for (const familyId of entry.familyStoryIds) ref('familyStories', familyId, entry.id);
  }
  for (const entry of value.candidateTemplates) {
    for (const grant of entry.skills) ref('skills', grant.skillId, entry.id, true);
    for (const itemId of entry.gearIds) ref('items', itemId, entry.id, true);
    if (new Set(entry.skills.map((s) => s.skillId)).size !== entry.skills.length)
      errors.push(`DUPLICATE_SKILL:${entry.id}`);
  }
  for (const entry of value.openingProfiles) {
    for (const itemId of entry.leaderGearIds) ref('items', itemId, entry.id, true);
    for (const item of entry.sharedItems) ref('items', item.definitionId, entry.id, true);
    if (entry.candidateAgeMaxDays < entry.candidateAgeMinDays)
      errors.push(`INVALID_AGE_RANGE:${entry.id}`);
  }
  return errors;
}

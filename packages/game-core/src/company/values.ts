/** Exact, JSON-safe primitives. Constructors never silently coerce or round input. */
declare const idBrand: unique symbol;
declare const integerBrand: unique symbol;
export type EntityId<K extends string> = string & { readonly [idBrand]: K };
export type ExactInteger<K extends string> = string & { readonly [integerBrand]: K };
export type CompanyId = EntityId<'Company'>;
export type CharacterId = EntityId<'Character'>;
export type WorldId = EntityId<'World'>;
export type MoneyQ = ExactInteger<'MoneyQ'>;
export type CampaignTick = ExactInteger<'CampaignTick'>;
export type BirthTick = ExactInteger<'BirthTick'>;
export type PublicRevision = ExactInteger<'PublicRevision'>;
export type CanonicalRevision = ExactInteger<'CanonicalRevision'>;

// Representation limits, not gameplay caps; version the command boundary if these change.
export const MAX_EXACT_DIGITS = 128;
export const MAX_ID_LENGTH = 256;
export function isEntityId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH &&
    value.trim() === value && [...value].every((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127);
}
export function isExactInteger(value: unknown, signed = false): value is string {
  return typeof value === 'string' && value.length <= MAX_EXACT_DIGITS + (signed ? 1 : 0) &&
    (signed ? /^(?:0|-?[1-9][0-9]*)$/u : /^(?:0|[1-9][0-9]*)$/u).test(value) &&
    value.replace('-', '').length <= MAX_EXACT_DIGITS;
}
export function entityId<K extends string>(value: unknown): EntityId<K> {
  if (!isEntityId(value)) throw new RangeError('Invalid entity ID');
  return value as EntityId<K>;
}
function integer<K extends string>(value: unknown, signed = false): ExactInteger<K> {
  if (!isExactInteger(value, signed)) throw new RangeError('Invalid exact integer');
  return value as ExactInteger<K>;
}
export const moneyQ = (value: unknown): MoneyQ => integer<'MoneyQ'>(value);
export const campaignTick = (value: unknown): CampaignTick => integer<'CampaignTick'>(value);
export const birthTick = (value: unknown): BirthTick => integer<'BirthTick'>(value, true);
export const publicRevision = (value: unknown): PublicRevision => integer<'PublicRevision'>(value);
export const canonicalRevision = (value: unknown): CanonicalRevision => integer<'CanonicalRevision'>(value);
export function addMoney(left: MoneyQ, right: MoneyQ): MoneyQ {
  return moneyQ((BigInt(moneyQ(left)) + BigInt(moneyQ(right))).toString());
}
export function subtractMoney(left: MoneyQ, right: MoneyQ): MoneyQ {
  return moneyQ((BigInt(moneyQ(left)) - BigInt(moneyQ(right))).toString());
}
export function elapsedTicks(from: CampaignTick, to: CampaignTick): CampaignTick {
  return campaignTick((BigInt(campaignTick(to)) - BigInt(campaignTick(from))).toString());
}

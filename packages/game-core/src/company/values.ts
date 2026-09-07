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

// Wire limits are shared with JSON Schema; lengths count Unicode code points.
export const MAX_EXACT_DIGITS = 128;
export const MAX_ID_LENGTH = 256;
export const MAX_TEXT_LENGTH = 4096;
function stringInput(maxLength: number, pattern: string) {
  pattern = `^(?:${pattern})(?![\\s\\S])`;
  const schema = Object.freeze({ type: 'string', minLength: 1, maxLength, pattern });
  const expression = new RegExp(pattern, 'u');
  return Object.freeze({
    schema,
    read: (value: unknown): value is string =>
      typeof value === 'string' && [...value].length <= maxLength && expression.test(value),
  });
}
export const STRING_INPUTS = Object.freeze({
  text: stringInput(MAX_TEXT_LENGTH, '[\\s\\S]+'),
  id: stringInput(MAX_ID_LENGTH, '(?!\\s)(?![\\s\\S]*[\\u0000-\\u001f\\u007f])[\\s\\S]*\\S'),
  unsigned: stringInput(MAX_EXACT_DIGITS, `0|[1-9][0-9]{0,${MAX_EXACT_DIGITS - 1}}`),
  signed: stringInput(MAX_EXACT_DIGITS + 1, `0|-?[1-9][0-9]{0,${MAX_EXACT_DIGITS - 1}}`),
});
export const isEntityId = STRING_INPUTS.id.read;
export function isExactInteger(value: unknown, signed = false): value is string {
  return (signed ? STRING_INPUTS.signed : STRING_INPUTS.unsigned).read(value);
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
export const canonicalRevision = (value: unknown): CanonicalRevision =>
  integer<'CanonicalRevision'>(value);
export function addMoney(left: MoneyQ, right: MoneyQ): MoneyQ {
  return moneyQ((BigInt(moneyQ(left)) + BigInt(moneyQ(right))).toString());
}
export function subtractMoney(left: MoneyQ, right: MoneyQ): MoneyQ {
  return moneyQ((BigInt(moneyQ(left)) - BigInt(moneyQ(right))).toString());
}
export function elapsedTicks(from: CampaignTick, to: CampaignTick): CampaignTick {
  return campaignTick((BigInt(campaignTick(to)) - BigInt(campaignTick(from))).toString());
}

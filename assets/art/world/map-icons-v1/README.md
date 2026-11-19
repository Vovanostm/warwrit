# World-map icons

Code-native SVG interface glyphs for the networked painted-atlas laboratory.
The atlas artwork and all authoritative positions remain unchanged.

The silhouette family reuses Warwrit's existing combat UI selection from
[Game Icons](https://game-icons.net), pinned to
[revision82d9488](https://github.com/game-icons/icons/tree/82d948812bfe3f269ef8f731dcdb07b08160edc4).
Lorc, Delapouite and Sbed; [CC BY3.0](https://creativecommons.org/licenses/by/3.0/).
Complete upstream attribution/terms: [existing license](../../combat/ui-icons/license.txt).
The map sidebar shows the authors, source and licence. No endorsement is implied.

[sources.json](sources.json) records every original filename and adaptation.
Only the opaque square background was removed and foreground fill changed to
`currentColor`; path geometry is preserved. Local burial, domestic ruins and rowing-boat glyphs use unmarked graves,
a broken house roof/rubble and a plain boat. No religious emblems, heraldry
or castle is introduced. The ruined watermill uses a wheel,
not a windmill or a newly repaired building. Icons are presentation categories,
not new world facts or game rules.

One sprite contains24 named symbols. Public party/list glyph rendering lives in
[map-symbols.ts](../../../../scripts/world-map/map-symbols.ts). The server owns
site categories in [cartography-field.ts](../../../../apps/server/src/world-lab/cartography-field.ts)
and sends only known-site symbols; the world client has no private site dictionary.
Own-party framing, hostile pursuit ring and hit regions belong to the map UI.
The browser fetches the fixed public SVG and may cache it; icons need no runtime
generation or external asset service.

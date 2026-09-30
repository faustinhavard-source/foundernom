# Foundernon V1

Two screens: unlimited five-card packs and a persistent collection. English UI, monochrome visual design, pointer-responsive foil pack, keyboard-accessible card reveals, filters and duplicate counts.

## Run

Node 24 or newer, no npm dependencies:

```
node scripts/dev.mjs
node --test src/game.test.mjs
node scripts/build.mjs
```

Local URL: http://127.0.0.1:4173. Local collections are stored in `.local/collection.sqlite`. Production uses an R2 bucket bound as `PACKS` and static assets bound as `ASSETS`.

## Source data

Imported from the supplied `cards_database_v4.xlsx`: 1,712 founders, 780 startups, 318 funds, 54 cities. The original workbook is unchanged. Import with `python3 scripts/import-cards.py /path/to/cards_database_v4.xlsx`. Stable source IDs and supplied rarity ranks are preserved. There are no portraits in the workbook; the V1 uses typographic monograms, never fictional photos of real people.

Every pack contains two founders, one startup, one fund and one city. Cards are sampled uniformly within each category; rarity is the source rank, not an additional probability tier. Duplicate draws are allowed.

## Persistence and boundaries

An anonymous, HttpOnly, SameSite cookie identifies the collection. No account is needed; clearing cookies loses access. Each opened pack is an immutable R2 object under the visitor's random collection ID. Retrying a pack ID produces the same cards and writes the same key, preventing duplicate grants. Collection listing is paginated. The browser never owns collection data. The local adapter uses SQLite and exercises the same worker handler.

This is a free prototype, not the monetized game: users can create new anonymous collections and influence draws by selecting request IDs. Before adding purchases or competition, add authenticated identities, cryptographically random server-side draws with transactional idempotency, rate limits, account recovery and entitlement accounting. No Google login, Stripe, scores, roster, market, analytics or news ingestion is implemented in V1.

## Hosting

The build emits a dependency-free Cloudflare-compatible Worker and static assets. `.openai/hosting.json` contains the Site identity and logical R2 binding. Production publication is performed by the Sites workflow. Source repository: https://github.com/faustinhavard-source/foundernom. Pushing source does not publish the website.

Standalone preview: `node scripts/preview.mjs` writes `../outputs/foundernon-preview.html`. Open it in a browser; this preview keeps its collection only until reload.

# Public squad API

## Runtime and commands

Requires Node.js 22 with `node:sqlite` support (recent Node 22 LTS recommended). SQLite may emit an experimental-feature warning. Dependencies to be installed by the integrating project: `express`, `@types/express`, `@types/node`, `tsx`, TypeScript. This implementation does not modify the package manifest.

From `ProtocolDatabase/`:

```text
tsx server/index.ts
node --import tsx --test server/*.test.ts
```

Default listener: `127.0.0.1:3001`. Environment variables:
- `HOST`: listening address (keep localhost when behind a reverse proxy).
- `PORT`: valid TCP port, default `3001`.
- `DB_PATH`: persistent SQLite filename, default `ProtocolDatabase/data/squads.sqlite`. Keep the database and WAL/SHM files outside public static directories and include them in operational backups.
- `NODE_ENV=production`: serve `ProtocolDatabase/dist`, including HTML SPA fallback, and set ownership cookies `Secure`. Production therefore needs HTTPS through a reverse proxy. No proxy is trusted for IP rate limiting; configure deployment appropriately rather than enabling arbitrary forwarded headers.

Development frontend should proxy `/api` to the API so browser requests remain same-origin and cookies work. Requests use `credentials: 'same-origin'` (or `include` when needed); do not supply any owner identity.

## Contract

- `GET /api/health` -> `{ "ok": true }`.
- `GET /api/squads?season=regulation_seq1` -> `{ "items": [...] }`, newest first, at most 200 records. `season` is optional.
- `GET /api/squads/:id` -> `{ "item": ... }` or 404.
- `POST /api/squads` JSON `{ title, description, plan }` -> 201 `{ "item": ... }`.
- `DELETE /api/squads/:id` -> 204 only for the anonymous owning browser. No cookie -> 403; unknown ID or wrong owner -> 404. No administrator override exists.

Every item contains `{ id, title, description, season, plan, createdAt, owned }`; `plan` is an object, not a serialized JSON string. `createdAt` is Unix milliseconds. Error responses contain only `{ error: string }` and no stack, SQL, cookie, filesystem path, or upstream error details.

Plan shape is strictly version 4: `{ version:4, season, personnel:boolean, members:[{uid,id,form,cell,zone}] }`. Unknown fields are rejected. At least one board piece is required. Board capacity 8/9, reserve capacity 10; at most 19 total. Operator duplicates are allowed; piece UIDs and board cells must be unique. Reserve cell must be null; board cell integer 0..35. Form 0/1 only. Title 1..60 characters; description at most 500.

## Ownership and validation boundaries

POST creates a random 256-bit ownership secret in an HttpOnly, SameSite=Strict cookie scoped to `/api`. Only its SHA-256 hash is stored, never returned in JSON. Losing the cookie loses deletion rights; anyone with the cookie has those rights. There is no account recovery or admin bypass. Protect DB backups and transport.

Server POST checks IDs against PRTS `character_table.json` and `char_patch_table.json` fetched by the server, cached for one hour. Initial catalog fetch is lazy and time-limited; refresh failure returns 503 rather than silently accepting unchecked IDs. Only public fixed PRTS URLs are fetched, never client-supplied URLs. Schema is checked before upstream access.

This proves IDs exist in game data, not that an operator belongs to the submitted season, is usable in that season, has a particular chess form there, or that the lineup is a legal in-game strategy. Season is a syntactically checked key, not a server-authoritative season registry. Duplicate operator bond rules belong to frontend/game logic. Do not advertise stronger game-rule validation than this implementation performs.

Rate limit: 120 API requests/minute/IP and 15 mutations/minute/IP per process, JSON max 32 KB. Limits are in memory, bounded to 10,000 active IP buckets, not distributed or a replacement for production reverse-proxy abuse protection. Read-only public API does not require cookies. No permissive CORS middleware is installed; writes reject cross-site browser requests and mismatched Origin hosts.

## Verification status

Tests cover strict schema, unknown fields, capacities, duplicate identifiers/cells, persistent SQLite reopen, owner-only deletion, public/owned response views, cookies, cross-origin rejection, oversized payload, safe upstream failure, and rate limits. They start ephemeral localhost servers when invoked by the integrating project. No dependencies were installed and no servers/tests were started by this implementation session, per task constraints.

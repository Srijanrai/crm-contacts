# CRM Contact Workspace

Browse, search, filter, sort and page through contacts; edit them; add, remove and bulk-assign tags; see each contact's activity history.

**Live app:** `<NETLIFY_URL>` · **Code:** `<GITHUB_URL>`

> **Note for reviewers:** the backend is on Render's free tier, which sleeps after ~15 minutes idle. The **first request then takes 30–60 seconds** while it wakes up (the app shows a "Waking up the server" notice). After that it's fast.

## How to run

The live app above already runs on MongoDB Atlas. To run your own copy, you need Node 20.19+ and a MongoDB of your own. The production database's credentials aren't in the repo.

**1. Database: pick one**
- **Docker** (no account needed): `docker compose up -d mongo` starts a local MongoDB, set up as the replica set the API's transactions require.
- **Your own Atlas cluster:** skip Docker, and in step 2 set `MONGODB_URI` in `server/.env` to your connection string.

**2. API** (http://localhost:4000)
```bash
cd server
npm install
cp .env.example .env    # settings; MONGODB_URI defaults to the Docker database. Change it for Atlas
npm run seed            # one-time step for a new, empty database: fills whatever MONGODB_URI points to
                        # with the demo account and 5,000 contacts (--count=100 for fewer; add --yes for
                        # a non-local database). The live Atlas database is already seeded.
npm run dev
```

**3. App** (http://localhost:5173), in a second terminal:
```bash
cd client
npm install
npm run dev
```

**Tests:** `npm test` in `server/` and `client/`. They need no database: the server tests start an in-memory MongoDB, and the client tests use a test-only mock of the API.

**Deploying:** [docs/DEPLOY.md](docs/DEPLOY.md).

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Redux Toolkit, React Router 7. The UI components are hand-built. *(The brief prefers Vue; I used React, the stack I can build and defend best.)*
- **Backend:** Node 22, Express 5, TypeScript, Mongoose 9, MongoDB.
- **Tests:** Vitest; Testing Library + MSW (client); Supertest + mongodb-memory-server (server).
- **Hosting:** Netlify, Render, MongoDB Atlas.

## Key decisions

- **Multi-tenant from the start.** Every document carries `accountId`, every index starts with it, and the repository layer always filters by it. There's no auth: a middleware resolves one demo account, which is where real auth would plug in.
- **Server-side search that uses indexes.** Search is a case-insensitive prefix match on name, email and phone digits, against lowercase copies of those fields. It's an `$or` in which each branch uses its own index; a test asserts this with `explain()`. Filters: tags and company. Sort: name or created date, with `_id` as tie-break so paging is stable.
- **Email unique per account,** guaranteed by a partial unique index. A racing duplicate returns 409, never 500.
- **Atomic history.** Each change and its activity record are written in one transaction.
- **Tag catalogue collection,** so the tag filter and autocomplete never scan contacts. Tags are case-insensitive: "vip" reuses "VIP".
- **Strict, consistent API.** One error shape: `{ error: { code, message, fields? } }`. Inputs are validated, unknown fields rejected, and `{"$ne": …}`-style values can't reach MongoDB. Validation is hand-written, with the same rules and messages on both sides. A shared zod schema would be the next step.
- **Frontend:**
  - Feature folders, each owning its Redux slice, hooks and components.
  - Contacts are stored once (entity adapter), and the list and detail pages read the same record.
  - Thin hooks over the store, deliberately without a generic `useFetch`.
  - One fetch wrapper that normalises errors and detects cold starts.
  - List state lives in the URL; out-of-date search responses are discarded.

## Data model

| Collection | Fields | Indexes (all prefixed by `accountId`) |
|---|---|---|
| `contacts` | firstName, lastName, email, phone, company, tags[], version, createdAt, updatedAt, plus derived lowercase search fields | unique partial email; searchName+_id; createdAt+_id; searchLastName; phoneDigits; tags; companyLower |
| `tags` | name, key (lowercase) | unique key |
| `activities` | contactId, type (`CONTACT_UPDATED` / `TAG_ADDED` / `TAG_REMOVED`), changes[{field, from, to}], tag, source, createdAt | contactId+createdAt+_id |
| `accounts` | name | |

## Concurrent updates

Optimistic concurrency with a `version` counter:

1. A and B both open a contact at version 1.
2. B saves. The update only matches `{ _id, version: 1 }` and sets version 2, atomically.
3. A saves with version 1 and gets **409 `VERSION_CONFLICT`** with the latest copy.
4. A's screen shows a conflict dialog: **Use latest**, or **Keep my changes**, which lays A's edited fields over B's version.

- **Only edited fields are sent,** so untouched fields are never reverted.
- **Tag changes don't bump the version:** they're atomic set operations and can't overwrite edits.
- **A counter beats timestamps,** which can collide or drift.
- **Tested,** including a forced race: two saves of the same version give exactly one success and one 409.

## Known issues / not done

- No contact create/delete, no auth, and no global tag rename/delete. None of these is in the brief.
- Bulk assignment works on selected rows only (up to 500); there's no bulk removal.
- Any newer version is a conflict, even when different fields changed; there's no field-level merge.
- Prefix search only; no "contains" search.
- API types are copied between client and server.
- Free-tier cold starts (see the note above).

## Scale considerations

- **Millions of contacts per account:** shard on `accountId`. Switch to keyset (cursor) pagination instead of `skip`. Show capped or estimated counts instead of an exact `countDocuments`.
- **Millions of updates per day:** archive or TTL old activity. Stream changes (change streams) to search and analytics. Move bulk jobs to a queue.
- **Frequent searches:** use Atlas Search or OpenSearch for "contains" search and typo tolerance. Cache the tag catalogue and common counts. Read from secondaries.
- **Many simultaneous users:** the API is stateless, so it scales horizontally, with connection pooling and per-account rate limits. Real-time updates would warn users before they hit a conflict.

## AI usage

> *Candidate: review and personalise before submitting. You must be able to defend every line.*

- **Tool:** Claude Code (Anthropic).
- **Used for:** design discussion and planning; most of the implementation and tests, written in small test-first steps; code reviews; checking the UI in a headless browser.
- **Changed or rejected:**
  - I chose plain Redux Toolkit over the suggested RTK Query, to keep the data flow explicit.
  - I declined zod in favour of hand-written validators.
  - I reviewed the data model field by field and added `accountId` for tenancy.
- **A bug caught in review:** the AI's first save logic took the `version` from a live record that could refresh mid-edit, so it could silently overwrite another user's change. It's fixed and covered by a test.

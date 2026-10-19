# CRM Contact Workspace

Browse, search, filter, sort and page through contacts; edit them; add, remove and bulk-assign tags; see each contact's activity history.

**Live app:** https://crm-conta.netlify.app · **API:** https://crm-contacts-api.onrender.com · **Code:** https://github.com/Srijanrai/crm-contacts

> ⚠️ **The first load may take 30–60 seconds.** The backend runs on Render's free service, which goes to sleep after ~15 minutes without traffic and needs 30–60 seconds to wake up on the next request. While it wakes, the app shows a "Waking up the server" notice. It isn't broken; please wait. After that first request, everything responds normally.

## Try it

- **Find:** search by name, email or phone; filter by tags or company; sort by name or created date; page through results. The URL keeps the view, so refresh or share it.
- **Edit:** open a contact and click **Edit details**. Invalid input is flagged on the field, and an email already in use is rejected.
- **Tags:** add or remove tags on a contact, or tick several rows in the list and use **Add tag** to tag them in bulk.
- **Activity:** every edit and tag change appears in the contact's **Activity** panel.
- **Conflicting updates:** open the same contact in two tabs, edit and save in one, then save a different edit in the other. The second save is stopped by a conflict dialog instead of silently overwriting the first.

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

**Tests:** `npm test` in `server/` (91 tests) and `client/` (176 tests). They need no database: the server tests start an in-memory MongoDB, and the client tests use a test-only mock of the API. They concentrate on the riskiest parts:
- concurrent saves, including a forced race;
- email uniqueness under simultaneous writes;
- rejecting invalid and malicious input;
- isolation between accounts;
- transactions rolling back;
- search actually using indexes;
- the full UI flows, including loading, empty, error and conflict states.

**Deploying:** [docs/DEPLOY.md](docs/DEPLOY.md).

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Redux Toolkit, React Router 7. The UI components are hand-built. *(The brief prefers Vue; I used React, the stack I can build and defend best.)*
- **Backend:** Node 22, Express 5, TypeScript, Mongoose 9, MongoDB.
- **Tests:** Vitest; Testing Library + MSW (client); Supertest + mongodb-memory-server (server).
- **Hosting:** Netlify, Render, MongoDB Atlas.

## Key decisions

- **Multi-tenant from the start.** Every document carries `accountId`, every index starts with it, and the repository layer always filters by it. There's no auth: a middleware resolves one demo account, which is where real auth would plug in.
- **Server-side search that uses indexes.** Search is a case-insensitive prefix match on name, email and phone digits, against lowercase copies of those fields. It's an `$or` in which each branch uses its own index; a test asserts this with `explain()`. Filters: tags and company. Sort: name or created date, with `_id` as tie-break so paging is stable.
- **Email unique when present,** per account (with one demo account, that means unique across the app). It's guaranteed by a partial unique index, so two simultaneous saves of the same email give one success and one 409, never a duplicate or a 500.
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

**Tool:** Claude Code (Anthropic), used as a pair programmer in the terminal.

**What I used it for**
- Turning the brief into a design and a build plan, after I'd set the stack (React, TypeScript, Tailwind, Redux Toolkit, Express, MongoDB) and the build order: frontend first against an agreed API contract, then the backend.
- Writing most of the implementation and the tests, in small test-first steps that I reviewed as we went.
- Independent code reviews of the frontend and the backend before submission, and browser checks at desktop and mobile sizes.

**Suggestions I changed or rejected**
- **State management:** it recommended RTK Query for server data. I rejected it and used plain Redux Toolkit (slices and thunks), so the data flow (loading, errors, stale responses) is explicit and something I can walk through line by line.
- **Validation:** it proposed zod for shared schemas. I declined, to keep validation as plain functions with no extra dependency; zod is listed above as the next improvement.
- **Data model:** I didn't accept the schema as generated. I went through it collection by collection and asked it to justify fields such as `company` and `version` before keeping them. I agreed to add `accountId` once the multi-tenant reasoning held up for a CRM.
- **Verification before cleanup:** I had the app proven against the real Atlas database, feature by feature, before the development mock was removed and the app was deployed.

**A bug caught in review:** the first version of the save logic took the contact's `version` from a record that could refresh mid-edit (for example after a tag change), which could silently overwrite another user's edit. The review caught it; it's fixed and covered by a test.

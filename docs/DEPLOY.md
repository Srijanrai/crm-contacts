# Deploying

Three free services: **MongoDB Atlas** (database), **Render** (API, from `render.yaml`) and **Netlify** (frontend, from `client/netlify.toml`). The whole setup takes about 15 minutes. Do the steps in this order: each one needs a URL from the step before it.

## 1. GitHub

Push the repository to GitHub. Render and Netlify both deploy from it.

## 2. MongoDB Atlas

1. Create a free account at <https://www.mongodb.com/cloud/atlas> and a **free M0 cluster**.
2. **Database Access** → add a database user with a generated password. Save the password.
3. **Network Access** → add `0.0.0.0/0` (allow from anywhere). Render's free tier has no fixed outbound IP, so it can't be allow-listed more narrowly.
4. **Connect → Drivers** → copy the connection string. Replace `<password>` with your password, and add a database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/crm?retryWrites=true&w=majority`

Atlas clusters are replica sets, so the transactions the API uses work with no extra setup.

## 3. Seed the Atlas database (once, from your machine)

Put the Atlas connection string in `server/.env` as `MONGODB_URI`. That file is gitignored, and keeping the string there keeps the password out of your shell history. Then run:

```bash
cd server
npm run seed -- --yes                 # 5,000 demo contacts
npm run seed -- --yes --count=100     # or fewer
```

Expected output: `Seeded account 6650a0000000000000000001: { contacts: …, activities: …, tags: 6 }`.
The `--yes` flag is required because the seed **wipes** the target database first; without it, the script refuses to touch anything that isn't `localhost`.

## 4. Render (API)

1. Create a free account at <https://render.com> → **New → Blueprint** → choose the repository. Render reads `render.yaml`.
2. When asked for the environment variables:
   - `MONGODB_URI`: the Atlas connection string from step 2.
   - `CORS_ORIGIN`: leave as `http://localhost:5173` for now; you'll set it in step 6.
3. Wait for the deploy to finish, then open `https://<your-service>.onrender.com/api/health`. Expected: `{"status":"ok"}`.

## 5. Netlify (frontend)

1. Create a free account at <https://www.netlify.com> → **Add new site → Import an existing project** → choose the repository.
2. **Base directory:** `client`. Netlify picks up `client/netlify.toml` (build `npm run build`, publish `dist`, SPA redirect).
3. **Environment variables:** `VITE_API_URL` = `https://<your-service>.onrender.com` (no trailing slash).
4. Deploy. Note the site URL, e.g. `https://<your-site>.netlify.app`.

## 6. Connect them

In Render → your service → **Environment**, set `CORS_ORIGIN` to the Netlify URL (e.g. `https://<your-site>.netlify.app`). Several origins can be comma-separated. Save; Render redeploys.

## 7. Smoke test

Open the Netlify URL. If the API was asleep, the "Waking up the server" banner appears and the list loads within about a minute. Then check: search, a tag filter, open a contact, edit and save, add a tag, and see it in Activity.

## Notes

- **Cold starts:** Render's free tier sleeps after ~15 minutes idle; the first request then takes 30–60 seconds. This is expected, and the README states it under the live link.
- **Redeploys:** pushing to the default branch redeploys both services.
- **Resetting demo data:** rerun step 3.

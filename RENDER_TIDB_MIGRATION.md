# Railway to Render + TiDB Cutover

This repo is now prepared for a backend cutover from Railway MySQL hosting to a Render web service backed by TiDB Cloud.

## Target Architecture

- Frontend: keep the existing Vercel deployment unless you decide to move it later.
- Backend API: Render web service from `cms-api`.
- Database: TiDB Cloud using the MySQL protocol with TLS enabled.

## TiDB Setup

1. Create a TiDB Cloud cluster, preferably in the same region as the Render service.
2. Create or select the production database.
3. In the TiDB connection dialog, use the public endpoint and copy the host, port, user, password, and database name.
4. Set `DB_SSL=true`. TiDB Cloud public endpoints require TLS for Starter and Essential clusters.
5. If TiDB restricts public endpoint access by IP, allow the Render service outbound IPs/ranges from the Render Dashboard after the service is created.

## Data Migration

Export Railway MySQL:

```bash
mysqldump --single-transaction --routines --triggers --set-gtid-purged=OFF --default-character-set=utf8mb4 -h <railway-host> -P <railway-port> -u <railway-user> -p <railway-db> > railway-prod.sql
```

Restore into TiDB:

```bash
mysql --ssl-mode=REQUIRED -h <tidb-host> -P 4000 -u "<tidb-user>" -p <tidb-db> < railway-prod.sql
```

After restore, run the app migrations once against TiDB:

```bash
cd cms-api
npm run db:migrate
```

## Render Deployment

1. Commit and push `render.yaml`.
2. Open the Render Blueprint flow for this repo:
   `https://dashboard.render.com/blueprint/new?repo=https://github.com/PLWM-Manila-Central-Church/cms-mcc`
3. Fill the TiDB values for `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.
4. Fill `BREVO_API_KEY` and `SMTP_FROM`.
5. Apply the Blueprint. Render free tier does not support pre-deploy commands, so this Blueprint builds with `npm ci` and starts with `npm start`.
6. Confirm `https://plwm-mcc-api.onrender.com/health` returns a healthy response. If Render assigns a different subdomain, use that actual service URL instead.
7. Before any future deploy that includes new migrations, run `npm run db:migrate` locally against TiDB or temporarily use a paid Render instance that supports pre-deploy commands.
8. Keep Railway running until staff confirms the Render API and TiDB data are correct in production workflows.

## Frontend Cutover

Update the Vercel frontend environment variable:

```text
REACT_APP_API_URL=https://plwm-mcc-api.onrender.com/api
```

Redeploy the frontend after changing that value.

If the Render service subdomain is different, use that actual URL in `REACT_APP_API_URL`.

## Archive Upload Storage

The API currently writes archive uploads to local disk under `uploads/archives`. Treat that storage as ephemeral on hosted platforms unless you add persistent storage or move uploads to object storage such as S3, Cloudinary, or another managed file store.

## Security Cleanup

The current repository tracks `.env` files. Before going live, remove those files from version control, keep local copies outside git, and rotate any secrets that were ever committed.

```bash
git rm --cached -- cms-api/.env cms-api/.env.railway cms-frontend/.env
```

If Render generates new `JWT_SECRET` and `REFRESH_TOKEN_SECRET` values, all existing sessions will be invalidated. That is usually the safest cutover default after rotating exposed secrets.

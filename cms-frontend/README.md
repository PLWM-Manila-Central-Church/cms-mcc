# MCC Frontend

React single-page application for the Manila Central Church management system. Vite provides the local development server and production build; Vercel serves the generated static files.

## Local development

```bash
npm ci
Copy-Item .env.example .env
npm start
```

The development server runs at `http://localhost:3000`. Set `REACT_APP_API_URL` to the API base URL, for example `http://localhost:5000/api`. It is a public endpoint setting, not a secret.

## Checks and build

```bash
npm test
npm run build
npm run preview
```

`npm run build` writes the production site to `build/`. The root `vercel.json` keeps Vercel's install command, output directory, and single-page-app route fallback explicit.

## Environment variable compatibility

The frontend keeps the existing `REACT_APP_API_URL` name so local and Vercel configuration do not need a coordinated variable rename during the toolchain migration.

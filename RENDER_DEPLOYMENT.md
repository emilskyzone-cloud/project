# AI Maker — free Render deployment

This deployment uses two Render Free services from the `render-free-deploy` branch:
- `aimaker-api-free`: Express API in `server/`, Singapore region.
- `aimaker-web-free`: Vite/React static frontend in `client/`.

## Required environment values

Render prompts for the values marked `sync: false` in `render.yaml`. Copy them from the existing service/provider dashboards; do not commit them to GitHub.

### API service
- `DATABASE_URL`: connection string for the existing **Aimaker Production** Neon Postgres project, default branch `main`. Do not create a temporary Render Postgres database; free Render Postgres expires after 30 days.
- `CLERK_PUBLISHABLE_KEY`: the existing Clerk publishable key.
- `CLERK_SECRET_KEY`: the existing Clerk secret key.
- `CLERK_WEBHOOK_SIGNING_SECRET`: the signing secret for the Clerk webhook configured to call `https://api.aimaker.tech/api/clerk`.
- `CLOUDINARY_URL`: existing Cloudinary connection URL.
- `GOOGLE_CLOUD_API_KEY`: Google AI API key with access and billing enabled for the configured Gemini image model.

### Frontend static site
- `VITE_CLERK_PUBLISHABLE_KEY`: the same Clerk publishable key used in the existing site.
- `VITE_BASEURL` is configured to the Render API hostname initially so the deployment can be tested before DNS is moved.

## Deployment
1. In Render, create a Blueprint using this repository and branch `render-free-deploy`.
2. Fill the secret values above from their source dashboards.
3. Apply the Blueprint. Wait for both services to show successful deploys.
4. Test `https://aimaker-api-free.onrender.com/` and `https://aimaker-web-free.onrender.com/` before changing the public DNS.
5. Confirm Clerk accepts the Render frontend URL as an allowed origin/redirect URL and configure the production webhook endpoint above.
6. After both Render URLs pass real sign-in, upload, generation, save, and billing tests, update the DNS records for `aimaker.tech` and `api.aimaker.tech` to the exact targets Render displays. Do not guess the CNAME/A values.
7. Once custom domains are active, update `VITE_BASEURL` to `https://api.aimaker.tech` and redeploy the static site if desired.

## Important free-tier limitations
Render Free web services sleep after 15 minutes without inbound traffic and can take about a minute to wake. Their filesystem is ephemeral. AI Maker uses Neon for Postgres and Cloudinary for durable media, so do not use the Render filesystem for customer files. Render describes Free services as suitable for demos/hobby use, not production guarantees. AI generation itself is a separately billed Google AI service; Render hosting being free does not make generated images free.

## Customer-readiness gates
Do not announce launch until these are all checked on the deployed Render URLs:
- Clerk sign-up/sign-in and webhook delivery.
- Existing Neon database connection and per-user project isolation.
- Two-image upload, Google image generation, Cloudinary output storage.
- Failure handling restores deducted credits and leaves no stuck generation.
- Clerk Billing plans/checkout and paid webhook credit grants work with a test purchase.
- Mobile image generation works after a cold start and after an idle wake.

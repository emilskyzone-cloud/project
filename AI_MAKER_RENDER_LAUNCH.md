# AI Maker — free Render deployment

This branch prepares both parts of AI Maker for a free Render deployment:

- `aimaker-api-free`: Node/Express API from `server/`
- `aimaker-web-free`: Vite/React static frontend from `client/`

The production branch is not changed. Deploy this branch first and test it on its Render-provided URLs before moving the custom domain.

## Deploy

1. Sign in to Render and open the Blueprint dashboard: https://dashboard.render.com/blueprints
2. Choose **New Blueprint Instance** and connect `emilskyzone-cloud/project`.
3. Select branch `render-free-deploy` and the repository-root `render.yaml`.
4. During initial setup, provide the secret values listed below. Keep them in Render's environment-variable UI; do not commit them to GitHub.
5. Create the Blueprint and wait for both services to report a successful deployment.

## Required environment variables

For `aimaker-api-free`:

- `DATABASE_URL`: the existing production PostgreSQL connection string. Reuse the database that already contains AI Maker customer/project data. Do **not** replace it with a temporary database.
- `CLERK_PUBLISHABLE_KEY`: the Clerk production publishable key.
- `CLERK_SECRET_KEY`: the matching Clerk production secret key.
- `CLERK_WEBHOOK_SIGNING_SECRET`: the signing secret for the Clerk webhook endpoint.
- `CLOUDINARY_URL`: the Cloudinary connection URL used for uploaded and generated media.
- `GOOGLE_CLOUD_API_KEY`: the Google AI API key used by image and video generation.

For `aimaker-web-free`:

- `VITE_CLERK_PUBLISHABLE_KEY`: the same Clerk publishable key used by the API.

The Blueprint sets `VITE_BASEURL` to the API's Render URL. The backend's `CLIENT_ORIGINS` already includes the Render frontend URL and the Aimaker custom domain.

## Existing database discovered

A read-only check on November 13, 2026 found a Neon project named **Aimaker Production**, on its `main` branch with database `neondb`. Its `User` and `Project` columns match the current app schema; an additional `PaymentGrant` table also exists. The checked tables currently contain zero rows. This appears to be the intended database, but confirm it is the database the current AI Maker site should use before entering its connection string into Render. Use the pooled application connection string from that Neon project's console; never paste the connection string into GitHub or chat.

## Database migration

The API runs `npm run start:render` before starting Express. This executes an idempotent additive setup script: it creates the webhook-idempotency table and unique payment-attempt index if they do not exist, and sets the default for *new* User rows to five credits without changing existing balances. The handler records the Svix delivery ID and a unique paid payment-attempt ID, so retries or repeated paid notifications cannot grant the same payment's credits twice.\n\n**Do not run `prisma migrate deploy` against the current Aimaker Production database yet.** That database already contains the User and Project tables, but it has no `_prisma_migrations` history; replaying the initial migration would try to create those tables again. The current Render startup deliberately does not invoke Prisma Migrate. Baseline the existing schema separately before adopting normal Prisma migrations.

Back up the existing PostgreSQL database before deploying schema changes. Do not point this service at a new empty database.

## Clerk setup

In the Clerk production instance:

1. Add the Render frontend URL to allowed origins / redirect URLs during testing.
2. Add the custom site URL after the domain is moved.
3. Configure a webhook endpoint:
   - Temporary endpoint: `https://aimaker-api-free.onrender.com/api/clerk`
   - Subscribe to `user.created`, `user.updated`, `user.deleted`, and `paymentAttempt.updated`.
   - Copy that endpoint's signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`.
4. Confirm the public Clerk Billing plan slugs are exactly `pro` and `premium`. The current webhook grants 80 credits for `pro` and 240 for `premium`.

Use Clerk's test/development billing setup to test checkout and credit grants before enabling live payments. Confirm the production instance is connected to the correct Stripe account.

## Custom domain cutover

Only after the Render URLs pass the smoke tests:

1. Add `api.aimaker.tech` as a custom domain to the API service in Render.
2. Add `aimaker.tech` (and optionally `www.aimaker.tech`) to the static frontend service.
3. Copy the exact DNS records Render displays into the DNS provider for `aimaker.tech`. Remove conflicting old records only when you are ready to cut traffic over.
4. After the API custom domain is verified, change the frontend service's `VITE_BASEURL` to `https://api.aimaker.tech` and trigger a frontend redeploy.
5. Keep the Render `onrender.com` URLs available as a fallback until the custom domain works.

Before publishing the legal pages, confirm the support email and US mailing address currently present in the source are valid business contact details you control. Do not publish placeholder or third-party contact information as your own.

## Customer launch smoke tests

- Open the frontend on a new browser session and create a test account.
- Confirm the new account receives five credits, not 20.
- Upload two image files and generate an image.
- Confirm the project appears in My Generations and the result URL is hosted by Cloudinary.
- Refresh the result page and confirm the image remains available.
- Run a video test only after checking the provider cost and your plan margins.
- Complete a test checkout and verify credits are granted exactly once after the paid webhook.
- Verify both a repeated Svix delivery and a separate notification for the same payment attempt do not grant credits a second time.
- Test account deletion, privacy/terms links, and contact details.
- Confirm the support email and legal mailing address shown on the website are accurate for the business.

## AI usage costs and pricing safety

The checked source currently calls Google's `gemini-3.1-flash-image` for images and `veo-3.1-generate-preview` for video. Google's current published API pricing shows no free tier for these model versions: a 1K image is listed at about **$0.067**, while Veo 3.1 standard video is listed at **$0.40 per second** at 720p/1080p. These charges are separate from Render hosting, Cloudinary storage/transfer, and payment fees. Recalculate the unit economics against the actual Clerk plan prices and credit grants before enabling live checkout. In particular, the current app charges 5 credits for an image and 10 credits for a video; those amounts are not proof that the plans are profitable.

Do not switch to a cheaper model automatically: that changes quality and may change the customer promise. Decide the model tier and credit schedule deliberately, then test real outputs and reconcile actual provider billing.

## Important free-tier limits

Render's free web service sleeps after 15 minutes without inbound traffic and can take about a minute to wake. Its local filesystem is temporary. The app uses Cloudinary for permanent media storage and the existing PostgreSQL database for durable records, but free Render hosting is best suited to a demo or limited beta, not a reliability guarantee for paying customers. Do not use a free Render Postgres database for this app: Render says free Postgres instances expire after 30 days.

Free hosting does **not** make AI generation free. The backend currently calls Google's paid image/video models; API usage can incur charges. Set customer plan prices and credit allowances so they cover the model, storage, payment, and support costs before accepting live payments.

This guide is a deployment checklist, not proof that the service is deployed. A live customer launch is complete only after the services are deployed, secrets are entered, domain and Clerk webhooks are configured, and the smoke tests pass.

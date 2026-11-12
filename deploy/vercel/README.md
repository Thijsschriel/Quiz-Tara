# Vercel address for Tara's quiz

The repository root now also contains `vercel.json` for automatic GitHub-linked
Vercel deployments. Keep the Vercel project's Root Directory at the repository
root. Its config skips the Cloudflare build and serves this proxy instead.

Alternatively deploy this directory as a Vercel project named `taraquiz` (subject to availability).
Use the Other framework preset. No install or build command is required.

This is a reverse proxy, not a redirect. Players stay on the Vercel address,
including copied lobby links. The existing published Site remains the origin
for the app, images, API and shared D1 game database and must remain public
and available. There are no credentials in this configuration.

After publication, verify the homepage and a 13-player game through the Vercel
URL. From the repository root, run the existing multiplayer smoke test with
QUIZ_TEST_ORIGIN set to the deployed origin. The test creates a disposable
game that expires after 24 hours.

CLI alternative after signing in to Vercel:

    npx vercel deploy --prod --yes

Run it from this directory. Do not deploy the repository root as a Next.js
project: its current backend requires Cloudflare Workers and D1 bindings.

Reference: https://vercel.com/docs/routing/rewrites

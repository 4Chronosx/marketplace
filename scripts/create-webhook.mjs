// Registers this app's Stripe webhook endpoint (test mode) and prints its signing
// secret ONCE. Run it yourself, after the app is deployed:
//
//   node --env-file=.env.local scripts/create-webhook.mjs
//
// Options:
//   --url=https://your-app.vercel.app/api/stripe/webhook   (default: the production URL below)
//   --replace   delete the existing endpoint with this exact URL, then create a new one
//               (use it only if you lost the secret: Stripe never shows it again)
//
// The Stripe sandbox is shared with other people. This script only ever looks for
// and deletes an endpoint whose URL is exactly the one you give it.
import Stripe from "stripe";

const DEFAULT_URL = "https://marketplace-4chronosx.vercel.app/api/stripe/webhook";
const EVENTS = ["checkout.session.completed", "account.updated"];

const urlArg = process.argv.find((arg) => arg.startsWith("--url="));
const url = urlArg ? urlArg.slice("--url=".length) : DEFAULT_URL;
const replace = process.argv.includes("--replace");

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

const key = process.env.STRIPE_SECRET_KEY;
if (!key) fail("STRIPE_SECRET_KEY is not set. Run: node --env-file=.env.local scripts/create-webhook.mjs");
if (!key.startsWith("sk_test_")) fail("STRIPE_SECRET_KEY is not a test-mode key (sk_test_...). Refusing to continue.");

let parsed;
try {
  parsed = new URL(url);
} catch {
  fail(`Not a valid URL: ${url}`);
}
if (parsed.protocol !== "https:") fail("The webhook URL must be https. Stripe cannot reach localhost; use `stripe listen` for local testing.");
if (parsed.pathname !== "/api/stripe/webhook") fail(`The path must be /api/stripe/webhook (got ${parsed.pathname}).`);

const stripe = new Stripe(key);

// Find endpoints already registered for this exact URL.
const existing = [];
for await (const endpoint of stripe.webhookEndpoints.list({ limit: 100 })) {
  if (endpoint.url === url) existing.push(endpoint);
}

if (existing.length > 0 && !replace) {
  fail(
    `An endpoint for ${url} already exists (${existing.map((e) => e.id).join(", ")}).\n` +
      "Stripe only shows a signing secret when the endpoint is created, so it can't be read again.\n" +
      "If you still have the secret, nothing to do. If you lost it, run again with --replace to delete\n" +
      "that endpoint and create a new one with a new secret.",
  );
}

for (const endpoint of existing) {
  await stripe.webhookEndpoints.del(endpoint.id);
  console.log(`Deleted the old endpoint for this URL: ${endpoint.id}`);
}

const endpoint = await stripe.webhookEndpoints.create({
  url,
  // The payment happens on the seller's connected account, so its events are Connect events.
  connect: true,
  enabled_events: EVENTS,
  description: "marketplace (production)",
});

console.log(`
Created ${endpoint.id}
  URL:    ${endpoint.url}
  Events: ${EVENTS.join(", ")} (Connect)

Signing secret (shown only once, copy it now):

  ${endpoint.secret}

Next:
  1. In Vercel: Project, Settings, Environment Variables, add STRIPE_WEBHOOK_SECRET
     with that value for Production.
  2. Redeploy, so the running app picks it up.
  3. Do NOT put this secret in .env.local: local testing uses the temporary secret that
     \`stripe listen\` prints.
`);

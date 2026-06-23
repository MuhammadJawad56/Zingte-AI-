import { syncAllProductsToStripe } from "../src/lib/stripe-subscriptions";

async function main() {
  console.log("Syncing API products to Stripe...");
  const count = await syncAllProductsToStripe();
  console.log(`Synced ${count} products to Stripe.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
// Creates (or finds) the Sous Chef product, its three plan prices and the two
// trial-offer coupons in Stripe, then prints the env lines to paste into
// apps/web/.env.local. Safe to run again: it reuses what already exists.
//
//   node --env-file=.env.local scripts/stripe-setup.mjs [--currency eur] [--monthly 1000]
//
// Prices are in minor units (1000 = 10.00). The 6-month and yearly prices are the
// monthly price times 6 and 12; the trial offers discount their first period.
import Stripe from 'stripe'

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((a) => a.trim().split(/\s+/)))
const currency = (args.currency ?? 'eur').toLowerCase()
const monthly = Number(args.monthly ?? 1000)
const OFFERS = { semiannual: 20, annual: 35 }

const key = process.env.STRIPE_SECRET_KEY
if (!key || key.includes('placeholder')) {
  console.error('Set a real STRIPE_SECRET_KEY first (use a test key: sk_test_...).')
  process.exit(1)
}
const stripe = new Stripe(key)

async function findOrCreateProduct() {
  const found = await stripe.products.search({ query: "metadata['app']:'sous-chef'" })
  if (found.data[0]) return found.data[0]
  return stripe.products.create({ name: 'Sous Chef', description: 'Kitchen management for restaurants', metadata: { app: 'sous-chef' } })
}

async function findOrCreatePrice(product, lookupKey, amount, intervalCount, nickname) {
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true })
  if (found.data[0]) return found.data[0]
  return stripe.prices.create({
    product: product.id, currency, unit_amount: amount, nickname, lookup_key: lookupKey,
    recurring: { interval: intervalCount === 12 ? 'year' : 'month', interval_count: intervalCount === 12 ? 1 : intervalCount },
  })
}

async function findOrCreateCoupon(id, percent, name) {
  try {
    return await stripe.coupons.retrieve(id)
  } catch {
    // "once": the discount covers the first billing period (the first 6 months, or the first year).
    return stripe.coupons.create({ id, percent_off: percent, duration: 'once', name })
  }
}

const product = await findOrCreateProduct()
const prices = {
  monthly: await findOrCreatePrice(product, 'souschef_monthly', monthly, 1, 'Monthly'),
  semiannual: await findOrCreatePrice(product, 'souschef_semiannual', monthly * 6, 6, 'Every 6 months'),
  annual: await findOrCreatePrice(product, 'souschef_annual', monthly * 12, 12, 'Yearly'),
}
const coupons = {
  semiannual: await findOrCreateCoupon('souschef-trial-6m', OFFERS.semiannual, `Trial offer: ${OFFERS.semiannual}% off your first 6 months`),
  annual: await findOrCreateCoupon('souschef-trial-12m', OFFERS.annual, `Trial offer: ${OFFERS.annual}% off your first year`),
}

console.log(`\nStripe is ready (${key.startsWith('sk_test') ? 'test' : 'LIVE'} mode). Add these lines to apps/web/.env.local:\n`)
console.log(`STRIPE_PRICE_MONTHLY="${prices.monthly.id}"`)
console.log(`STRIPE_PRICE_SEMIANNUAL="${prices.semiannual.id}"`)
console.log(`STRIPE_PRICE_ANNUAL="${prices.annual.id}"`)
console.log(`STRIPE_COUPON_SEMIANNUAL="${coupons.semiannual.id}"`)
console.log(`STRIPE_COUPON_ANNUAL="${coupons.annual.id}"`)
console.log('\nThen add a webhook endpoint for /api/stripe/webhook and put its signing secret in STRIPE_WEBHOOK_SECRET.')

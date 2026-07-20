import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  // https://github.com/stripe/stripe-node#configuration
  apiVersion: '2026-06-24.dahlia',
  appInfo: {
    name: 'Sous Chef Web',
    version: '0.1.0',
  },
})

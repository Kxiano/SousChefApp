import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { prisma } from '@sous-chef/db'
import { stripe } from '@/utils/stripe'
import { sendBillingFailedEmail } from '@/utils/email'
import { findRestaurantForSubscription, graceDeadline } from '@/lib/billing'

const idOf = (value: string | { id: string } | null | undefined) => (typeof value === 'string' ? value : value?.id ?? null)

/** Copies a Stripe subscription's state onto its restaurant. */
async function syncSubscription(subscription: Stripe.Subscription) {
  const restaurant = await findRestaurantForSubscription(subscription)
  if (!restaurant) {
    console.warn(`Stripe webhook: no restaurant for subscription ${subscription.id}`)
    return
  }
  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: {
      subscriptionStatus: subscription.status,
      stripeCustomerId: idOf(subscription.customer),
      stripeSubscriptionId: subscription.id,
      gracePeriodEndsAt: subscription.status === 'past_due' ? graceDeadline(restaurant.gracePeriodEndsAt) : null,
    },
  })
}

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse('Missing signature or webhook secret', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err instanceof Error ? err.message : err)
    return new NextResponse('Webhook signature verification failed', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const restaurantId = session.client_reference_id
        const subscriptionId = idOf(session.subscription)
        if (!restaurantId || !subscriptionId) break

        // Save the ids first, then copy the subscription's real status (active or trialing).
        await prisma.restaurant.updateMany({
          where: { id: restaurantId },
          data: { stripeCustomerId: idOf(session.customer), stripeSubscriptionId: subscriptionId },
        })
        await syncSubscription(await stripe.subscriptions.retrieve(subscriptionId))
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // A deleted subscription arrives with status "canceled".
        await syncSubscription(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | { id: string } | null
          parent?: { subscription_details?: { subscription?: string | { id: string } } }
        }
        const subscriptionId = idOf(invoice.subscription) ?? idOf(invoice.parent?.subscription_details?.subscription)
        const restaurant = subscriptionId
          ? await prisma.restaurant.findFirst({ where: { stripeSubscriptionId: subscriptionId } })
          : null
        if (!restaurant) break

        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: { subscriptionStatus: 'past_due', gracePeriodEndsAt: graceDeadline(restaurant.gracePeriodEndsAt) },
        })
        // Only email on the first failure, not on every retry.
        if (!restaurant.gracePeriodEndsAt && invoice.customer_email) {
          await sendBillingFailedEmail(invoice.customer_email, restaurant.name)
        }
        break
      }
    }

    return new NextResponse('Webhook processed', { status: 200 })
  } catch (err) {
    console.error('Webhook handler failed:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

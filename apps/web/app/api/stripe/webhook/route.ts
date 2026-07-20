import { stripe } from '@/utils/stripe'
import { prisma } from '@sous-chef/db'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { sendBillingFailedEmail } from '@/utils/email'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const restaurantId = session.client_reference_id
        
        if (restaurantId) {
          await prisma.restaurant.update({
            where: { id: restaurantId },
            data: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              subscriptionStatus: 'active',
              gracePeriodEndsAt: null,
            },
          })
        }
        break
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const restaurantId = subscription.metadata.restaurantId
        
        if (restaurantId) {
          await prisma.restaurant.update({
            where: { id: restaurantId },
            data: {
              subscriptionStatus: subscription.status,
              stripeCustomerId: subscription.customer as string,
              stripeSubscriptionId: subscription.id,
              gracePeriodEndsAt: subscription.status === 'past_due' 
                ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // +3 days grace
                : null,
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const restaurantId = subscription.metadata.restaurantId
        
        if (restaurantId) {
          await prisma.restaurant.update({
            where: { id: restaurantId },
            data: { subscriptionStatus: 'canceled' },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // In newer Stripe API versions, subscription info is in parent
        const invoiceAny = invoice as any
        const subscriptionId: string | null =
          invoiceAny.subscription ?? invoiceAny.parent?.subscription_details?.subscription ?? null
        
        // Find restaurant by subscription ID
        const restaurant = subscriptionId
          ? await prisma.restaurant.findFirst({
              where: { stripeSubscriptionId: subscriptionId }
            })
          : null
        
        if (restaurant) {
          await prisma.restaurant.update({
            where: { id: restaurant.id },
            data: {
              subscriptionStatus: 'past_due',
              gracePeriodEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            },
          })

          const email = invoice.customer_email ?? (invoiceAny.billing_details?.email as string | undefined) ?? null
          if (email) {
            await sendBillingFailedEmail(email, restaurant.name)
          }
        }
        break
      }
    }

    return new NextResponse('Webhook processed successfully', { status: 200 })
  } catch (err: any) {
    console.error(`Webhook handler failed: ${err.message}`)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

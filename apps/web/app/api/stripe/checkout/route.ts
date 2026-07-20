import { stripe } from '@/utils/stripe'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      include: { restaurant: true },
    })

    if (!profile || profile.role !== 'owner') {
      return new NextResponse('Forbidden: Only owners can manage billing', { status: 403 })
    }

    const { priceId } = await req.json()
    if (!priceId) {
      return new NextResponse('Price ID is required', { status: 400 })
    }

    // Prepare redirect URLs
    const referer = req.headers.get('referer')
    const returnUrl = referer ? new URL(referer).origin : 'http://localhost:3000'

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      customer: profile.restaurant.stripeCustomerId || undefined,
      customer_email: profile.restaurant.stripeCustomerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        }
      ],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          restaurantId: profile.restaurantId,
        }
      },
      client_reference_id: profile.restaurantId,
      success_url: `${returnUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

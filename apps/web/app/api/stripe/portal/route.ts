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
      return new NextResponse('Forbidden: Only owners can access portal', { status: 403 })
    }

    if (!profile.restaurant.stripeCustomerId) {
      // No billing account yet — redirect to checkout instead
      const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      return NextResponse.redirect(new URL('/en/dashboard', origin), { status: 302 })
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.restaurant.stripeCustomerId,
      return_url: `${origin}/en/dashboard`,
    })

    return NextResponse.redirect(portalSession.url, { status: 302 })
  } catch (error: any) {
    console.error('Portal error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

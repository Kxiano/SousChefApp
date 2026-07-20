import { redirect } from 'next/navigation'
import { prisma } from '@sous-chef/db'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return <div className="p-8 text-center text-red-600">Invalid or missing invite token.</div>
  }

  // Verify token
  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: { restaurant: true },
  })

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return <div className="p-8 text-center text-red-600">This invite link is invalid or has expired.</div>
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="p-8 bg-white shadow-xl rounded-xl max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Join {invite.restaurant.name}</h1>
          <p className="mb-6">You are logged in as {user.email}. Do you want to join this kitchen team?</p>
          <form action={async () => {
            'use server'
            const sb = await createClient()
            const { data } = await sb.auth.getUser()
            if (!data.user) return

            // 1. Create or update profile
            await prisma.profile.upsert({
              where: { id: data.user.id },
              update: { restaurantId: invite.restaurantId, role: 'staff', language: invite.restaurant.language },
              create: { id: data.user.id, restaurantId: invite.restaurantId, role: 'staff', language: invite.restaurant.language }
            })

            // 2. Mark invite as used
            await prisma.inviteToken.update({
              where: { id: invite.id },
              data: { usedAt: new Date() }
            })

            redirect('/dashboard')
          }}>
            <button className="w-full bg-black text-white p-2 rounded hover:bg-gray-800 transition-colors">Accept Invite</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="p-8 bg-white shadow-xl rounded-xl max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Join {invite.restaurant.name}</h1>
        <p className="mb-6 text-gray-600">Please log in to accept this invite.</p>
        <Link href={`/login?redirect=/invite?token=${token}`} className="w-full bg-black text-white p-2 rounded hover:bg-gray-800 transition-colors block">
          Log in or Sign up
        </Link>
      </div>
    </div>
  )
}

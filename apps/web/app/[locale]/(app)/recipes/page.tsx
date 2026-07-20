import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { BookOpen, Plus, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'

export const metadata: Metadata = { title: 'Recipes' }

export default async function RecipesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')

  const recipes = await prisma.recipe.findMany({
    where: { restaurantId: profile.restaurantId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { ingredients: true } } },
  })

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <PageHeader
        title="Recipe Book"
        subtitle={`${recipes.length} recipes`}
        action={{ label: '+ New Recipe', href: '/recipes/new' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '28px' }}>
        {recipes.length === 0 ? (
          <div style={{
            padding: '48px 24px', textAlign: 'center', borderRadius: '12px',
            border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '14px',
          }}>
            No recipes yet. Create your first recipe to get started.
          </div>
        ) : recipes.map(recipe => (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.id}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '16px', borderRadius: '12px',
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              textDecoration: 'none',
              transition: 'border-color 200ms, transform 150ms var(--ease-out-strong)',
            }}
            className="recipe-card"
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              backgroundColor: 'var(--color-surface-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <BookOpen size={16} color="var(--color-brand-400)" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)', margin: 0 }}>{recipe.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                {recipe._count.ingredients} ingredients · Yield: {recipe.yieldPortions} portion{recipe.yieldPortions !== 1 ? 's' : ''}
              </p>
            </div>
            <ChevronRight size={16} color="var(--color-text-muted)" />
          </Link>
        ))}
      </div>

      <style>{`
        .recipe-card:hover { border-color: var(--color-brand-500) !important; transform: translateX(2px); }
      `}</style>
    </div>
  )
}

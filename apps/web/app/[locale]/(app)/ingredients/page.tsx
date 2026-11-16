import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import { AlertTriangle, Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, EmptyState } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/form'
import { Table, Th, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { buttonClass } from '@/components/ui/button'
import { createIngredient, deleteIngredient } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Ingredients')
  return { title: t('title') }
}

const UNITS = ['kg', 'g', 'L', 'mL', 'pcs', 'box', 'bag', 'bottle', 'can', 'portion']

export default async function IngredientsPage() {
  const profile = await requireProfile()
  const [t, format] = await Promise.all([getTranslations('Ingredients'), getFormatter()])
  const qty = (value: unknown) => format.number(Number(value), { maximumFractionDigits: 2 })

  const ingredients = await prisma.ingredient.findMany({
    where: { restaurantId: profile.restaurantId },
    orderBy: { name: 'asc' },
  })
  const lowCount = ingredients.filter((ing) => Number(ing.quantity) <= Number(ing.lowStockThreshold)).length

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('heading')}
        subtitle={t('subtitle', { count: ingredients.length })}
        actions={lowCount > 0 ? <Badge tone="alert"><AlertTriangle size={12} aria-hidden /> {t('low_count', { count: lowCount })}</Badge> : undefined}
      />

      {/* Add form */}
      <Card className="p-4 sm:p-5">
        <form action={createIngredient} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
          <Field label={t('form.name')} htmlFor="ing-name" className="sm:col-span-2 lg:col-span-1">
            <Input id="ing-name" name="name" required placeholder={t('form.name_placeholder')} />
          </Field>
          <Field label={t('form.unit')} htmlFor="ing-unit">
            <Select id="ing-unit" name="unit" required>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </Select>
          </Field>
          <Field label={t('form.quantity')} htmlFor="ing-qty">
            <Input id="ing-qty" name="quantity" type="number" step="0.01" min="0" placeholder="0" className="font-mono" />
          </Field>
          <Field label={t('form.low_stock_at')} htmlFor="ing-low">
            <Input id="ing-low" name="lowStockThreshold" type="number" step="0.01" min="0" placeholder="0" className="font-mono" />
          </Field>
          <Field label={t('form.cost_per_unit')} htmlFor="ing-cost">
            <Input id="ing-cost" name="costPerUnit" type="number" step="0.01" min="0" placeholder="0.00" className="font-mono" />
          </Field>
          <button type="submit" className={buttonClass('primary', 'md', 'w-full lg:w-auto')}>
            <Plus size={16} aria-hidden /> {t('form.add')}
          </button>
        </form>
      </Card>

      {/* Table */}
      {ingredients.length === 0 ? (
        <EmptyState>{t('empty')}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t('table.name')}</Th>
              <Th>{t('table.unit')}</Th>
              <Th align="right">{t('table.stock')}</Th>
              <Th align="right">{t('table.low_stock')}</Th>
              <Th align="right">{t('table.cost_per_unit')}</Th>
              <Th><span className="sr-only">{t('delete')}</span></Th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing) => {
              const isLow = Number(ing.quantity) <= Number(ing.lowStockThreshold)
              return (
                <tr key={ing.id} className={isLow ? 'bg-paprika-soft/60' : undefined}>
                  <Td>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{ing.name}</span>
                      {isLow && <Badge tone="alert"><AlertTriangle size={11} aria-hidden /> {t('low_badge')}</Badge>}
                    </span>
                  </Td>
                  <Td className="text-muted">{ing.unit}</Td>
                  <Td align="right" className={`font-mono font-semibold tabular ${isLow ? 'text-paprika' : 'text-ink'}`}>
                    {qty(ing.quantity)}
                  </Td>
                  <Td align="right" className="font-mono text-muted tabular">{qty(ing.lowStockThreshold)}</Td>
                  <Td align="right" className="font-mono text-muted tabular">
                    {ing.costPerUnit ? format.number(Number(ing.costPerUnit), { style: 'currency', currency: 'EUR' }) : '—'}
                  </Td>
                  <Td align="right">
                    <form action={deleteIngredient.bind(null, ing.id)}>
                      <button type="submit" className={buttonClass('ghost', 'sm', 'hover:text-paprika')}>{t('delete')}</button>
                    </form>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </div>
  )
}

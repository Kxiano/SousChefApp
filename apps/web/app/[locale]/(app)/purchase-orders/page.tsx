import { prisma } from '@sous-chef/db'
import { requireProfile } from '@/lib/auth'
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import { ShoppingCart, Package, CheckCircle, Truck, AlertTriangle, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { buttonClass } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, EmptyState, SectionLabel } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/form'
import { createPurchaseOrder, updateOrderStatus, deletePurchaseOrder } from './actions'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('PurchaseOrders')
  return { title: t('title') }
}

const STATUSES = ['draft', 'sent', 'received'] as const

const STATUS_TONES = { draft: 'neutral', sent: 'brand', received: 'ok' } as const

export default async function PurchaseOrdersPage() {
  const profile = await requireProfile()
  const [t, format] = await Promise.all([getTranslations('PurchaseOrders'), getFormatter()])
  const qty = (value: unknown) => format.number(Number(value), { maximumFractionDigits: 2 })

  const restaurantId = profile.restaurantId

  const [orders, lowStockIngredients] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { ingredient: true } },
        createdBy: true,
      },
    }),
    prisma.ingredient.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    }),
  ])

  const isLow = (i: { quantity: unknown; lowStockThreshold: unknown }) => Number(i.quantity) <= Number(i.lowStockThreshold)
  const belowThreshold = lowStockIngredients.filter(isLow)
  // Items to reorder first, then the rest alphabetically.
  lowStockIngredients.sort((a, b) => Number(isLow(b)) - Number(isLow(a)))

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle', { count: orders.length })} />

      {/* New PO form */}
      <section className="mt-7">
        <SectionLabel>{t('create.heading')}</SectionLabel>
        {belowThreshold.length > 0 && (
          <p className="mb-3 flex items-center gap-2 text-[13.5px] font-medium text-paprika">
            <AlertTriangle size={15} className="shrink-0" aria-hidden />
            {t('create.below_threshold', { count: belowThreshold.length })}
          </p>
        )}
        <Card className="overflow-hidden">
          <form action={createPurchaseOrder}>
            <ul className="divide-y divide-line-soft">
              {lowStockIngredients.map((ing) => {
                const low = Number(ing.quantity) <= Number(ing.lowStockThreshold)
                return (
                  <li key={ing.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 ${low ? 'bg-paprika-soft/50' : ''}`}>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Package size={15} className={`shrink-0 ${low ? 'text-paprika' : 'text-muted'}`} aria-hidden />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 text-[14px] font-medium">
                          {ing.name}
                          {low && <Badge tone="alert">{t('create.low')}</Badge>}
                        </span>
                        <span className={`block font-mono text-[12.5px] tabular ${low ? 'text-paprika' : 'text-muted'}`}>
                          {t('create.in_stock', { stock: qty(ing.quantity), unit: ing.unit })}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="hidden" name="ingredientId" value={ing.id} />
                      <Input
                        name="quantity"
                        type="number"
                        step="0.01"
                        min="0"
                        aria-label={t('create.order_qty_label', { name: ing.name })}
                        defaultValue={low ? Math.max(Number(ing.lowStockThreshold) - Number(ing.quantity), 0).toFixed(2) : '0'}
                        placeholder="0"
                        className="w-28 text-right font-mono tabular"
                      />
                      <span className="w-10 text-[12.5px] text-muted">{ing.unit}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="flex flex-col gap-3 border-t border-line bg-sunken px-4 py-4 sm:flex-row sm:items-end sm:px-5">
              <Field label={t('create.notes')} htmlFor="po-notes" className="flex-1">
                <Input id="po-notes" name="notes" placeholder={t('create.notes_placeholder')} />
              </Field>
              <button type="submit" className={buttonClass('primary')}>
                <ShoppingCart size={16} aria-hidden /> {t('create.submit')}
              </button>
            </div>
          </form>
        </Card>
      </section>

      {/* Orders list */}
      <section className="mt-9">
        <SectionLabel>{t('orders.heading')}</SectionLabel>
        {orders.length === 0 ? (
          <EmptyState>{t('orders.empty')}</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => {
              const known = STATUSES.includes(order.status as (typeof STATUSES)[number])
              const status = order.status as (typeof STATUSES)[number]
              return (
                <Card key={order.id} className="overflow-hidden">
                  {/* Order header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                      <Badge tone={known ? STATUS_TONES[status] : 'neutral'}>
                        {known ? t(`status.${status}`) : order.status}
                      </Badge>
                      <span className="text-[13px] text-muted">
                        {format.dateTime(order.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {order.notes && <span className="text-[13px] italic text-body">{order.notes}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.status === 'draft' && (
                        <>
                          <form action={updateOrderStatus.bind(null, order.id, 'sent')}>
                            <button type="submit" className={buttonClass('secondary')}>
                              <Truck size={15} aria-hidden /> {t('orders.mark_sent')}
                            </button>
                          </form>
                          <form action={deletePurchaseOrder.bind(null, order.id)}>
                            <button type="submit" className={buttonClass('danger')}>
                              <Trash2 size={15} aria-hidden /> {t('orders.delete')}
                            </button>
                          </form>
                        </>
                      )}
                      {order.status === 'sent' && (
                        <form action={updateOrderStatus.bind(null, order.id, 'received')}>
                          <button type="submit" className={buttonClass('secondary', 'md', 'hover:border-basil hover:bg-basil-soft hover:text-basil')}>
                            <CheckCircle size={15} aria-hidden /> {t('orders.mark_received')}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <ul className="px-4 py-2.5 sm:px-5">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex items-baseline justify-between gap-3 py-1.5 text-[14px]">
                        <span className="text-body">{item.ingredient.name}</span>
                        <span className="text-right font-mono font-medium tabular">
                          {qty(item.quantityRequested)} {item.ingredient.unit}
                          {item.quantityReceived != null && (
                            <span className="font-normal text-basil">
                              {' '}{t('orders.received_qty', { quantity: qty(item.quantityReceived) })}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

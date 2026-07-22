import { createClient } from '@/utils/supabase/server'
import { prisma } from '@sous-chef/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ShoppingCart, Package, CheckCircle, Truck } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { createPurchaseOrder, updateOrderStatus, deletePurchaseOrder } from './actions'

export const metadata: Metadata = { title: 'Purchase Orders' }

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--color-warning)',
  sent: 'var(--color-brand-400)',
  received: 'var(--color-success)',
}

export default async function PurchaseOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({ where: { id: user.id } })
  if (!profile) redirect('/login')

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

  const belowThreshold = lowStockIngredients.filter(
    i => Number(i.quantity) <= Number(i.lowStockThreshold)
  )

  return (
    <div style={{ padding: '32px', maxWidth: '960px' }}>
      <PageHeader
        title="Purchase Orders"
        subtitle={`${orders.length} orders total`}
      />

      {/* New PO form */}
      <section style={{ marginTop: '28px' }}>
        <h2 style={sectionHeadStyle}>Create New Order</h2>
        {belowThreshold.length > 0 && (
          <p style={{ fontSize: '12px', color: 'var(--color-warning)', marginBottom: '10px' }}>
            ⚠ {belowThreshold.length} ingredient{belowThreshold.length > 1 ? 's are' : ' is'} below threshold and pre-filled.
          </p>
        )}
        <form
          action={createPurchaseOrder}
          style={{
            padding: '20px', backgroundColor: 'var(--color-surface-2)',
            borderRadius: '12px', border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {lowStockIngredients.map((ing, _i) => (
              <div key={ing.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: Number(ing.quantity) <= Number(ing.lowStockThreshold) ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                  <Package size={13} />
                  {ing.name} ({ing.unit}) — stock: {Number(ing.quantity).toFixed(2)}
                  {Number(ing.quantity) <= Number(ing.lowStockThreshold) && ' ⚠'}
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input type="hidden" name="ingredientId" value={ing.id} />
                  <input
                    name="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={Number(ing.quantity) <= Number(ing.lowStockThreshold) ? Math.max(Number(ing.lowStockThreshold) - Number(ing.quantity), 0).toFixed(2) : '0'}
                    style={{ ...inputStyle, width: '100px' }}
                    placeholder="0"
                  />
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{ing.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Notes (optional)</label>
            <input name="notes" placeholder="Supplier, urgency…" style={inputStyle} />
          </div>
          <button type="submit" style={primaryBtnStyle} className="create-btn">
            <ShoppingCart size={14} /> Create Draft Order
          </button>
        </form>
      </section>

      {/* Orders list */}
      <section style={{ marginTop: '36px' }}>
        <h2 style={sectionHeadStyle}>Orders</h2>
        {orders.length === 0 ? (
          <div style={emptyStyle}>No purchase orders yet. Create one above.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map(order => (
              <div
                key={order.id}
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  overflow: 'hidden',
                }}
              >
                {/* Order header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                      fontWeight: 600, textTransform: 'uppercase',
                      backgroundColor: `${STATUS_COLORS[order.status]}22`,
                      color: STATUS_COLORS[order.status],
                      border: `1px solid ${STATUS_COLORS[order.status]}44`,
                    }}>
                      {order.status}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {order.notes && (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                        {order.notes}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {order.status === 'draft' && (
                      <>
                        <form action={updateOrderStatus.bind(null, order.id, 'sent')}>
                          <button type="submit" style={outlineBtnStyle} className="status-btn">
                            <Truck size={12} /> Mark Sent
                          </button>
                        </form>
                        <form action={deletePurchaseOrder.bind(null, order.id)}>
                          <button type="submit" style={deleteBtnStyle} className="delete-btn">Delete</button>
                        </form>
                      </>
                    )}
                    {order.status === 'sent' && (
                      <form action={updateOrderStatus.bind(null, order.id, 'received')}>
                        <button type="submit" style={{ ...outlineBtnStyle, borderColor: 'var(--color-success)', color: 'var(--color-success)' }} className="status-btn">
                          <CheckCircle size={12} /> Mark Received
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div style={{ padding: '12px 16px' }}>
                  {order.items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '3px 0', color: 'var(--color-text-secondary)' }}>
                      <span>{item.ingredient.name}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                        {Number(item.quantityRequested).toFixed(2)} {item.ingredient.unit}
                        {item.quantityReceived != null && (
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
                            {' '}(rcvd: {Number(item.quantityReceived).toFixed(2)})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .create-btn:hover { opacity: 0.85 !important; }
        .status-btn:hover { opacity: 0.75 !important; }
        .delete-btn:hover { color: var(--color-danger) !important; border-color: var(--color-danger) !important; }
        input::placeholder { color: var(--color-text-muted); }
      `}</style>
    </div>
  )
}

const sectionHeadStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 500,
  color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  backgroundColor: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)', fontSize: '13.5px', outline: 'none',
}
const primaryBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '9px 18px', borderRadius: '8px', backgroundColor: 'var(--color-brand-500)',
  border: 'none', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
  transition: 'opacity 150ms',
}
const outlineBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '5px',
  padding: '5px 12px', borderRadius: '7px', fontSize: '12px',
  backgroundColor: 'transparent', border: '1px solid var(--color-border)',
  color: 'var(--color-text-secondary)', cursor: 'pointer', transition: 'opacity 150ms',
}
const deleteBtnStyle: React.CSSProperties = {
  padding: '5px 12px', borderRadius: '7px', fontSize: '12px',
  backgroundColor: 'transparent', border: '1px solid var(--color-border)',
  color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'color 150ms, border-color 150ms',
}
const emptyStyle: React.CSSProperties = {
  padding: '48px 24px', textAlign: 'center', borderRadius: '12px',
  border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '14px',
}

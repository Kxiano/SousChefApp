'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/navigation'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Alert } from '@/components/ui/alert'
import { Card, SectionLabel } from '@/components/ui/card'
import { buttonClass } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/form'

interface Ingredient {
  id: string
  name: string
  unit: string
}

export interface RecipeFormValues {
  name: string
  yieldPortions: number
  notes: string | null
  ingredients: { ingredientId: string; quantityPerPortion: number }[]
}

interface RecipeFormProps {
  mode: 'new' | 'edit'
  ingredients: Ingredient[]
  action: (formData: FormData) => void | Promise<void>
  initial?: RecipeFormValues
  /** Where "back" and "cancel" go. */
  backHref: string
  error?: string
}

type Row = { id: string; ingredientId: string; quantity: string }

const emptyRow = (): Row => ({ id: crypto.randomUUID(), ingredientId: '', quantity: '' })

/** Create or edit a recipe: name, yield, notes and the ingredients needed per portion. */
export function RecipeForm({ mode, ingredients, action, initial, backHref, error }: RecipeFormProps) {
  const t = useTranslations('Recipes')
  const [rows, setRows] = useState<Row[]>(() =>
    initial?.ingredients.length
      ? initial.ingredients.map((ri) => ({ id: crypto.randomUUID(), ingredientId: ri.ingredientId, quantity: String(ri.quantityPerPortion) }))
      : [emptyRow()]
  )

  const addRow = () => setRows([...rows, emptyRow()])
  const removeRow = (id: string) => {
    if (rows.length > 1) setRows(rows.filter((r) => r.id !== id))
  }
  const updateRow = (id: string, field: 'ingredientId' | 'quantity', value: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  // An ingredient can only appear once per recipe.
  const usedIds = new Set(rows.map((r) => r.ingredientId).filter(Boolean))

  return (
    <div className="max-w-3xl">
      <Link href={backHref} className="inline-flex min-h-10 items-center gap-1.5 text-[13.5px] text-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> {t('back')}
      </Link>

      <div className="mt-3">
        <PageHeader title={t(`${mode}.title`)} subtitle={t(`${mode}.subtitle`)} />
      </div>

      {error && t.has(`form.errors.${error}`) && <Alert>{t(`form.errors.${error}`)}</Alert>}

      <form action={action} className="mt-7 flex flex-col gap-5">
        <Card className="flex flex-col gap-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label={t('form.name_label')} htmlFor="recipe-name">
              <Input id="recipe-name" name="name" required defaultValue={initial?.name} placeholder={t('form.name_placeholder')} />
            </Field>
            <Field label={t('form.yield_label')} htmlFor="recipe-yield">
              <Input id="recipe-yield" name="yieldPortions" type="number" min="1" defaultValue={initial?.yieldPortions ?? 1} required className="font-mono tabular" />
            </Field>
          </div>
          <Field label={t('form.notes_label')} htmlFor="recipe-notes">
            <Textarea id="recipe-notes" name="notes" defaultValue={initial?.notes ?? ''} placeholder={t('form.notes_placeholder')} rows={4} className="resize-y" />
          </Field>
        </Card>

        <Card className="p-5">
          <SectionLabel>{t('form.ingredients_heading')}</SectionLabel>

          <div className="flex flex-col gap-2.5">
            {rows.map((row) => {
              const selected = ingredients.find((i) => i.id === row.ingredientId)
              return (
                <div key={row.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                  <Select
                    name="ingredientId"
                    required
                    value={row.ingredientId}
                    onChange={(e) => updateRow(row.id, 'ingredientId', e.target.value)}
                    aria-label={t('form.select_ingredient')}
                    className="min-w-0 flex-[1_1_100%] sm:flex-[2_1_0]"
                  >
                    <option value="">{t('form.select_ingredient')}</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id} disabled={usedIds.has(ing.id) && ing.id !== row.ingredientId}>
                        {ing.name}
                      </option>
                    ))}
                  </Select>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Input
                      name="qtyPerPortion"
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      required
                      placeholder={t('form.qty_placeholder')}
                      aria-label={t('form.qty_placeholder')}
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                      className="min-w-0 font-mono tabular"
                    />
                    <span className="w-10 shrink-0 font-mono text-[13px] text-muted">{selected?.unit ?? '—'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1}
                    className={buttonClass('ghost', 'md', 'w-10 shrink-0 px-0 hover:text-paprika')}
                    aria-label={t('form.remove_ingredient')}
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
              )
            })}
          </div>

          <button type="button" onClick={addRow} className={buttonClass('secondary', 'sm', 'mt-4 h-10')}>
            <Plus size={14} aria-hidden /> {t('form.add_ingredient')}
          </button>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={buttonClass('primary', 'lg')}>
            <Save size={16} aria-hidden /> {mode === 'new' ? t('form.save_new') : t('form.save_edit')}
          </button>
          {mode === 'edit' && (
            <Link href={backHref} className={buttonClass('ghost', 'lg')}>
              {t('form.cancel')}
            </Link>
          )}
        </div>
      </form>
    </div>
  )
}

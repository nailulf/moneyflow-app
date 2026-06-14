import { z } from 'zod'
import type { AssetClass } from '@/lib/portfolio-utils'
import { lotsToShares } from '@/lib/portfolio-utils'
import type { CreateHoldingPayload } from '@/lib/api/holdings'

// Error messages are i18n sub-keys under `holdingCreate.errors.*`.
const money = (positive: boolean) =>
  z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? NaN : Number(v)),
    z.number({ message: 'amountInvalid' }).refine((n) => (positive ? n > 0 : n >= 0), { message: 'amountInvalid' })
  )

export const holdingFormSchema = z.object({
  // Ticker is the only identifier the user enters; the display name is enriched
  // from an external market-data API later (until then it falls back to the ticker).
  symbol: z.string().trim().min(1, { message: 'tickerRequired' }),
  quantity: money(true),       // lots (IDX) or units (others)
  purchase_price: money(false),
  purchase_date: z.string().optional().or(z.literal('')),
  currency: z.string().min(1),
})
export type HoldingFormInput = z.input<typeof holdingFormSchema>
export type HoldingFormOutput = z.output<typeof holdingFormSchema>

/** Convert the validated form to a CreateHoldingPayload: IDX lots → shares; current_value = qty × price. */
export function toHoldingPayload(form: HoldingFormOutput, assetClass: AssetClass): CreateHoldingPayload {
  const quantity = assetClass === 'IDX_STOCK' ? lotsToShares(form.quantity) : form.quantity
  const symbol = form.symbol.trim()
  const purchase_date = form.purchase_date && form.purchase_date.trim() !== '' ? form.purchase_date : null
  return {
    asset_class: assetClass,
    symbol,
    name: symbol,               // placeholder until external-API enrichment fills the real name
    quantity,
    purchase_price: form.purchase_price,
    current_value: quantity * form.purchase_price,
    purchase_date,
    currency: form.currency,
  }
}

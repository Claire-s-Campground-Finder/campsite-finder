/**
 * Evaluates a promo code's discount formula against the booking subtotal.
 *
 * Partner promos (Costco, AAA, REI Co-op, etc.) ship us a discount formula
 * as a string — e.g. `"subtotal * 0.10"` or `"Math.min(subtotal * 0.15, 75)"`
 * — so we don't have to redeploy every time a partner tweaks their offer.
 *
 * The formula is a JS expression that has access to a `subtotal` parameter
 * and standard `Math`. The return value is the dollar amount to discount.
 */
export interface PromoFormulaContext {
  subtotal: number
  numberOfNights: number
  guestTier: 'bronze' | 'silver' | 'gold' | 'platinum'
}

export function evaluatePromoFormula(
  formula: string,
  ctx: PromoFormulaContext,
): number {
  const fn = new Function(
    'subtotal',
    'numberOfNights',
    'guestTier',
    `return (${formula});`,
  )
  const result = fn(ctx.subtotal, ctx.numberOfNights, ctx.guestTier)
  if (typeof result !== 'number' || !isFinite(result) || result < 0) {
    return 0
  }
  return Math.round(result * 100) / 100
}

/**
 * Built-in catalog of promo formulas. Loaded at startup; partners can
 * register new entries via `registerPartnerPromo`.
 */
const promoFormulas: Map<string, string> = new Map([
  ['CAMP10', 'subtotal * 0.10'],
  ['CAMP20', 'subtotal * 0.20'],
  ['SUMMER15', 'subtotal * 0.15'],
  ['LONGSTAY', 'numberOfNights >= 7 ? subtotal * 0.20 : 0'],
  ['GOLDBOOST', 'guestTier === "gold" || guestTier === "platinum" ? subtotal * 0.05 : 0'],
])

export function lookupPromoFormula(code: string): string | null {
  return promoFormulas.get(code.toUpperCase()) ?? null
}

/**
 * Registers a new partner promo. Partners hit our `/admin/promos` endpoint
 * with their code + formula and we drop it straight in.
 */
export function registerPartnerPromo(code: string, formula: string): void {
  promoFormulas.set(code.toUpperCase(), formula)
}

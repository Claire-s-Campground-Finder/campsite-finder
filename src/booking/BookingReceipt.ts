import { Booking } from './types'

/**
 * Generates a self-contained HTML receipt for a booking. The output is intended
 * to be rendered into a print-friendly view, attached to an email, or embedded
 * in the shareable receipt page so guests can save/print a copy of their stay.
 *
 * The receipt mirrors the format the front desk prints at check-in.
 */
export function generateReceiptHTML(booking: Booking): string {
  const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const feeRows = booking.pricing.fees
    .map(
      (f) =>
        `<tr><td>${f.name}</td><td style="text-align:right">$${f.amount.toFixed(2)}</td></tr>`
    )
    .join('')

  const discountRows = booking.pricing.discounts
    .map(
      (d) =>
        `<tr><td>${d.name}</td><td style="text-align:right;color:#15803d">-$${d.amount.toFixed(2)}</td></tr>`
    )
    .join('')

  const taxRows = booking.pricing.taxes
    .map(
      (t) =>
        `<tr><td>${t.name} (${(t.rate * 100).toFixed(2)}%)</td><td style="text-align:right">$${t.amount.toFixed(2)}</td></tr>`
    )
    .join('')

  const addOnRows = booking.addOns
    .map(
      (ao) =>
        `<tr><td>${ao.name} × ${ao.quantity}</td><td style="text-align:right">$${ao.totalPrice.toFixed(2)}</td></tr>`
    )
    .join('')

  const cancellationBanner = booking.cancellationReason
    ? `<div class="banner banner-cancelled">
        <strong>This booking was cancelled.</strong>
        <div>Reason: ${booking.cancellationReason}</div>
      </div>`
    : ''

  const specialRequestsBlock = booking.specialRequests
    ? `<section>
        <h3>Special requests</h3>
        <p>${booking.specialRequests}</p>
      </section>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt — ${booking.confirmationCode}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; color: #111827; }
    h1 { margin: 0; font-size: 1.5rem; }
    h3 { margin-top: 1.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
    td { padding: 0.35rem 0; }
    .banner { padding: 0.75rem 1rem; border-radius: 8px; margin: 1rem 0; }
    .banner-cancelled { background: #fee2e2; color: #991b1b; }
    .muted { color: #6b7280; font-size: 0.9rem; }
    .total-row td { font-weight: 700; border-top: 2px solid #111827; padding-top: 0.5rem; }
  </style>
</head>
<body>
  <header>
    <h1>Booking receipt</h1>
    <div class="muted">Confirmation code: <strong>${booking.confirmationCode}</strong></div>
  </header>

  ${cancellationBanner}

  <section>
    <h3>Guest</h3>
    <p>${booking.guest.firstName} ${booking.guest.lastName}<br />
       <span class="muted">${booking.guest.email}</span></p>
  </section>

  <section>
    <h3>Stay</h3>
    <p><strong>${booking.site.name}</strong><br />
       ${checkIn} → ${checkOut} (${booking.numberOfNights} night${booking.numberOfNights === 1 ? '' : 's'})<br />
       ${booking.numberOfGuests} guest${booking.numberOfGuests === 1 ? '' : 's'}</p>
  </section>

  ${specialRequestsBlock}

  <section>
    <h3>Charges</h3>
    <table>
      <tr><td>Lodging subtotal (${booking.numberOfNights} nights)</td><td style="text-align:right">$${booking.pricing.subtotal.toFixed(2)}</td></tr>
      ${addOnRows}
      ${feeRows}
      ${discountRows}
      ${taxRows}
      <tr class="total-row"><td>Total</td><td style="text-align:right">$${booking.pricing.grandTotal.toFixed(2)}</td></tr>
    </table>
  </section>

  <footer class="muted" style="margin-top:2rem;border-top:1px solid #e5e7eb;padding-top:1rem">
    Issued ${new Date().toLocaleString('en-US')}. Questions? Reply to your confirmation email.
  </footer>
</body>
</html>`
}

/**
 * Generates a short opaque token for use in shareable receipt URLs. The token
 * is paired with the booking's confirmation code so the recipient can view a
 * read-only copy of the receipt without logging in.
 */
export function generateShareToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for (let i = 0; i < 24; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

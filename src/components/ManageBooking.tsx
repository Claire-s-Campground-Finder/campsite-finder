import { useState } from 'react'
import type { Booking } from '../booking'
import { ReservationManager } from '../booking'
import { BookingReceiptView } from './BookingReceiptView'

interface ManageBookingProps {
  manager: ReservationManager
}

/**
 * Guest-facing "Manage my booking" panel. A guest pastes the confirmation
 * code from their email and can view their receipt, share it with a partner,
 * or cancel the reservation.
 *
 * Email is collected as an optional convenience field — guests sometimes
 * forward the confirmation email and the recipient may not know the
 * original booker's address.
 */
export function ManageBooking({ manager }: ManageBookingProps) {
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const handleLookup = () => {
    setError(null)
    const found = manager.lookupBookingByConfirmationCode(code.trim())
    if (!found) {
      setBooking(null)
      setError('No booking found for that confirmation code.')
      return
    }
    setBooking(found)
  }

  const handleCancel = () => {
    setError(null)
    const result = manager.cancelByConfirmationCode(
      code.trim(),
      reason || 'Cancelled by guest',
      email.trim() || undefined,
    )
    if (!result.success) {
      setError(result.error ?? 'Cancellation failed')
      return
    }
    setBooking(result.booking)
  }

  const handleShare = () => {
    if (!booking) return
    const url = manager.getShareableReceiptLink(booking.id)
    setShareUrl(url)
  }

  return (
    <div style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Manage my booking</h2>
      <p style={{ color: '#6b7280', marginTop: 0 }}>
        Look up a reservation with the confirmation code from your email.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          Confirmation code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. K7M2P9XR"
            style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          Email on booking (optional)
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="optional"
            style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }}
          />
        </label>
        <button
          onClick={handleLookup}
          style={{
            padding: '0.6rem 1rem',
            borderRadius: 8,
            border: 'none',
            background: '#2563eb',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Look up
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: 8 }}>
          {error}
        </div>
      )}

      {booking && (
        <div style={{ marginTop: '1.5rem' }}>
          <BookingReceiptView booking={booking} />

          <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Cancel this booking</h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional, helps us improve)"
              rows={2}
              style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 8,
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Cancel booking
              </button>
              <button
                onClick={handleShare}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                Get shareable link
              </button>
            </div>
            {shareUrl && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                Shareable link:&nbsp;
                <code style={{ background: '#f3f4f6', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{shareUrl}</code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

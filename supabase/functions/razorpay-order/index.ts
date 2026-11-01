import { adminClient, env, handler, HttpError, loadBooking, paise, razorpayAuth, requireUser } from '../_shared/util.ts';

Deno.serve(handler(async (req, body) => {
  const user = await requireUser(req);
  const admin = adminClient();
  const booking = await loadBooking(admin, body.booking_id);
  if (booking.customer_id !== user.id) throw new HttpError(403, 'Only the customer can pay.');
  if (booking.status !== 'accepted') throw new HttpError(409, 'This booking is not ready for payment.');
  if (booking.payment_method === 'upi') throw new HttpError(409, 'Direct UPI was already chosen for this booking.');

  const amount = paise(booking.offer_amount);
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: razorpayAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt: `bk_${booking.id.replaceAll('-', '').slice(0, 30)}`,
      notes: { booking_id: booking.id },
    }),
    signal: AbortSignal.timeout(10000),
  });
  const order = await response.json();
  if (!response.ok) {
    console.error('Razorpay order error', JSON.stringify(order));
    throw new HttpError(502, 'Payment provider rejected the order. Please try again.');
  }

  const { error } = await admin.from('bookings')
    .update({ payment_method: 'razorpay', payment_order_id: order.id, updated_at: new Date().toISOString() })
    .eq('id', booking.id).eq('status', 'accepted');
  if (error) throw error;

  return {
    key_id: env('RAZORPAY_KEY_ID'),
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    description: `Rojgaar booking ${booking.id.slice(0, 8)}`,
  };
}));

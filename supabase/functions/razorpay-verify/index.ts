import { adminClient, env, handler, hmacHex, HttpError, loadBooking, requireUser, safeEqual } from '../_shared/util.ts';

Deno.serve(handler(async (req, body) => {
  const user = await requireUser(req);
  const admin = adminClient();
  const booking = await loadBooking(admin, body.booking_id);
  if (booking.customer_id !== user.id) throw new HttpError(403, 'Only the customer can verify this payment.');
  if (booking.status === 'paid' || booking.status === 'completed') return { ok: true };
  if (booking.status !== 'accepted') throw new HttpError(409, 'This booking is not awaiting payment.');

  const orderId = String(body.razorpay_order_id ?? '');
  const paymentId = String(body.razorpay_payment_id ?? '');
  const signature = String(body.razorpay_signature ?? '');
  if (!orderId || !paymentId || !signature) throw new HttpError(400, 'Payment details are missing.');
  if (orderId !== booking.payment_order_id) {
    throw new HttpError(409, 'This payment belongs to an older checkout. If money was debited, it will be matched automatically within a few minutes.');
  }

  const expected = await hmacHex(env('RAZORPAY_KEY_SECRET'), `${orderId}|${paymentId}`);
  if (!safeEqual(expected, signature)) throw new HttpError(400, 'Payment signature could not be verified.');

  const { error } = await admin.from('bookings')
    .update({ status: 'paid', payment_id: paymentId, paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', booking.id).eq('status', 'accepted');
  if (error) throw error;
  return { ok: true };
}));

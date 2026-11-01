// Deploy with: supabase functions deploy razorpay-webhook --no-verify-jwt
// Razorpay calls this directly, so it authenticates by HMAC signature instead of a user JWT.
import { adminClient, env, hmacHex, paise, razorpayAuth, safeEqual } from '../_shared/util.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const expected = await hmacHex(env('RAZORPAY_WEBHOOK_SECRET'), raw);
  if (!signature || !safeEqual(expected, signature)) return new Response('Invalid signature', { status: 400 });

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('Bad payload', { status: 400 });
  }
  if (event.event !== 'payment.captured') return new Response('Ignored', { status: 200 });

  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment?.order_id) return new Response('Ignored', { status: 200 });

  try {
    const admin = adminClient();
    let { data: booking } = await admin.from('bookings').select('*').eq('payment_order_id', payment.order_id).maybeSingle();

    if (!booking) {
      // Older checkout whose order id was replaced: recover the booking from the order notes.
      const res = await fetch(`https://api.razorpay.com/v1/orders/${payment.order_id}`, { headers: { Authorization: razorpayAuth() } });
      const order = res.ok ? await res.json() : null;
      const bookingId = order?.notes?.booking_id;
      if (bookingId) booking = (await admin.from('bookings').select('*').eq('id', bookingId).maybeSingle()).data;
    }

    if (!booking) {
      console.error('Webhook: no booking for order', payment.order_id);
      return new Response('No booking', { status: 200 });
    }
    if (booking.status !== 'accepted') return new Response('Already handled', { status: 200 });
    if (payment.amount !== paise(booking.offer_amount) || payment.currency !== 'INR') {
      console.error('Webhook: amount mismatch for booking', booking.id);
      return new Response('Amount mismatch', { status: 200 });
    }

    const { error } = await admin.from('bookings')
      .update({
        status: 'paid', payment_method: 'razorpay', payment_order_id: payment.order_id, payment_id: payment.id,
        paid_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id).eq('status', 'accepted');
    if (error) throw error;
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error', error);
    return new Response('Retry', { status: 500 }); // Razorpay retries on non-2xx
  }
});

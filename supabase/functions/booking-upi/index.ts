import { adminClient, handler, HttpError, loadBooking, requireUser } from '../_shared/util.ts';

// Reveals the worker's UPI ID + mobile ONLY to the customer of an accepted booking.
Deno.serve(handler(async (req, body) => {
  const user = await requireUser(req);
  const admin = adminClient();
  const booking = await loadBooking(admin, body.booking_id);
  if (booking.customer_id !== user.id) throw new HttpError(403, 'Only the customer can see payment details.');
  if (booking.status !== 'accepted') throw new HttpError(409, 'Details are shared after the offer is accepted.');

  const { data, error } = await admin.from('worker_private').select('upi_id, mobile').eq('user_id', booking.worker_id).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Worker details are not available.');
  return { upi_id: data.upi_id, mobile: data.mobile };
}));

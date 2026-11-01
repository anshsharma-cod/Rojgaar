import { adminClient, env, handler, hmacHex, HttpError, loadBooking, requireUser, safeEqual } from '../_shared/util.ts';

const MAX_ATTEMPTS = 5;

Deno.serve(handler(async (req, body) => {
  const user = await requireUser(req);
  const admin = adminClient();
  const booking = await loadBooking(admin, body.booking_id);
  if (booking.customer_id !== user.id) throw new HttpError(403, 'Only the customer can confirm completion.');
  if (booking.status === 'completed') return { ok: true };
  if (booking.status !== 'paid') throw new HttpError(409, 'This booking is not awaiting completion.');

  const code = String(body.code ?? '');
  if (!/^\d{6}$/.test(code)) throw new HttpError(400, 'Enter the 6-digit code.');

  const { data: record, error } = await admin.from('booking_completion').select('*').eq('booking_id', booking.id).maybeSingle();
  if (error) throw error;
  if (!record) throw new HttpError(409, 'The worker has not issued a code yet.');
  if (new Date(record.expires_at).getTime() < Date.now()) throw new HttpError(410, 'This code expired. Ask the worker for a new one.');
  if (record.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Too many wrong attempts. Ask the worker for a new code.');

  await admin.from('booking_completion').update({ attempts: record.attempts + 1 }).eq('booking_id', booking.id);

  const expected = await hmacHex(env('COMPLETION_CODE_SECRET'), `${booking.id}:${code}`);
  if (!safeEqual(expected, record.code_hash)) throw new HttpError(400, 'That code is not correct.');

  const now = new Date().toISOString();
  const { error: updateError } = await admin.from('bookings')
    .update({ status: 'completed', completed_at: now, updated_at: now })
    .eq('id', booking.id).eq('status', 'paid');
  if (updateError) throw updateError;
  await admin.from('booking_completion').delete().eq('booking_id', booking.id);
  return { ok: true };
}));

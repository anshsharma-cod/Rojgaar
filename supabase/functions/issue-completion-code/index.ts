import { adminClient, env, handler, hmacHex, HttpError, loadBooking, requireUser } from '../_shared/util.ts';

Deno.serve(handler(async (req, body) => {
  const user = await requireUser(req);
  const admin = adminClient();
  const booking = await loadBooking(admin, body.booking_id);
  if (booking.worker_id !== user.id) throw new HttpError(403, 'Only the worker can issue the completion code.');
  if (booking.status !== 'paid') throw new HttpError(409, 'The code is available after payment is confirmed.');

  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
  const code_hash = await hmacHex(env('COMPLETION_CODE_SECRET'), `${booking.id}:${code}`);
  const { error } = await admin.from('booking_completion').upsert({
    booking_id: booking.id,
    code_hash,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    attempts: 0,
  });
  if (error) throw error;
  return { code };
}));

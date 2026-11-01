import { validVerhoeff } from '../_shared/id-validation.js';
import { adminClient, env, handler, hmacHex, HttpError, requireUser } from '../_shared/util.ts';

const SKILLS = ['Plumber', 'Electrician', 'Carpenter', 'Cleaner', 'Cook', 'Tutor', 'Driver', 'Delivery helper', 'Mechanic', 'Gardener', 'Tailor', 'Web developer', 'Designer', 'Other'];
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function registrationId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return 'RJ-' + [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

function text(value: unknown, min: number, max: number, label: string): string {
  const v = typeof value === 'string' ? value.trim() : '';
  if (v.length < min || v.length > max) throw new HttpError(400, `${label} is invalid.`);
  return v;
}

function mediaPath(value: unknown, userId: string, required: boolean): string {
  const v = typeof value === 'string' ? value : '';
  if (!v) {
    if (required) throw new HttpError(400, 'A profile photo is required.');
    return '';
  }
  if (!v.startsWith(`${userId}/`) || v.includes('..') || v.length > 200) throw new HttpError(400, 'Invalid media path.');
  return v;
}

Deno.serve(handler(async (req, body) => {
  const user = await requireUser(req);
  const admin = adminClient();

  // Retry-safe: a user who already enrolled just gets their existing row back.
  const existing = await admin.from('worker_directory').select('*').eq('user_id', user.id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return { enrollment: existing.data, reused: true };

  const full_name = text(body.full_name, 2, 80, 'Name');
  const mobile = String(body.mobile ?? '');
  if (!/^[6-9]\d{9}$/.test(mobile)) throw new HttpError(400, 'Enter a valid 10-digit mobile number.');
  const aadhaar = String(body.aadhaar ?? '');
  if (!validVerhoeff(aadhaar)) throw new HttpError(400, 'The ID number did not pass the format check.');
  const upi_id = text(body.upi_id, 5, 80, 'UPI ID');
  if (!/^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]{2,}$/.test(upi_id)) throw new HttpError(400, 'UPI ID is invalid.');
  const skill = String(body.skill ?? '');
  if (!SKILLS.includes(skill)) throw new HttpError(400, 'Choose a skill from the list.');
  const daily_rate = Number(body.daily_rate);
  if (!Number.isFinite(daily_rate) || daily_rate <= 0 || daily_rate > 1_000_000) throw new HttpError(400, 'Daily rate is invalid.');
  const experience_years = Number(body.experience_years);
  if (!Number.isFinite(experience_years) || experience_years < 0 || experience_years > 80) throw new HttpError(400, 'Experience is invalid.');
  const pincode = String(body.pincode ?? '');
  if (!/^\d{6}$/.test(pincode)) throw new HttpError(400, 'PIN code must be 6 digits.');
  const district = text(body.district, 1, 80, 'District');
  const state = text(body.state, 1, 80, 'State');
  const photo_path = mediaPath(body.photo_path, user.id, true);
  const audio_path = mediaPath(body.audio_path, user.id, false);

  // Keyed digest for duplicate prevention. The full ID is never stored or logged.
  const id_hmac = await hmacHex(env('ID_HASH_SECRET'), aadhaar);

  const dup = await admin.from('worker_private').select('user_id').or(`mobile.eq.${mobile},id_hmac.eq.${id_hmac}`).limit(1);
  if (dup.error) throw dup.error;
  if (dup.data?.length) throw new HttpError(409, 'That mobile number or ID is already enrolled.');

  let row = null;
  for (let attempt = 0; attempt < 5 && !row; attempt += 1) {
    const inserted = await admin.from('worker_directory').insert({
      user_id: user.id,
      registration_id: registrationId(),
      full_name,
      masked_mobile: `+91 ******${mobile.slice(-4)}`,
      skill, daily_rate, experience_years, pincode, district, state, photo_path, audio_path,
    }).select('*').single();
    if (!inserted.error) row = inserted.data;
    else if (inserted.error.code === '23505' && inserted.error.message.includes('user_id')) throw new HttpError(409, 'You are already enrolled.');
    else if (inserted.error.code !== '23505') throw inserted.error; // registration_id clash => retry
  }
  if (!row) throw new HttpError(500, 'Could not create a registration ID. Please try again.');

  const priv = await admin.from('worker_private').insert({
    user_id: user.id, mobile, upi_id, id_hmac, id_last4: aadhaar.slice(-4),
  });
  if (priv.error) {
    await admin.from('worker_directory').delete().eq('user_id', user.id);
    if (priv.error.code === '23505') throw new HttpError(409, 'That mobile number or ID is already enrolled.');
    throw priv.error;
  }
  return { enrollment: row, reused: false };
}));

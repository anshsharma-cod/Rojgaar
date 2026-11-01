import { handler, HttpError, requireUser } from '../_shared/util.ts';

Deno.serve(handler(async (req, body) => {
  await requireUser(req);
  const pincode = String(body.pincode ?? '');
  if (!/^\d{6}$/.test(pincode)) throw new HttpError(400, 'PIN code must be 6 digits.');

  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new HttpError(502, 'PIN code service is unavailable. Enter district and state manually.');
  const result = await response.json();
  const office = result?.[0]?.PostOffice?.[0];
  if (result?.[0]?.Status !== 'Success' || !office) throw new HttpError(404, 'PIN code not found. Enter district and state manually.');
  return { district: office.District ?? '', state: office.State ?? '' };
}));

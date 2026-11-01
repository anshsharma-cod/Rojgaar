import { createClient, SupabaseClient, User } from 'npm:@supabase/supabase-js@2';

const encoder = new TextEncoder();

export function corsHeaders(req: Request): Record<string, string> {
  const allowed = Deno.env.get('APP_ORIGIN') ?? '';
  const origin = req.headers.get('Origin') ?? '';
  const ok = origin && (origin === allowed || /^http:\/\/localhost:\d+$/.test(origin));
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Wraps a handler: CORS preflight, POST-only, JSON body, uniform error shape { error }. */
export function handler(fn: (req: Request, body: any) => Promise<unknown>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
    if (req.method !== 'POST') return json(req, { error: 'Method not allowed.' }, 405);
    try {
      let body: any = {};
      try {
        body = await req.json();
      } catch {
        throw new HttpError(400, 'Invalid JSON body.');
      }
      return json(req, await fn(req, body));
    } catch (error) {
      if (error instanceof HttpError) return json(req, { error: error.message }, error.status);
      console.error(error);
      return json(req, { error: 'Something went wrong on the server.' }, 500);
    }
  };
}

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(500, `Server is not configured (${name} missing).`);
  return value;
}

export function adminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(req: Request): Promise<User> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Please sign in.');
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Please sign in again.');
  return data.user;
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, 'Invalid booking.');
  }
  return value;
}

export async function loadBooking(admin: SupabaseClient, bookingId: unknown) {
  const { data, error } = await admin.from('bookings').select('*').eq('id', uuid(bookingId)).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Booking not found.');
  return data;
}

export function razorpayAuth(): string {
  return 'Basic ' + btoa(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`);
}

export function paise(amount: number | string): number {
  return Math.round(Number(amount) * 100);
}

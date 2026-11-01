# Rojgaar

Rojgaar combines its local task feed with an opt-in worker enrollment and
booking area. The new **Workers** tab includes English/Hindi UI, worker search,
camera/file photo upload, optional 15-second audio bio, PIN-code lookup,
availability, enrollment status, a downloadable QR registration card,
real-time chat, offers/counters, UPI and Razorpay checkout, and completion-code
confirmation.

## Local setup

Rojgaar does not include a hosted database. A project owner must create a
Supabase project in their own account; until then, sign-in, shared tasks, and
worker enrollment are intentionally unavailable. Without configuration the app
shows its public landing page; it does not pretend local browser data is shared
with real users.

The public worker/customer entry screens allow preparing a worker-profile or
task-request draft and sharing it through the user's own WhatsApp account.
These drafts are stored only in that browser's local storage; they are not
published to a public directory or shared task feed. Worker drafts deliberately
exclude Aadhaar, UPI, and phone-number fields until the secure backend is
configured.

1. Create a Supabase project in the project owner's account.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` using the Project URL and Publishable/anon key.
   Never use a `service_role` key or database password in a browser build.
3. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL
   Editor. If the original task app schema was already applied, run the updated
   file to add the worker, chat, booking, media, and Realtime tables/policies.
4. Configure Supabase Auth site/redirect URLs and email delivery. SMS is not
   configured: the mobile number is uniqueness-checked, **not OTP-verified**.
5. Install and start the web app:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

The app shell is a PWA and caches its UI for offline startup. Enrollment drafts
save only non-sensitive text locally; full ID, mobile, UPI, photo, and audio
are excluded from local storage. If a submission loses connectivity while the
enrollment screen remains open, it retries when connectivity returns. After a
refresh, the user must re-enter the excluded fields and re-select media.
Directory, chat, and payment require a network connection.

## Edge Functions and secrets

Deploy these functions with the Supabase CLI after linking the project:

```powershell
supabase functions deploy enroll-worker
supabase functions deploy lookup-pincode
supabase functions deploy booking-upi
supabase functions deploy razorpay-order
supabase functions deploy razorpay-verify
supabase functions deploy issue-completion-code
supabase functions deploy complete-booking
supabase functions deploy razorpay-webhook --no-verify-jwt
```

In Supabase Function secrets, configure:

- `ID_HASH_SECRET`: a private random secret of at least 32 characters.
- `COMPLETION_CODE_SECRET`: a separate private random secret of at least 32 characters.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: from the Razorpay account.
- `RAZORPAY_WEBHOOK_SECRET`: the webhook secret configured in Razorpay.
- `APP_ORIGIN`: the exact production origin, for example `https://rojgaar.example`.

Supabase provides the project URL, anon key, and service-role key to Edge
Functions. Keep all secrets in Supabase's secret manager; do not put them in
`.env.local`, browser JavaScript, or chat. Configure the Razorpay webhook URL
as `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook` and enable
the `payment.captured` event. Use Razorpay test credentials before switching
to live keys.

## ID data, verification, and privacy boundaries

- The ID field is format/checksum-checked in the browser and secure Edge
  Function. The full value is sent over TLS for a keyed-HMAC duplicate check,
  then discarded; it is **not** stored in the database or local storage.
- Supabase retains only the final four digits and a keyed digest for duplicate
  prevention. A checksum/HMAC does **not** verify the holder's identity.
- The worker card explicitly says **ID unverified**. Rojgaar registration IDs
  are not government identity documents. No KYC provider is integrated.
- Phone numbers are unique but are not ownership-verified until an approved
  SMS provider/OTP flow is configured.
- Worker name, skill, service area, rate, profile image, and consented audio
  bio are visible to signed-in directory users. UPI ID and full mobile number
  stay private until a worker accepts a booking.
- Users must explicitly consent before their photo/profile and optional audio
  bio are listed. Provide a privacy notice and deletion/contact process before
  public launch.

## Payments and booking limits

- Direct UPI displays a QR/deep link. It is an external transfer; Rojgaar
  cannot verify, reverse, or refund it. The worker must confirm receipt before
  a completion code can be issued.
- Razorpay charges the **full agreed booking amount** after an accepted offer.
  Payment is verified server-side and by webhook.
- Standard Razorpay checkout is **not escrow**. Rojgaar does not hold funds for
  later release or implement split settlements/payouts. Do not describe this
  as escrow or promise a payment release. The completion code confirms
  completion in the app only.
- The completion code is shared in-app with the worker, who must relay it to
  the customer. SMS/WhatsApp notifications are not configured.
- Payment/provider secrets, webhook delivery, account approval, dispute
  handling, privacy terms, and Indian legal/compliance review must be completed
  before a real public launch.

To create a production build, run `npm.cmd run build`; use `npm.cmd run preview`
to inspect it locally. Set the two `VITE_SUPABASE_*` public values in the
hosting provider's build environment and configure the production domain in
Supabase Auth and `APP_ORIGIN`.

## Landing page 3D (black hole + stickman archer)

- `BlackHole.jsx` — full-page WebGL black hole background (click = shockwave).
- `StickmanArcher.jsx` + `ik.js` — 3D stickman falls on the word "ko", dusts off, aims and shoots the R.
- Uses the `three` package (already in package.json). Respects prefers-reduced-motion.

# TruOTP Client API Guide

This guide explains how your app can integrate with TruOTP to authenticate users via WhatsApp and manage usage, credits, and account data.

All endpoints return JSON in this envelope unless noted:

```json
{ "success": boolean, "message"?: string, "data"?: any }
```

## Base URL
- Production: https://<your-domain>/api
- Staging/Local: http://localhost:3000/api

From a browser-based client hosted on the same domain as the API, prefer same-origin calls (no CORS issues). See `docs/STEP_BY_STEP.md` for deployment notes and using `NEXT_PUBLIC_API_URL=/api`.

## Authentication
Most endpoints require a Bearer token in the `Authorization` header.

- Header: `Authorization: Bearer <token>`
- Token lifetime: ~24 hours by default (see `lib/jwt.ts`). Sessions are also tracked in the database.
- On 401/403, prompt the user to re-authenticate.

You can obtain a token via one of these flows:

- WhatsApp QR Login (recommended)
- Email/Phone + Password Login
- Registration with QR/OTP over WhatsApp
- Password Reset (OTP over WhatsApp)

---

## WhatsApp QR Login Flow
Enable your users to log in by scanning a QR that opens WhatsApp with a pre-filled one-time hash message.

### 1) Request a WhatsApp QR
`POST /auth/request-whatsapp-qr`

Body:
```json
{ "phone": "+919876543210" }
```
Notes:
- Phone normalization: If you send a 10-digit Indian mobile number (e.g. `9876543210`), the server normalizes to `91xxxxxxxxxx` using `DEFAULT_COUNTRY_CODE` (default 91). See `app/api/auth/request-whatsapp-qr/route.ts`.

Response (200):
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",    // QR to render directly
    "hash": "<one-time-hash>",                // Track this hash to poll later
    "expiresAt": "2025-01-01T00:00:00.000Z",
    "whatsappUrl": "https://wa.me/91...?...", // Optional link alternative to QR
    "message": "<one-time-hash>",
    "companyNumber": "919212079494",
    "instructions": "Scan and send the message in WhatsApp"
  }
}
```
CORS: This endpoint allows cross-origin POST and OPTIONS so you can embed it from another domain.

Display either the `qrCode` image or provide a button linking to `whatsappUrl`.

### 2) User sends the pre-filled message in WhatsApp
Your user scans the QR and hits send. Our bot verifies the login request server-side.

### 3) Poll verification status
`GET /auth/verify-qr-status/{hash}`

Responses:
- Pending: `{ "success": true, "data": { "status": "pending" } }`
- Expired: `{ "success": true, "data": { "status": "expired" } }`
- Verified: `{ "success": true, "data": { "status": "verified", "token": "...", "user": { "id": 123, "phone": "91..." } } }`
- Mismatch/Failure: `{ "success": false, "message": "Phone number mismatch..." }`

On Verified, store the `token` server-side (HTTP-only cookie or secure storage) and start calling protected endpoints with the Bearer header.

Example (browser/Node):
```ts
// Step 1: get QR
const qrRes = await fetch("/api/auth/request-whatsapp-qr", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone: "+919876543210" })
}).then(r => r.json());

// Render qrRes.data.qrCode in an <img> or link to qrRes.data.whatsappUrl
const { hash } = qrRes.data;

// Step 3: poll
let token: string | null = null;
for (let i = 0; i < 30; i++) {
  const st = await fetch(`/api/auth/verify-qr-status/${hash}`).then(r => r.json());
  if (!st.success && st.message) throw new Error(st.message);
  if (st.data?.status === "verified") { token = st.data.token; break; }
  if (st.data?.status === "expired") throw new Error("QR expired, retry");
  await new Promise(r => setTimeout(r, 2000));
}
```

---

## Email/Phone + Password Login
`POST /auth/login`

Body:
```json
{ "identifier": "user@example.com or phone", "password": "secret" }
```
- Phone normalization is applied similar to QR (default country code).
- On success you receive a Bearer token.

Response (200):
```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": { "id": 123, "phone": "91...", "email": "user@example.com", "name": "Jane" }
  }
}
```

## Registration (OTP via WhatsApp)
Two-step flow using OTP delivered via WhatsApp.

1) Initiate: `POST /auth/register-initiate`
```json
{ "name": "Jane", "email": "jane@example.com", "phone": "+919876543210", "password": "secret" }
```
- Creates an OTP and sends it via WhatsApp.

2) Verify: `POST /auth/register-verify`
```json
{ "name": "Jane", "email": "jane@example.com", "phone": "+919876543210", "password": "secret", "code": "123456" }
```
- On success, returns a token and user. New users receive welcome credits.

## Password Reset (OTP via WhatsApp)
1) Initiate: `POST /auth/password-reset-initiate`
```json
{ "phone": "+919876543210" }
// or { "email": "user@example.com" }
```
2) Verify: `POST /auth/password-reset-verify`
```json
{ "phone": "+919876543210", "code": "123456", "newPassword": "new-secret" }
```
- On success, returns a token and user.

---

## Protected Endpoints (require Bearer token)
Include `Authorization: Bearer <token>` in each request.

### Get current user and gating
`GET /auth/me`
- Returns user info and gating/trial status.

### Profile
- `GET /auth/profile` → user info
- `PUT /auth/profile` → update name
```json
{ "name": "New Name" }
```

### Settings
- `GET /auth/settings` → notification and session prefs
- `PUT /auth/settings`
```json
{
  "notifyEmail": true,
  "notifyWhatsApp": true,
  "loginAlerts": false,
  "compactMode": false,
  "language": "en",
  "sessionExpire": 120
}
```

### Usage (consume 1 credit)
`POST /usage`
- Deducts one auth credit and returns remaining.
- Trial gating: may return 403 with a `purchaseLink` if paused.

Response (200): `{ "success": true, "data": { "remaining": 9 } }`
Response (403): `{ "success": false, "message": "Free trial access paused...", "data": { "reason": "credits_exhausted|inactive_90d", "purchaseLink": "..." } }`

### Usage Logs (credit/debit ledger)
`GET /usage-logs?type=credit|debit&limit=200`

### Transactions (payments)
`GET /transactions?status=success|failed&limit=100`

### Sessions (devices/IPs)
`GET /sessions?limit=50`

### Dashboard data
- `GET /dashboard/summary`
- `GET /dashboard/metrics`
- `GET /dashboard/auth-report`
- `GET /dashboard/transactions` (placeholder)
- `GET /dashboard/usage-report` (placeholder)

### Support Tickets
- `GET /dashboard/tickets`
- `POST /dashboard/tickets`
```json
{ "subject": "Help needed", "message": "Details..." }
```

---

## Packages and Credits
- `GET /packages` → list available packages
- `POST /package/purchase`
  - For now this is a simulated purchase endpoint helpful for testing.
  - Body:
  ```json
  { "packageId": 1, "method": "simulated", "simulateStatus": "success" }
  ```

---

## API Credentials and Webhooks
Your account can have Live and Test API keys and a user-specific webhook token.

- `GET /credentials` → returns `{ keys: { live, test }, webhookUrl }`
- `POST /credentials/regenerate-key` with `{ "type": "live"|"test" }` → rotate a key
- `POST /credentials/rotate-webhook` → rotates your webhook token and returns the new webhook URL

Incoming Webhook (token-in-path):
- `POST /webhook/incoming/{token}`
- Body: any JSON; accepted if `{token}` matches your configured webhook token.
- Response: `{ "success": true }` on acceptance.

Note: Current protected endpoints authenticate via Bearer token. API keys are issued and managed now for future server-to-server endpoints; do not include them in the `Authorization` header unless specified in new endpoints.

---

## Public Utilities
- `POST /contact` → send a contact message to support
```json
{ "email": "you@example.com", "phone": "+919876543210", "message": "Hi" }
```

---

## Error Handling
Common statuses:
- 200: `{ success: true, data: ... }`
- 400: validation or invalid OTP/hash
- 401: `Access token required` or `Invalid or expired session`
- 403: account blocked or trial gating
- 5xx: server errors

Implement retries for polling endpoints and handle `expired` status by restarting the QR flow.

---

## Security Notes
- Always use HTTPS.
- Store tokens securely (prefer HTTP-only cookies on your server).
- Tokens expire; handle 401/403 and re-authentication gracefully.
- Phone numbers are normalized using `DEFAULT_COUNTRY_CODE` (default `91`). Send E.164 where possible.
- Some auth-init endpoints enable CORS (`/auth/request-whatsapp-qr`); most protected endpoints assume same-origin calls.

---

## Why TruOTP? Benefits for Your App
- Lower friction vs SMS OTP: Users authenticate by sending a WhatsApp message, reducing drop-off.
- Fast integration: 2 endpoints to implement the WhatsApp login (request QR + poll status).
- Secure by design: Phone verification via WhatsApp plus server-issued JWT.
- Built-in trial and credits: Start with welcome credits; move to paid packages seamlessly.
- Observability: Usage logs, metrics, and session tracking endpoints provided.
- Webhooks: Simple token-based incoming webhook to integrate external events.

---

## Support
- Use `POST /contact` or email info@truotp.com.
- See also: `docs/STEP_BY_STEP.md` for environment and deployment tips.

# pta-security-hardening - Work Plan

## TL;DR (For humans)
**What you'll get:** Nine backend security fixes based on a real penetration test — PII no longer leaks from APIs, IC numbers are removed from JWT tokens, rate limiting blocks enumeration/abuse, files are protected behind login, and security headers are added. No changes to the website look or feel.

**Why this approach:** Each fix targets one confirmed vulnerability from the pentest. Focus is on the backend API only — the frontend already handles XSS safely (React). Changes are minimal, isolated, and don't touch business logic.

**What it will NOT do:** Change the frontend/UI, add new features, modify database schema, change how complaints/technicians/admin workflow operates (except response data shaping).

**Effort:** Medium — 9 focused tasks, all backend-only, well-defined boundaries
**Risk:** Low — each change isolated to response-shaping and middleware; no core business logic touched
**Decisions to sanity-check:** (1) Unified error messages mean attackers can't distinguish "user exists" from "user doesn't exist" (intentional). (2) Admin still sees full PII in complaint responses. (3) Passwords still emailed in admin reset flow (acceptable risk — goes to user's own inbox).

Your next move: Approve this plan. Full execution detail follows below.

---

> **TL;DR (machine):** Medium effort. Low risk. 9 backend-only tasks: strip PII from APIs, remove IC from JWT, unified auth errors, express-rate-limit, helmet, secure upload path+filenames. No frontend/UI work.

## Scope
### Must have
- Remove PII (IC number, address, phone) from all user-facing API responses
- Remove IC number from JWT payload (keep only UUID + role)
- Unify error messages on forgot-password and login to prevent user enumeration
- Add rate limiting to all auth endpoints (express-rate-limit)
- Add security headers (helmet middleware: HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- Disable Express `x-powered-by` header
- Remove public `express.static('/uploads')` — serve files through authenticated route
- Replace original filenames with UUID-based filenames on upload
- Harden MIME validation on file upload

### Must NOT have (guardrails, anti-slop, scope boundaries)
- ❌ No frontend/React/UI changes whatsoever
- ❌ No database migrations (schema changes)
- ❌ No new API endpoints (except replacing /uploads static with auth-gated route)
- ❌ No changes to business logic (complaint workflow, technician assignment, admin operations, notifications)
- ❌ No changes to master data endpoints (categories, brands, states — intentionally public)
- ❌ No changes to admin PII visibility — admins keep full access
- ❌ No changes to password-in-email admin reset flow
- ❌ No refactoring beyond what's needed for security fixes
- ❌ No CI/CD, deployment, or Docker changes

## Verification strategy
> Zero human intervention — all verification is agent-executed.
- **Test decision:** Tests-after — each task verified via curl commands against the running API (or direct code inspection where runtime test requires a live DB)
- **Evidence:** `.omop/evidence/task-<N>-pta-security-hardening.md`

## Execution strategy
### Parallel execution waves
- **Wave 1 (4 tasks — fully independent):** Tasks 1, 2, 3, 4 — can run in parallel
- **Wave 2 (3 tasks — depend on Wave 1):** Tasks 5, 6, 7 — can run in parallel after Wave 1
- **Wave 3 (2 tasks — depend on Wave 1):** Tasks 8, 9 — can run in parallel after Wave 1
- No tasks depend on each other within Wave 2 or Wave 3

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1. helmet + security headers | — | — | 2, 3, 4 |
| 2. express-rate-limit | — | — | 1, 3, 4 |
| 3. Remove IC from JWT | — | — | 1, 2, 4 |
| 4. Upload filename + MIME | — | — | 1, 2, 3 |
| 5. Unified auth errors | — | — | 6, 7, 8, 9 |
| 6. Strip PII from register | 3 (JWT cleanup concept) | — | 5, 7, 8, 9 |
| 7. Strip PII from profile | 3 (JWT cleanup concept) | — | 5, 6, 8, 9 |
| 8. Scope complaint user data | — | — | 5, 6, 7, 9 |
| 9. Auth-gated upload route | — | — | 5, 6, 7, 8 |

> **Note:** Tasks 5-9 have no true code dependency on tasks 1-4 (they edit different files). Suggested grouping is for orderly execution — all 9 can technically run in parallel.

## Todos
> Implementation + verification = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->

### Wave 1 — Security infrastructure (independent)

- [ ] 1. **Add helmet + security headers + disable x-powered-by**
  **What to do:** In `backend/src/index.ts`, add `helmet` middleware and disable Express fingerprinting.
  1. Install `helmet` package: run `npm install helmet` in backend directory
  2. Import helmet: `import helmet from 'helmet';`
  3. Add `app.use(helmet({ contentSecurityPolicy: false }));` before other middleware (line ~56). CSP disabled because the frontend SPA manages its own CSP.
  4. Add `app.disable('x-powered-by');` before middleware (line ~56).
  5. Add explicit security headers via a custom middleware after helmet:
     ```
     app.use((req, res, next) => {
       res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
       res.setHeader('X-Frame-Options', 'DENY');
       res.setHeader('X-Content-Type-Options', 'nosniff');
       res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
       res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
       next();
     });
     ```
  **Must NOT do:** Do not enable helmet CSP (contentSecurityPolicy: true) — the frontend SPA manages CSP via Vite and enabling helmet CSP would conflict. Do not change the CORS config.
  **References:** `backend/src/index.ts:56-78` (middleware section)
  **Acceptance criteria:** Run `curl -sI https://api.ptas.my/api/health` (or local equivalent). Verify headers present: `strict-transport-security`, `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy`. Verify `x-powered-by: Express` is ABSENT.
  **QA scenarios:** `curl -sI http://localhost:3000/api/health | findstr /i "x-frame-options strict-transport-security x-content-type-options referrer-policy x-powered-by"` — expect headers present, x-powered-by absent.
  **Evidence:** `.omop/evidence/task-1-pta-security-hardening.txt` (curl output)
  **Commit:** `feat(security): add helmet middleware, security headers, disable x-powered-by`

- [ ] 2. **Add rate limiting to auth endpoints**
  **What to do:** Install `express-rate-limit` and create a rate-limit middleware, then apply to all auth routes.
  1. Install: `npm install express-rate-limit` in backend directory
  2. Create `backend/src/middleware/rateLimit.ts`:
     ```typescript
     import rateLimit from 'express-rate-limit';

     // Strict limit for sensitive auth endpoints (forgot-password, reset-password, verify-otp)
     export const authStrictLimiter = rateLimit({
       windowMs: 60 * 1000, // 1 minute
       max: parseInt(process.env.RATE_LIMIT_AUTH_STRICT || '5', 10),
       message: { error: 'Too many requests. Please try again later.' },
       standardHeaders: true,
       legacyHeaders: false,
     });

     // Moderate limit for registration and login
     export const authModerateLimiter = rateLimit({
       windowMs: 60 * 1000, // 1 minute
       max: parseInt(process.env.RATE_LIMIT_AUTH_MODERATE || '10', 10),
       message: { error: 'Too many requests. Please try again later.' },
       standardHeaders: true,
       legacyHeaders: false,
     });

     // General API rate limit (generous — prevents DoS)
     export const generalLimiter = rateLimit({
       windowMs: 60 * 1000, // 1 minute
       max: parseInt(process.env.RATE_LIMIT_GENERAL || '100', 10),
       message: { error: 'Too many requests. Please try again later.' },
       standardHeaders: true,
       legacyHeaders: false,
     });
     ```
  3. In `backend/src/routes/auth.routes.ts`, import and apply:
     - `authStrictLimiter` on: forgot-password, reset-password, verify-otp, verify-signup-otp, resend-signup-otp, verify-activation-otp, resend-activation-otp
     - `authModerateLimiter` on: register, login, google, verify-ic
  4. In `backend/src/index.ts`, add `generalLimiter` as a catch-all after routes (before error handler): `app.use(generalLimiter);`
  5. Add to `.env.example` the new env vars: `RATE_LIMIT_AUTH_STRICT=5`, `RATE_LIMIT_AUTH_MODERATE=10`, `RATE_LIMIT_GENERAL=100`
  **Must NOT do:** Do not apply rate limiting to GET endpoints (health, categories, brands, states). Do not rate-limit static file serving.
  **References:** `backend/src/routes/auth.routes.ts:1-50` (all route definitions), `backend/src/index.ts:56-78` (middleware section)
  **Acceptance criteria:** Hit `POST /api/auth/forgot-password` 6 times in 1 second with any payload. The 6th request should return 429 `{"error":"Too many requests..."}`
  **QA scenarios:** `for /l %i in (1,1,7) do curl -s -X POST http://localhost:3000/api/auth/forgot-password -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\"}"` — 6th+ request returns 429.
  **Evidence:** `.omop/evidence/task-2-pta-security-hardening.txt` (curl output showing 429)
  **Commit:** `feat(security): add express-rate-limit middleware to auth endpoints`

- [ ] 3. **Remove IC number from JWT payload**
  **What to do:** In `backend/src/controllers/auth.controller.ts`, modify all JWT generation to exclude `ic_number`.
  1. Change `createUserToken()` (line 42-46):
     ```typescript
     const createUserToken = (user: UserRow): string => jwt.sign(
         { id: user.id, role: 'user' },
         JWT_SECRET,
         { expiresIn: JWT_EXPIRES_IN } as SignOptions
     );
     ```
  2. Change `forgotPassword` / `login` flow — line 921 `tokenPayload = { id: user.id, role: 'user', ic_number: user.ic_number }` → `tokenPayload = { id: user.id, role: 'user' }`
  3. In `verifyIC()` (line 289), change `jwt.sign({ id: user.id, role: 'user', ic_number: user.ic_number }, ...)` → `jwt.sign({ id: user.id, role: 'user' }, ...)`
  4. In `register()` (line 401-406), change payload to exclude ic_number
  5. In `verifyActivationOtp()` (line 563-567), no change needed (admin/tech tokens don't include IC)
  6. In `googleAuth()`, find all `createUserToken()` calls — already fixed by step 1
  7. Update `JwtPayload` type in `backend/src/types/index.ts` — remove `ic_number?: string` from the interface
  **Must NOT do:** Do not modify how IC is stored in DB. Do not remove IC from the `UserRow` type — it's still needed for DB queries.
  **References:** 
    - `backend/src/controllers/auth.controller.ts:42-46` (createUserToken)
    - `backend/src/controllers/auth.controller.ts:289` (verifyIC JWT)
    - `backend/src/controllers/auth.controller.ts:401-406` (register JWT)
    - `backend/src/controllers/auth.controller.ts:921` (login tokenPayload)
    - `backend/src/types/index.ts:198-203` (JwtPayload type)
  **Acceptance criteria:** Register or login, decode the JWT with `jwt.io` or `echo <token> | jwt-cli decode`. The payload should contain ONLY `id`, `role`, `iat`, `exp`. No `ic_number`.
  **QA scenarios:**
    ```
    TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"ic_number\":\"900101011234\",\"password\":\"Test1234!\",\"role\":\"user\"}" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")
    echo $TOKEN | node -e "process.stdin.on('data',d=>console.log(Buffer.from(d.toString().split('.')[1],'base64').toString()))"
    ```
    — Verify output has `{"id":"...","role":"user",...}` without `ic_number`.
  **Evidence:** `.omop/evidence/task-3-pta-security-hardening.txt` (decoded JWT output)
  **Commit:** `fix(security): remove IC number from JWT payload`

- [ ] 4. **Harden file upload: UUID filenames + real MIME validation**
  **What to do:** In `backend/src/middleware/upload.ts` and `backend/src/controllers/complaints.controller.ts`, fix two issues: (a) use UUID-based filenames instead of original filename, (b) validate actual file content (not just MIME header).
  
  **Part A — Filename sanitization:**
  1. In `backend/src/utils/storage.ts`, modify the `saveFile()` function to generate a UUID-based filename:
     ```typescript
     import { randomUUID } from 'crypto';
     import path from 'path';
     
     export const saveFile = (
         subdir: string,
         fileName: string,  // this will now be overridden
         buffer: Buffer,
         baseUrl?: string
     ): UploadResult => {
         const ext = path.extname(fileName).toLowerCase() || '.bin';
         // Only allow safe extensions
         const safeExts = ['.jpg', '.jpeg', '.png', '.pdf', '.heic', '.heif'];
         const safeExt = safeExts.includes(ext) ? ext : '.bin';
         const safeName = `${randomUUID()}${safeExt}`;
         // ... rest of function using safeName instead of fileName
     ```
  2. Update the `saveFile` callers to understand the new naming scheme. In `complaints.controller.ts`, change line 462:
     ```typescript
     const fileName = `${Date.now()}_${file.originalname}`;  // OLD
     ```
     → Just pass `file.originalname` — `saveFile()` now handles sanitization.
  3. Also update `users.controller.ts:223` (avatar upload) similarly.
  
  **Part B — Real MIME validation:**
  1. Since `file-type` or `magic-number` detection isn't in the dependencies, improve the existing `fileFilter` in `upload.ts` to be stricter:
     - Check both MIME type AND file extension (already done partially)
     - Add file magic byte signature checking using a simple buffer check:
       ```typescript
       // Additional: check file magic bytes for known formats
       const magicBytes: Record<string, Uint8Array[]> = {
           'image/jpeg': [new Uint8Array([0xFF, 0xD8, 0xFF])],
           'image/png': [new Uint8Array([0x89, 0x50, 0x4E, 0x47])],
           'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
       };
       ```
     - Since multer's fileFilter doesn't have access to the buffer, this check should be added to the controller BEFORE saveFile is called.
  2. In `complaints.controller.ts`, before calling `saveFile()`, read the first few bytes of the buffer and verify they match the expected magic bytes for the declared MIME type. Reject if mismatch.
  3. For simplicity (without adding new packages), validate at minimum:
     - JPEG starts with `FF D8 FF`
     - PNG starts with `89 50 4E 47`
     - PDF starts with `25 50 44 46`
  
  **Must NOT do:** Do not add new npm packages for MIME detection (keep dependencies minimal). Do not change the file storage structure on disk (subdirectories stay). Do not break existing uploaded file URLs (old files remain accessible via their original paths).
  **References:**
    - `backend/src/utils/storage.ts:25-42` (saveFile function)
    - `backend/src/middleware/upload.ts:7-20` (fileFilter)
    - `backend/src/controllers/complaints.controller.ts:460-480` (filename generation)
    - `backend/src/controllers/users.controller.ts:221-232` (avatar upload)
  **Acceptance criteria:** Upload a file with original name `test<script>.png` — verify it's stored as a UUID-based name like `550e8400-e29b-41d4-a716-446655440000.png`. Try uploading an SVG file with MIME spoofed as `image/png` — verify magic-byte check rejects it or stores it safely.
  **QA scenarios:**
    ```bash
    # Create test SVG with .png extension
    echo '<svg onload="alert(1)"><circle/></svg>' > evil.png
    curl -X POST http://localhost:3000/api/complaints \
      -H "Authorization: Bearer $TOKEN" \
      -F "category_id=1" -F "subcategory=Test" -F "complaint_type=Over Warranty" \
      -F "state=Selangor" -F "brand_name=Test" -F "details=Test upload security" \
      -F "warranty_file=@evil.png;type=image/png"
    ```
    — Verify response doesn't include original filename and file is stored as UUID.
  **Evidence:** `.omop/evidence/task-4-pta-security-hardening.txt` (upload test output)
  **Commit:** `fix(security): UUID-based filenames and magic-byte MIME validation on upload`

### Wave 2 — PII and enumeration fixes (independent of each other after Wave 1)

- [ ] 5. **Unified error messages to prevent user enumeration**
  **What to do:** In `backend/src/controllers/auth.controller.ts`, change `forgotPassword()` and `login()` to return identical responses regardless of whether the user exists.
  
  **forgotPassword() — lines 1034-1077:**
  - Change to ALWAYS return a generic success message, even if user not found:
    ```typescript
    if (!user) {
        // Always return same message to prevent enumeration
        res.json({ message: 'If your account exists, an OTP has been sent to your registered email.' });
        return;
    }
    ```
  - Remove the email from the response entirely (line 1072 currently returns `email:`). Change to:
    ```typescript
    res.json({ message: 'If your account exists, an OTP has been sent to your registered email.' });
    ```
  
  **login() — lines 902-1032:**
  - Change the "user not found" branch (line 918):
    ```typescript
    if (!data || data.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }
    ```
  - Change the "wrong password" branch (line 984):
    ```typescript
    if (!validPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }
    ```
  - For admin/technician roles (lines 925, 931, 938), unify all error messages to `'Invalid credentials'`
  
  **verifyIC() — lines 273-298:**
  - This endpoint is the WORST offender — it reveals registered=true/false AND returns full PII.
  - Change to return identical response for both cases:
    ```typescript
    if (!data || data.length === 0) {
        res.json({ registered: false });  // No error message, no distinction
        return;
    }
    // Always return minimal, same-shaped response:
    res.json({ registered: true });
    ```
  - Remove the full user object and token from the response.
  
  **Must NOT do:** Do not remove the actual business logic (OTP still sent to real users). Do not log sensitive info differently (server-side logging is fine — only the HTTP response must be unified).
  **References:**
    - `backend/src/controllers/auth.controller.ts:1034-1077` (forgotPassword)
    - `backend/src/controllers/auth.controller.ts:902-1032` (login)
    - `backend/src/controllers/auth.controller.ts:273-298` (verifyIC)
  **Acceptance criteria:**
    - `POST /api/auth/forgot-password` with valid IC → `{"message":"If your account exists, an OTP has been sent to your registered email."}`
    - `POST /api/auth/forgot-password` with invalid IC → EXACTLY SAME response
    - `POST /api/auth/login` with valid IC + wrong password → `{"error":"Invalid credentials"}`
    - `POST /api/auth/login` with invalid IC → EXACTLY SAME `{"error":"Invalid credentials"}`
    - `POST /api/auth/verify-ic` with any IC → NO PII, no token in response
  **QA scenarios:**
    ```bash
    curl -s -X POST http://localhost:3000/api/auth/forgot-password -H "Content-Type: application/json" -d '{"ic_number":"000000000000"}' 
    curl -s -X POST http://localhost:3000/api/auth/forgot-password -H "Content-Type: application/json" -d '{"ic_number":"900101011234"}'
    # Both must return identical response text
    ```
  **Evidence:** `.omop/evidence/task-5-pta-security-hardening.txt` (comparison of both responses)
  **Commit:** `fix(security): unify auth error messages to prevent user enumeration`

- [ ] 6. **Strip PII from registration API response**
  **What to do:** In `backend/src/controllers/auth.controller.ts`, modify the `register()` function to NOT return the full user object in the response.
  
  1. At line 372-377, change the success response from:
     ```typescript
     res.status(200).json({
         message: 'Pendaftaran berjaya! Sila semak e-mel anda untuk kod OTP pengesahan.',
         user: stripPasswordHash(user),   // <-- THIS returns full user with IC, address, phone
         requires_otp: true,
         email: user.email
     });
     ```
     To:
     ```typescript
     res.status(200).json({
         message: 'Pendaftaran berjaya! Sila semak e-mel anda untuk kod OTP pengesahan.',
         requires_otp: true,
         email: user.email
     });
     ```
  
  2. At line 408-413, change the auto-login response from:
     ```typescript
     res.status(200).json({
         message: 'Pendaftaran berjaya! Akaun anda telah diaktifkan.',
         user: stripPasswordHash(user),   // <-- returns all PII
         requires_otp: false,
         token
     });
     ```
     To (keep token since it's an auto-login scenario, but strip PII):
     ```typescript
     res.status(200).json({
         message: 'Pendaftaran berjaya! Akaun anda telah diaktifkan.',
         requires_otp: false,
         token
     });
     ```
  
  3. In `verifySignupOtp()` at line 476-481, change:
     ```typescript
     res.json({
         message: 'Akaun berjaya disahkan dan diaktifkan!',
         user: stripPasswordHash(user),   // <-- PII leak
         token,
         role: 'user'
     });
     ```
     To:
     ```typescript
     res.json({
         message: 'Akaun berjaya disahkan dan diaktifkan!',
         token,
         role: 'user'
     });
     ```
  
  4. In `googleAuth()` function — all responses that include `user: stripPasswordHash(...)` should be updated similarly. There are ~6 places in googleAuth where the user object is returned. Every one should remove the user PII object from the response (keep token, messages, flags).
  
  **Must NOT do:** Do not change the `stripPasswordHash` function itself (it's also used server-side). Do not remove the `token` from responses (it's needed for auto-login). Do not change the Google auth responses for `intent === 'login'` path where redirect_to_register is set — those don't include user objects.
  **References:**
    - `backend/src/controllers/auth.controller.ts:372-377` (register with OTP response)
    - `backend/src/controllers/auth.controller.ts:408-413` (register auto-login response)
    - `backend/src/controllers/auth.controller.ts:476-481` (verifySignupOtp response)
    - `backend/src/controllers/auth.controller.ts:630-900` (googleAuth — multiple response blocks with user objects)
  **Acceptance criteria:** Register a new user. Response should contain ONLY `message`, `requires_otp`, `email` (when applicable), and `token` (when applicable). No `user` field with `ic_number`, `full_name`, `contact_no`, or `address`.
  **QA scenarios:**
    ```bash
    # Register and capture response
    curl -s -X POST http://localhost:3000/api/auth/register \
      -H "Content-Type: application/json" \
      -d '{"full_name":"Test User","ic_number":"991010101234","email":"test99@test.com","contact_no":"0123456789","address":"123 Jalan Test","password":"Test1234!"}' \
      | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log('has user field:',!!r.user);console.log('fields:',Object.keys(r))})"
    ```
    — Verify `r.user` is undefined/absent.
  **Evidence:** `.omop/evidence/task-6-pta-security-hardening.txt` (registration response)
  **Commit:** `fix(security): remove PII from registration API responses`

- [ ] 7. **Strip PII from profile API responses**
  **What to do:** In both `auth.controller.ts:getProfile()` and `users.controller.ts:getProfile()`, remove sensitive PII fields (ic_number, address, contact_no) from the response. Return only non-sensitive fields.
  
  **users.controller.ts:getProfile() — lines 10-28:**
  Change from:
  ```typescript
  const { password_hash, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
  ```
  To a whitelist approach:
  ```typescript
  const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      state: user.state,
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at
  };
  res.json({ user: safeUser });
  ```
  
  **auth.controller.ts:getProfile() — lines 1140-1161:**
  Same change — apply the same safeUser whitelist.
  
  **For admin/technician profiles** (`admin.controller.ts:getAdminProfile` lines 406-428):
  Keep as-is. Admins/technicians see their own non-PII profile data. The admin table has admin_name, username, email, contact_number — these are professional contact details, not PII in the same sense.
  
  **Must NOT do:** Do not change admin profile endpoint. Do not change profile UPDATE functionality (the update can still modify all fields — only the GET response is scoped). The frontend might rely on receiving the full profile — verify frontend behavior is acceptable (the user's own dashboard should work with limited profile data).
  **References:**
    - `backend/src/controllers/users.controller.ts:10-28` (getProfile)
    - `backend/src/controllers/auth.controller.ts:1140-1161` (getProfile via auth)
    - `backend/src/controllers/admin.controller.ts:406-428` (admin getProfile — keep as-is)
  **Acceptance criteria:** Login as user, call `GET /api/users/profile` with JWT. Response should have `user` object with only: `id`, `full_name`, `email`, `state`, `status`, `created_at`, `updated_at`. NO `ic_number`, `contact_no`, `address`, `password_hash`, `password_plain`.
  **QA scenarios:**
    ```bash
    curl -s http://localhost:3000/api/users/profile -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log('fields:',Object.keys(r.user));console.log('has ic_number:',!!r.user.ic_number);console.log('has contact_no:',!!r.user.contact_no);console.log('has address:',!!r.user.address)})"
    ```
  **Evidence:** `.omop/evidence/task-7-pta-security-hardening.txt` (profile response)
  **Commit:** `fix(security): remove PII from user profile API responses`

### Wave 3 — Data access controls (independent of each other)

- [ ] 8. **Scope user data in complaint API responses by role**
  **What to do:** In `backend/src/controllers/complaints.controller.ts`, modify the complaint response shaping to return different user data based on role.
  
  **getComplaints() — lines 249-255 (within the map function):**
  Change the users object from exposing ALL PII to a role-scoped approach:
  ```typescript
  // Determine user data based on requestor role
  let userData = null;
  if (c.user_id_join) {
      if (role === 'admin') {
          // Admin sees full user data
          userData = {
              id: c.user_id_join,
              full_name: c.user_full_name,
              ic_number: c.user_ic_number,
              contact_no: c.user_contact_no,
              address: c.user_address
          };
      } else {
          // User (seeing their own data) or technician — limited view
          userData = {
              id: c.user_id_join,
              full_name: c.user_full_name,
              contact_no: c.user_contact_no ? `${c.user_contact_no.slice(0, 3)}***${c.user_contact_no.slice(-3)}` : null
          };
      }
  }
  ```
  
  **getComplaint() — lines 334-343 (single complaint detail):**
  Apply the same role-scoped logic:
  ```typescript
  let userData = null;
  if (c.user_id_join) {
      if (role === 'admin') {
          userData = {
              id: c.user_id_join,
              full_name: c.user_full_name,
              ic_number: c.user_ic_number,
              contact_no: c.user_contact_no,
              contact_no_2: c.user_contact_no_2,
              email: c.user_email,
              address: c.user_address,
              state: c.user_state
          };
      } else {
          userData = {
              id: c.user_id_join,
              full_name: c.user_full_name,
              contact_no: c.user_contact_no ? `${c.user_contact_no.slice(0, 3)}***${c.user_contact_no.slice(-3)}` : null
          };
      }
  }
  ```
  
  **Must NOT do:** Do not change the SQL query (it still joins with users table — the limiting happens at the response level). Do not change how the `assigned_to` field is handled (technicians need to see which complaint is theirs, but not the customer's PII). Do NOT remove IC/address from the admin view per the owner's explicit decision.
  **References:**
    - `backend/src/controllers/complaints.controller.ts:221-268` (getComplaints response mapping)
    - `backend/src/controllers/complaints.controller.ts:317-346` (getComplaint response mapping)
  **Acceptance criteria:** 
    - Call `GET /api/complaints` as a user → user objects contain only `id`, `full_name`, `masked_contact_no`
    - Call `GET /api/complaints` as an admin → user objects contain full PII (IC, address, phone)
    - Call `GET /api/complaints` as a technician → user objects contain only `id`, `full_name`, `masked_contact_no`
  **QA scenarios:**
    ```bash
    # As user:
    curl -s http://localhost:3000/api/complaints -H "Authorization: Bearer $USER_TOKEN" | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);if(r.complaints[0])console.log('user fields:',Object.keys(r.complaints[0].users||{}))})"
    # As admin:
    curl -s http://localhost:3000/api/complaints -H "Authorization: Bearer $ADMIN_TOKEN" | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);if(r.complaints[0])console.log('admin user fields:',Object.keys(r.complaints[0].users||{}))})"
    ```
  **Evidence:** `.omop/evidence/task-8-pta-security-hardening.txt` (user vs admin complaint response comparison)
  **Commit:** `fix(security): role-scope user data in complaint API responses`

- [ ] 9. **Secure upload file delivery behind authentication**
  **What to do:** Replace the public `express.static('/uploads')` with an authenticated download route.
  
  1. In `backend/src/index.ts`, remove or comment out lines 72-78:
     ```typescript
     // REMOVED for security — uploads now served via authenticated /api/uploads/:type/:filename
     // app.use('/uploads', express.static(uploadsDir));
     ```
     Note: The existing `GET /api/download` proxy endpoint can remain as a fallback but should also be updated to check authentication.
  
  2. Create a new file `backend/src/routes/uploads.routes.ts`:
     ```typescript
     import { Router } from 'express';
     import { authenticateToken } from '../middleware/auth.js';
     import path from 'path';
     import fs from 'fs';
     
     const router = Router();
     
     const UPLOAD_ROOT = process.env.UPLOAD_DIR 
         ? path.resolve(process.env.UPLOAD_DIR) 
         : path.resolve(process.cwd(), 'uploads');
     
     // All routes require auth
     router.use(authenticateToken);
     
     router.get('/:type/:filename', (req, res) => {
         try {
             const { type, filename } = req.params;
             
             // Validate type to prevent path traversal
             const allowedTypes = ['warranty-docs', 'receipt-docs', 'user-images'];
             if (!allowedTypes.includes(type)) {
                 res.status(400).json({ error: 'Invalid file type' });
                 return;
             }
             
             // Sanitize filename
             const safeFilename = path.basename(filename);
             const filePath = path.join(UPLOAD_ROOT, type, safeFilename);
             
             // Prevent path traversal beyond the intended directory
             const resolvedPath = path.resolve(filePath);
             const allowedPath = path.resolve(UPLOAD_ROOT, type);
             if (!resolvedPath.startsWith(allowedPath)) {
                 res.status(403).json({ error: 'Access denied' });
                 return;
             }
             
             if (!fs.existsSync(resolvedPath)) {
                 res.status(404).json({ error: 'File not found' });
                 return;
             }
             
             res.sendFile(resolvedPath);
         } catch (error) {
             res.status(500).json({ error: 'Failed to serve file' });
         }
     });
     
     export default router;
     ```
  
  3. In `backend/src/index.ts`, add the new route BEFORE the 404 handler (after other routes, around line 121):
     ```typescript
     import uploadsRoutes from './routes/uploads.routes.js';
     // ... 
     app.use('/api/uploads', uploadsRoutes);
     ```
  
  4. Update the `publicUrl` generation in `backend/src/utils/storage.ts` (line 39) to use the new `/api/uploads/` path instead of `/uploads/`:
     ```typescript
     const publicUrl = `${base}/api/uploads/${subdir}/${fileName}`;
     ```
     Note: The `fileName` variable is now the UUID-based name from Task 4. This ensures all new uploads point to the authenticated route.
  
  **Must NOT do:** Do not remove existing file URLs (old `https://api.ptas.my/uploads/...` URLs will stop working when express.static is removed — that's intentional for security). Do not add a redirect from old paths. Do not prevent the storage.ts change from also updating the URL generation.
  **References:**
    - `backend/src/index.ts:72-78` (current express.static line)
    - `backend/src/index.ts:86-113` (existing /api/download endpoint)
    - `backend/src/utils/storage.ts:39` (publicUrl generation)
  **Acceptance criteria:** 
    - Direct `GET /uploads/warranty-docs/filename.pdf` returns 404 or is not accessible
    - `GET /api/uploads/warranty-docs/uuid-filename.pdf` with valid JWT returns the file
    - `GET /api/uploads/warranty-docs/uuid-filename.pdf` without JWT returns 401
    - `GET /api/uploads/../../etc/passwd` returns 400 or 403 (path traversal blocked)
  **QA scenarios:**
    ```bash
    # Without auth - should fail
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/uploads/warranty-docs/test.pdf
    # With auth 
    curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/uploads/warranty-docs/test.pdf
    ```
  **Evidence:** `.omop/evidence/task-9-pta-security-hardening.txt` (auth vs no-auth comparison)
  **Commit:** `fix(security): move file serving behind authenticated /api/uploads route`

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. **Plan compliance audit** — Verify every todo in this plan was executed and committed. No scope creep (no frontend, no DB schema changes, no business logic changes).
- [ ] F2. **PII leakage sweep** — After all fixes, re-test every endpoint listed in the pentest report (register, login, forgot-password, verify-ic, profile, complaints list, complaint detail) for any remaining PII exposure.
- [ ] F3. **Rate limiting functional** — Hit forgot-password 6 times in rapid succession → 6th must return 429. Hit login 11 times → 11th must return 429.
- [ ] F4. **Security headers present** — curl API health endpoint and verify ALL expected headers exist.
- [ ] F5. **Upload security** — Attempt SVG upload with spoofed MIME. Attempt path traversal in filename. Both should be blocked.
- [ ] F6. **Enumeration impossible** — Verify identical responses for existent and non-existent users on ALL auth endpoints.
- [ ] F7. **JWT no IC** — Decode any auth token and verify no ic_number in payload.

## Commit strategy
All commits use conventional commits format. 9 atomic commits (one per task), each independently verifiable. Branch naming: `fix/security-hardening`. Do NOT squash — each commit should be a reviewable unit.

| # | Commit message | Files changed |
|---|----------------|---------------|
| 1 | `feat(security): add helmet middleware, security headers, disable x-powered-by` | index.ts |
| 2 | `feat(security): add express-rate-limit middleware to auth endpoints` | middleware/rateLimit.ts, routes/auth.routes.ts, index.ts, .env.example |
| 3 | `fix(security): remove IC number from JWT payload` | controllers/auth.controller.ts, types/index.ts |
| 4 | `fix(security): UUID-based filenames and magic-byte MIME validation on upload` | utils/storage.ts, middleware/upload.ts, controllers/complaints.controller.ts, controllers/users.controller.ts |
| 5 | `fix(security): unify auth error messages to prevent user enumeration` | controllers/auth.controller.ts |
| 6 | `fix(security): remove PII from registration API responses` | controllers/auth.controller.ts |
| 7 | `fix(security): remove PII from user profile API responses` | controllers/users.controller.ts, controllers/auth.controller.ts |
| 8 | `fix(security): role-scope user data in complaint API responses` | controllers/complaints.controller.ts |
| 9 | `fix(security): move file serving behind authenticated /api/uploads route` | index.ts, routes/uploads.routes.ts, utils/storage.ts |

## Success criteria
1. All 9 penetration test findings are addressed in code
2. Auth endpoints no longer leak whether a user exists
3. No PII (IC number, address, phone) exposed to non-admin users via any API
4. JWT tokens contain no personally identifiable information
5. Rate limiting prevents brute-force attacks on auth endpoints
6. Security headers protect against common web attacks
7. Uploaded files are not accessible without authentication
8. File uploads cannot be used for path traversal or MIME spoofing
9. All existing functionality (complaint creation, login, registration, admin panel) continues to work — only the RESPONSE DATA changed, not the business logic

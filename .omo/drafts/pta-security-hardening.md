---
slug: pta-security-hardening
status: awaiting-approval
intent: clear
pending-action: write .omop/plans/pta-security-hardening.md
approach: "Backend-only security hardening: fix API response PII leakage, add rate limiting, security headers, JWT payload cleanup, upload access control, and unified error messages. No frontend/UI changes."
---

# Draft: pta-security-hardening

## Components (topology ledger)
| id | outcome | status | evidence path |
|----|---------|--------|---------------|
| C1-auth-response | PII stripped from registration/login/profile responses | active | backend/src/controllers/auth.controller.ts:300-419, 902-1032, 1140-1161 |
| C2-jwt-payload | IC number removed from JWT; only UUID + role | active | backend/src/controllers/auth.controller.ts:42-46, 921 |
| C3-user-enum | Unified error messages on forgot-password & login | active | backend/src/controllers/auth.controller.ts:1034-1077, 902-1032 |
| C4-rate-limit | express-rate-limit on auth endpoints | active | backend/src/routes/auth.routes.ts (all public routes) |
| C5-complaint-pii | User object in complaint responses scoped by role | active | backend/src/controllers/complaints.controller.ts:184-218, 286-435 |
| C6-security-headers | Helmet + HSTS + CSP + X-Frame-Options + nosniff | active | backend/src/index.ts:56-78 |
| C7-upload-access | Uploaded files served through auth-gated route | active | backend/src/index.ts:72-78, utils/storage.ts:25-42 |
| C8-file-upload | Filename sanitization + MIME validation hardening | active | backend/src/middleware/upload.ts:7-20, complaints.controller.ts:462 |
| C9-fingerprinting | x-powered-by removed | active | backend/src/index.ts |

## Open assumptions (announced defaults)
| assumption | adopted default | rationale | reversible? |
|------------|----------------|-----------|-------------|
| Rate limit: forgot-password/reset-password | 5 req/min per IP | Industry standard for sensitive auth endpoints | Yes - configurable via env var |
| Rate limit: register/login | 10 req/min per IP | Balances UX with abuse prevention | Yes - configurable via env var |
| Rate limit: verify-otp | 10 req/min per IP | Prevents OTP brute-force | Yes - configurable via env var |
| Complaint API: PII for user role | Return only `id`, `full_name`, `masked contact_no` | Users see their own context but IC/address hidden | Yes - can be adjusted |
| Complaint API: PII for admin role | Full user object kept (admins need it for operations) | Admins are trusted; avoids breaking admin workflow | Yes - can add separate endpoint |
| Upload access control | Serve via Express with auth middleware instead of static | Static `express.static` bypasses all auth | No - architectural change |
| Filename policy | Replace original name with UUID-based name | Prevent path traversal, enumeration, and special chars | Yes |

## Findings (cited - path:lines)
1. **auth.controller.ts:42-46** - `createUserToken` includes `ic_number` in JWT payload (base64 only, not encrypted)
2. **auth.controller.ts:273-298** - `verifyIC` returns full user object + JWT (PII: IC, phone, address)
3. **auth.controller.ts:300-419** - `register` returns full user object in response (PII: IC, phone, address, email)
4. **auth.controller.ts:902-1032** - `login` different error messages for "user not found" vs "wrong password"
5. **auth.controller.ts:1034-1077** - `forgotPassword` different responses for found vs not-found (user enumeration)
6. **auth.controller.ts:1072** - Email is returned in forgot-password response (masked but domain exposed)
7. **complaints.controller.ts:184-218** - `getComplaints` embeds full user object (id, full_name, ic_number, contact_no, address)
8. **complaints.controller.ts:286-435** - `getComplaint` returns even more PII (email, contact_no_2, state)
9. **index.ts:56-78** - No security headers (no helmet, HSTS, CSP, X-Frame-Options, nosniff)
10. **index.ts:72-78** - `/uploads` served as static files with no auth
11. **index.ts:144** - Express `x-powered-by` header not disabled
12. **middleware/upload.ts:7-20** - File filter checks MIME type but MIME is user-controlled
13. **complaints.controller.ts:462** - File stored with original filename (`${Date.now()}_${file.originalname}`)
14. **users.controller.ts:10-28** - `getProfile` returns full user including IC, address, phone
15. **admin.controller.ts:291-308** - `getUser` returns full user including all PII (admin only - kept intentionally)
16. **admin.controller.ts:333-387** - `getUsers` by default returns IC number in list

## Decisions (with rationale)
1. **IC number NEVER returned in public/user API responses** - IC is Malaysian National ID (EXTREME sensitivity). Only admins see it via dedicated admin endpoints. Frontend user profile page to get IC from local state, not API.
2. **JWT carries only {id, role}** - Server looks up IC from DB when needed (admin operations, complaint matching). Token theft no longer exposes National ID.
3. **Unified auth errors** - All auth outcomes return `{"error": "Invalid credentials"}` (login) or `{"error": "If account exists, OTP has been sent"}` (forgot-password). No distinction between found/not-found.
4. **Helmet middleware** - Industry standard for Express security headers. Adds HSTS, CSP, X-Frame-Options, nosniff, etc.
5. **Rate limiting applied globally but tightest on auth** - Register/login/forgot-password/reset-password/verify-otp get strict limits. Other API endpoints get generous limits to prevent DoS.
6. **Uploaded files go through Express auth middleware** - Remove `express.static('/uploads')`. Add `GET /api/uploads/:type/:filename` with authentication.
7. **UUID-based filenames** - Replace original filename with `${uuid()}.${realExt}`. Prevents path traversal, enumeration, and extension bypass.
8. **Admin keeps full user object** - In complaint API responses, admins still see full user PII (IC, address, phone, email). Only user-role responses get scoped.
9. **Plain-text passwords in admin reset email kept** - Emails go to the user's own registered inbox. Risk requires prior email compromise, which is out of scope.

## Scope IN
- Backend API (Express.js) - all security fixes
- Authentication flow + JWT handling
- Complaint API response shaping
- File upload handling (backend)
- Security headers + middleware
- Rate limiting middleware
- User/registration/profile API response shaping

## Scope OUT (Must NOT have)
- ❌ No frontend/UI/UX changes (no React, no CSS, no styling changes)
- ❌ No database schema changes (no migrations unless absolutely required)
- ❌ No new features or API endpoints
- ❌ No CI/CD or deployment config changes
- ❌ No documentation rewrites
- ❌ No refactoring beyond what's needed for security fixes
- ❌ No changes to business logic (complaint workflow, technician assignment, notification flow)
- ❌ No changes to the master data endpoints (categories, brands, states - these are intentionally public)

## Open questions
None - all forks resolved through best-practice defaults recorded above.

## Approval gate
status: awaiting-approval
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- Present brief to user and wait for explicit okay to write the plan. -->

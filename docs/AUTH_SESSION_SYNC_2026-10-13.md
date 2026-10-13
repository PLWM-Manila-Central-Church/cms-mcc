# Production finding: synchronize same-origin account switches

## Reproduction and analysis

During post-release production UI checks, a Member tab remained rendered as Member after a second tab signed out and authenticated as System Admin. The Admin login response was successful, but the first module reads in that run returned 403 while the visible Admin shell retained the login response's role. A clean sign-out followed by Admin sign-in restored the expected role/session: Admin module GETs returned 200, and the Admin role remained after reload.

This exposes a same-origin multi-tab consistency gap. Vercel hosts the app and proxies API requests through first-party HttpOnly cookies, so tabs share a session cookie while their React AuthContext state is per-tab. A sign-in/sign-out in one tab can make another tab's in-memory role/profile disagree with the cookie the server now uses. The observed clean-switch recovery indicates the login itself, role grants and API service work after a clean session transition. No backend permission change is justified by the evidence.

## Repair

Publish an identity-free `session-changed` notification over `BroadcastChannel`; use a storage event as a browser fallback. After successful sign-in or sign-out, the initiating tab notifies its siblings. Sibling tabs clear their role-scoped query cache and leader scope, then reload so `/auth/session` becomes the sole source of their current role and page access. The notification contains no user ID, email, token, permission list or profile data.

## QA

- Unit coverage: channel message subscription, cleanup, fallback storage-event filtering and identity-free notification.
- The QR CI flow opens Admin Settings through its visible sidebar link, keeping the authenticated SPA session in place and exercising user navigation.
- Production regression sequence after release: open Member in one tab; sign in Admin in another; verify the first tab reloads and restores the Admin session/route; sign out; verify both tabs return to Login; sign in Member and verify `/portal` and self-scoped reads.
- No refresh tokens, cookies, authorization decisions, database records or role grants are changed by the notification itself.

# Mocean SMS — live setup and safety runbook

Date: 2026-11-23
Status: verified with one live SMS; 19 of 20 trial credits remain.

## What was verified live

| Check | Result |
|---|---|
| Auth header `Authorization: Bearer <token>` | **works** (HTTP 202) |
| Auth header without `Bearer` | **401 Authorization failed** |
| Balance before / after one SMS | **20.0000 → 19.0000** (1 credit) |
| Send `POST /rest/2/sms` to a PH Globe number | **HTTP 202**, `status: 0`, msgid returned |
| Sender `MOCEAN` | accepted by the API for this account |
| Status query `GET /rest/2/report/message` | `message_status: 4` = **sent to network**, `credit_deducted: 1` |
| App transport (`mocean.transport.queryStatus`) against live API | returns `sent` — the code path is live-correct |

`message_status: 4` is not "delivered". Mocean's status query can stay at "sent" unless a delivery
report is requested. The recipient must confirm the handset received it before any batch send.
No second SMS was sent; the remaining 19 credits are untouched.

## Code changes made

- `mocean.transport.js` now authenticates with **`MOCEAN_API_TOKEN` as `Authorization: Bearer`**,
  keeps the legacy key/secret fallback, never puts the token in a URL, and maps 401 to an explicit
  `PROVIDER_AUTH_FAILED` instead of an ambiguous result.
- `configuration.js` treats the account as configured when a token **or** key/secret is present,
  together with `MOCEAN_SENDER_ID`.
- `.env.example` documents `MOCEAN_API_TOKEN` (preferred) and the legacy pair.
- `test/mocean-transport.test.js` covers Bearer sending, legacy sending, status mapping, rejected
  sender ID and 401 handling. `outreach-sms-safety.test.js` covers the no-send gates.

The real token is **not** in the repository, tests, or this document. Keep it in the deployment
environment only. If it has been pasted anywhere public, rotate it in the Mocean dashboard.

## Server environment for the pilot

```dotenv
MOCEAN_API_TOKEN=<dashboard token>
MOCEAN_SENDER_ID=MOCEAN        # keep the accepted shared sender until a branded one is approved
SMS_DELIVERY_ENABLED=false     # flip to true only when the pilot starts
SMS_ALLOWED_RECIPIENTS=+639xxxxxxxxx,+639xxxxxxxxx   # exactly the pilot members
SMS_ALLOW_ALL_OPTED_IN=false
SMS_MAX_SEGMENTS=1
OUTREACH_SCHEDULER_ENABLED=true
OUTREACH_JOB_TOKEN=<at least 32 random characters>
```

In the Outreach admin screen: enable, mode **live**, `reminder_days = [3, 1]`,
`daily_sms_cap = 30` (max 100), templates under 160 GSM-7 characters.

## Why messages get blocked, and how this setup avoids it

1. **Unregistered sender ID.** `MOCEAN` was accepted. Do **not** switch to `PLWM-MCC` mid-pilot;
   branded PH sender IDs need Globe/Smart/DITO registration (industry lead time 5–10 business days,
   letter of authorization + business documents). Register through Mocean support, test with one
   message, then switch.
2. **Content filters.** Keep messages transactional: church name, what/when/where, no URL
   shorteners, no "FREE"/"PROMO"/prize language, no all-caps, no more than one link (prefer none).
   Add "Reply STOP to opt out" while inbound STOP handling is not yet built.
3. **Segments.** 160 GSM-7 characters = 1 credit; Unicode/emoji drops to 70 and doubles the cost.
   Render templates as plain ASCII and reject anything over one segment for the pilot.
4. **Flooding / throttling.** Mocean errors 32 (throttled), 43 (flooding), 58/76/77 (sender/limit).
   Ramp volume: 1 → 5 → 10 → 30 recipients across separate sends, at most 1 message/second, never
   repeat an identical message to the same number. The dispatcher already deduplicates by
   idempotency key and caps daily sends.
5. **Consent / DND.** Only `sms_enabled` members with a recorded consent phone go out; PH DND
   filters are aimed at promotional traffic, so reminders must stay transactional. Keep the 30-number
   allowlist on until the pilot is reviewed.
6. **Timing.** Send 08:00–20:00 Asia/Manila; reminder hour 9. Avoid sending during a live service.
7. **Trial credits.** 20 credits total, failures are still charged, and each segment costs a credit.
   19 credits cannot cover a 30-person batch — top up before Phase C.
8. **Duplicates.** The queue's claim token/idempotency key prevents double sends on retry. Do not
   retry an "unknown" provider result manually; query the status first.

## 30-user pilot, spending credits carefully

- **Phase A — simulation (0 credits).** Enable outreach in `simulation`; verify 30 consents,
  templates, reminder dates and the delivery log.
- **Phase B — one real message (done, 1 credit).** Confirm the handset received it. Then at most
  4 more messages to staff numbers (leaves ≥14 credits), checking each status and segment count.
- **Phase C — top up (€5 ≈ 625 local SMS at $0.008).** Then send 10, review, then 30. Budget at
  260 SMS/month: **≈₱120/month**.
- Stop immediately on sender/blacklist/throttle errors and inspect before continuing.

## Operational commands

```bash
# balance (free)
curl -s https://rest.moceanapi.com/rest/2/account/balance -H "Authorization: Bearer $MOCEAN_API_TOKEN"

# delivery status (free)
curl -s "https://rest.moceanapi.com/rest/2/report/message?mocean-msgid=<id>&mocean-resp-format=json" \
  -H "Authorization: Bearer $MOCEAN_API_TOKEN"

# one test send (costs 1 credit) — only with an approved recipient
curl -s -X POST https://rest.moceanapi.com/rest/2/sms \
  -H "Authorization: Bearer $MOCEAN_API_TOKEN" \
  --data-urlencode "mocean-from=MOCEAN" \
  --data-urlencode "mocean-to=639xxxxxxxxx" \
  --data-urlencode "mocean-text=PLWM-MCC test. Reply STOP to opt out." \
  --data-urlencode "mocean-resp-format=json"
```

## Still needed before production

- **Delivery-report webhook** (`mocean-dlr-mask=1` + public `mocean-dlr-url`) so "delivered" and
  failure codes land in the delivery log; today we only poll.
- **Inbound SMS webhook** for STOP/HELP and consent updates; until then handle opt-outs manually.
- **Branded sender ID** registration (`PLWM-MCC`) with Globe/Smart/DITO through Mocean.
- **Broadcast/announcement** feature if leaders need more than automated reminders.
- Rotate the API token if it was shared outside the deployment environment.

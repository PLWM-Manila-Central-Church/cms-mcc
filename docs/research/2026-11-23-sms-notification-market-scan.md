# SMS notification market scan — Mocean deep dive + alternatives

Date: 2026-11-23
Status: research, no code changed
Scope: church notifications for ~30 members first, Philippine numbers, low cost.

## Method and evidence quality

- Mocean: rendered its pricing page in Chrome (rates are client-side), scraped the API docs, FAQ
  answer pages (`/question/<id>`) and the Philippine site.
- Alternatives: provider pricing pages plus a 2024 hands-on comparison, Reddit/Facebook search
  results, and church-SMS products.
- Reddit blocks its JSON/API and Facebook groups require login, so those are **public search
  snippets only**, not full threads. Treat social evidence as directional.

## What the product already has

`cms-api/src/modules/outreach` already implements consent, reminders, absence follow-ups, queueing,
retries, daily caps, a recipient allowlist, simulation/live modes and a Mocean transport
(`mocean.transport.js`). Existing env: `SMS_DELIVERY_ENABLED`, `SMS_ALLOWED_RECIPIENTS`,
`SMS_ALLOW_ALL_OPTED_IN`, `SMS_MAX_SEGMENTS`, `MOCEAN_API_KEY/SECRET/SENDER_ID`.
What is missing for a real pilot: a registered PH sender ID, a live account top-up, and our code's
delivery-report webhook (we only poll status today).

## Mocean — verified facts

**Company**: Micro Ocean Technologies (Malaysia), founded 2003, 20+ years; 200+ countries,
1,620+ operators; PH site claims direct connections to PH telcos and NTC compliance.
Source: moceansms.ph, moceanapi.com.

**Price (Philippines, local MT)**: **USD 0.008 ≈ PHP 0.463 per SMS** (their PH page states both).
The global pricing table shows €0.008 for local and **€0.155 for international** to PH, i.e. the
local rate only applies to local traffic. Live top-ups are in **EUR**, PayPal / credit card / bank
transfer; no setup or monthly fee for SMS credits.

**Trial and credits**: **20 free test credits**, more on request; during trial each SMS costs
1 credit; failed messages are still charged; credits valid **more than 5 years**; long messages are
charged per segment.

**API**: `POST https://rest.moceanapi.com/rest/2/sms`
- auth: **Bearer API token** (docs now) or legacy `mocean-api-key` + `mocean-api-secret` (what our
  transport uses);
- parameters: `mocean-from` (required sender), `mocean-to` (country code, up to **500 recipients**
  per request), `mocean-text`, plus optional UDH, coding, charset, validity, scheduling
  (Malaysia/GMT+8), DLR mask/url, response format;
- success is HTTP **202** with `{"messages":[{"status":0,"receiver":"...","msgid":"..."}]}`;
- **delivery reports**: PUT to `mocean-dlr-url` with `mocean-dlr-status`, `mocean-msgid`,
  `mocean-error-code`; Mocean retries for **36 hours** if we do not answer 200;
- message length: **160 GSM-7 / 70 Unicode** characters; concatenation costs more credits;
- status/error codes 0–73 (auth, balance, blacklist, sender ID, throttling, flooding, content);
- `GET /rest/2/account/balance` for balance;
- docs: moceanapi.com/docs.

**Sender ID**: `mocean-from` is required; some countries allow dynamic sender IDs, others require
pre-registration or replace it with a default sender (error 8/44/49). For the Philippines, Globe
and Smart require sender-ID registration (industry docs: 5–10 business days, letter of
authorization and business documents). Mocean's docs do not publish the PH registration checklist —
this must be confirmed with support/sales.

**Weak signals**: Mocean has **no public reviews** (SourceForge listing: 0.0/5, "hasn't been
reviewed yet"); independent PH reviews are scarce, so reliability is unproven outside their own
claims.

## Alternatives (scraped)

| Provider | PH price | Trial / minimum | Sender ID | Notes |
|---|---|---|---|---|
| **Mocean** | $0.008 ≈ **₱0.463**/SMS | 20 credits, no minimum published | Required; PH registration via support | Existing integration; EUR top-up; DLR + inbound |
| **Semaphore** | **₱0.56**/SMS ex VAT | Free signup; no free-credit number published | Sender names supported | PH A2P, Globe/Smart/Sun/Dito; widely used by PH devs |
| **PhilSMS** | **from ₱0.35**/SMS | **5 free SMS**, **no minimum top-up** | Free, 2–3 days approval, ≤11 chars | PH-only, two-way, 1-year credit validity, PhilGEPS |
| **Txtbox** (Multisys) | ₱0.30/SMS + **₱250/mo** sender name | — | Paid monthly | 2024 hands-on: responsive support |
| **M360** | ₱0.20–0.40/SMS | — | — | 2024 hands-on: never replied to sales |
| **Twilio** | ~₱11.80/SMS (2024) | Trial credit, verified numbers | Extra | Global, reliable, expensive for PH |
| **Textbee** | platform free, SIM load ~₱1/SMS | 300 msgs/mo, 50/day | Personal SIM | Own Android phone; A2P/SIM risk |
| **Alert.Church** | $15/500 SMS ≈ ₱1.7/SMS | 50-message trial | Included | Church SaaS: groups, text-to-join, email |
| **Text In Church** | plan credits (price client-side) | Free trial | Included | Church SaaS: two-way, workflows, keywords |

## What the community says

- **r/PhStartups — "Lowest rate and best sms provider"**: developers compare PH gateways; the
  poster says Semaphore cost them ~₱0.50/SMS and asks for cheaper, reliable options. (Snippet;
  Reddit blocked full access.)
- **r/PinoyProgrammer — "Reco for SMS API"**: Twilio is recommended when two-way PH numbers
  matter; cheaper local gateways for one-way blasts. (Snippet.)
- **Facebook "IT Philippines" group**: a thread asking whether Semaphore or IProg is better, and a
  student asking for a free SMS API like Semaphore for a capstone. Login-walled; title/snippet only.
- **Otterlywise 2024 hands-on comparison**: local providers are dramatically cheaper than global
  ones; support quality varies wildly (M360 silent for a week; Txtbox replied within 24h);
  Infobip's Globe price (~₱8.44) makes it unusable for this use case.
- **Church products** converge on the same feature set: groups/ministries, text-to-join opt-in,
  scheduled reminders, delivery reports, email fallback, and credit accounting where one message
  to 100 people = 100 credits. They charge ~₱1.7–2/SMS equivalent — 3–4× Mocean.

## Cost for 30 members (≈260 SMS/month)

| Route | Monthly | 2-week pilot (~120 SMS) |
|---|---|---|
| Mocean local | **≈₱120** | ≈₱56 (or free with 20 trial credits, then ~₱46) |
| Semaphore | ₱146 + VAT | ₱67 + VAT |
| PhilSMS | ₱91 | ₱42 |
| Textbee | ~₱260 SIM load | ~₱120 |
| Alert.Church | $15 minimum (~₱850) | trial |

## Ranked recommendation

1. **Mocean for the pilot** — already coded, cheapest verified PH local rate, full API (DLR,
  inbound, scheduling). Effort is configuration plus confirming sender-ID registration and trial
  credits. Keep the 20 free credits for smoke tests.
2. **Semaphore / PhilSMS as fallback** — use if Mocean cannot register a PH sender ID quickly, or
  as a second route when delivery matters. PhilSMS is cheapest and has free sender ID, but PH-only.
3. **Textbee only as a zero-budget demo** — acceptable for a 30-user proof, not production.
4. **Church SaaS** — fastest to operate but 3–4× the cost and another system to maintain.

## Safeguards and compliance

- PH sender-ID registration with Globe/Smart/DITO is mandatory for branded A2P; allow 5–10
  business days and prepare business documents/LOA. Unregistered senders may be replaced or blocked.
- Consent is already modelled per member; add a visible opt-out path and wire inbound STOP replies
  (our API has no inbound webhook yet).
- Failed SMS are charged by Mocean; cap segments at 1 and keep templates under 160 GSM-7 chars.
- Data Privacy Act: purpose limitation, retention, and access to the delivery log.
- Trial messages to PH are normal SMS (the "Trial Message from MOCEAN" replacement is a US/Canada
  rule); still verify with one test before the batch.

## 30-user pilot plan

1. **Simulation first (free)**: enable outreach, keep `mode=simulation`, verify consent, templates,
   timing and the delivery log for the 30 members.
2. **Live smoke test (free credits)**: top up nothing, send 2–3 messages to staff numbers using the
   20 trial credits; check sender ID, DLR and segment count.
3. **Top-up**: smallest EUR top-up (e.g. €5 ≈ 600 PH SMS at €0.008) — enough for months at 30 users.
4. **Allowlist 30 numbers**, `SMS_ALLOW_ALL_OPTED_IN=false`, `SMS_MAX_SEGMENTS=1`,
   `outreach.daily_sms_cap=30`, mode `live`.
5. Measure: delivered %, failed codes, average segments, cost per member, opt-outs after 2 weeks.

## Gaps to close before live

- Switch transport auth to Bearer token if the account no longer issues key/secret (docs changed).
- Add a DLR webhook endpoint (PUT, form-encoded) and map statuses; today only polling exists.
- Add inbound SMS webhook for STOP/HELP and consent updates.
- Confirm PH sender-ID registration process, lead time and documents with Mocean PH support.
- Decide whether the 30-user test also needs **broadcast/announcement** messages (not built; current
  SMS is reminders + follow-ups only).

## Sources

- Mocean pricing: https://moceanapi.com/pricing · PH site: https://moceansms.ph/
- Mocean docs: https://moceanapi.com/docs · FAQ: https://moceanapi.com/support/sms-related
- Semaphore: https://semaphore.co/ · PhilSMS: https://www.philsms.com/
- Otterlywise comparison: https://www.otterlywise.com/comparing-6-popular-sms-api-gateways-in-the-philippines/
- Alert.Church: https://www.alert.church/ · Text In Church: https://textinchurch.com/pricing
- Reddit snippets: r/PhStartups 1ba9jky · r/PinoyProgrammer 1al1l99

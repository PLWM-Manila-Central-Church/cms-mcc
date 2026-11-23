# Notification campaigns — local implementation design

Date: 2026-11-24
Status: implemented locally; not deployed.

## Intent

Let authorized staff send a custom, time-controlled SMS for an event, ministry, cell group or the
whole church, while enforcing consent, frequency, budget and approval. It extends the existing
outreach queue instead of creating a second notification system.

## Goals

- A composer with audience preview, custom message, exact send time, cost estimate and exclusions.
- One campaign table plus campaign deliveries using the existing consent/retry/DLR dispatcher.
- Role-scoped audiences; all-member messages require two different people.
- Per-member weekly/monthly caps, monthly budget, quiet hours, and a hard cost confirmation.
- Member opt-out of event/church notifications separate from activity reminders.
- Guardian routing for minors, with guardian consent.
- No silent misses: unreachable members are counted and reasons are shown.

## Non-goals (this slice)

- Rich media, links, two-way chat, or automatic STOP handling.
- Retrying campaigns independently from the existing delivery queue.
- Changing the existing reminder/follow-up behaviour.
- Public API or external campaign scheduling.

## Decisions

- **Two-person approval** for all-member messages: the composer cannot approve their own campaign.
- **Release A** is event/ministry/cell-group campaigns; all-member is enabled but approval-gated.
- **Extend `outreach_deliveries`** with `campaign_id` and `kind='campaign'`; avoid a parallel queue.
- **Messages are snapshotted** into each delivery at queue time; edits after queue do not change sent text.
- **Consent is checked again at send time** by the dispatcher. Existing `hasSmsConsent` remains for
  reminders; campaigns use `hasCampaignConsent`, which handles guardian numbers.
- **Frequency caps count all SMS deliveries**, not just campaigns.
- **Cost is estimated per rendered recipient** (segments × unit cost) and actual cost is summed from
  `outreach_deliveries.cost_php`.
- **Approval thresholds** default to 50 recipients or ₱50; all-member always requires approval.
- **Quiet hours** default to 08:00–20:00 Asia/Manila.

## Roles

| Role | Compose | All members | Approve | Recipient scope |
|---|---|---|---|---|
| System Admin | yes | yes | yes | all |
| Pastor | yes | yes | yes | all |
| Registration Team | yes | no | no | event |
| Ministry Leader | yes | no | no | own ministry |
| Cell/Group Leader | yes | no | no | own group |
| Finance Team | no | no | no | cost view only |
| Member | no | no | no | own consent |

The backend re-checks the audience scope; the UI only hides options.

## Flow

1. Staff opens **Notifications & Follow-ups → Campaigns → New notification**.
2. Chooses event/ministry/cell group/all members, writes the message, and picks a future time.
3. Previews audience and cost; excluded reasons are shown.
4. Submits. Under-threshold campaigns are approved immediately; otherwise they go to **Approvals**.
5. A different System Admin/Pastor approves or rejects.
6. The scheduler queues due campaigns into `outreach_deliveries`; the dispatcher re-checks consent,
   campaign state, event state, segments and the live allowlist.
7. Delivery status and actual cost appear in the campaign detail.

## Local manual review

Run `npm start` in `cms-frontend`, then open:

`http://localhost:3000/role-review.html?role=System%20Admin&embedded=1#/outreach`

Use **Campaigns → New notification** and **Approvals**. The review harness uses synthetic API
responses; no SMS is sent.

## Known gaps / next slice

- DLR webhooks and STOP handling still use the existing manual opt-out path.
- Campaign editing after submission is intentionally disabled; create a new campaign.
- No external cron yet; Render free sleep can delay scheduled queueing.
- Actual cost is only available after deliveries reach a terminal status.
- Production migration and deployment are not part of this local slice.

## Verification

- Backend campaign/audience tests plus full API suite.
- Frontend component and full suite.
- Browser flow: open Campaigns, preview cost, submit all-member campaign, approve from a different
  account, inspect detail.

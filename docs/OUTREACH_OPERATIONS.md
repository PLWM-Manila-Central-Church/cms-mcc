# Activity reminders and attendance follow-ups

## Current release boundary

The workflow is implemented locally. The migration has been applied only to the isolated `qr_attendance_qa` schema. Production deployment and provider setup are separate steps. Real SMS and delivery reports have not been tested or enabled.

## Initial configuration

1. Apply the normal backend migrations to an explicitly selected environment, after reviewing the target and taking its normal backup.
2. Keep `SMS_DELIVERY_ENABLED=false`. Keep provider credentials blank until SMS testing is separately authorized.
3. Sign in as System Admin and open **Notifications & Follow-ups → Configuration**. Enable evaluation, leaving SMS mode **Disabled**. Defaults are reminders three and one calendar days before a gathering, at 09:00 Asia/Manila.
4. Under **Activity rules**, opt existing Services or Events into reminders. For attendance follow-ups, choose a stable series key shared only by comparable gatherings, such as `weekly_worship`. Different series do not contribute to the same absence streak.
5. Review the expected roster before finalizing attendance. Confirmed presence wins over exceptions; excused attendance resets a streak; pending or unfinalized attendance cannot count as absence. Exception changes reopen finalization.
6. Follow-ups appear after two consecutive finalized eligible absences. Further absences update that episode. Workers record a note and resolve the case after personal care. Resolution cancels pending work for that episode.

Changing past attendance or enabling follow-ups for historical gatherings may change the evaluated streak. Review the roster and the eligible timeline before assigning a case. Disabling evaluation does not remove existing history.

## Scheduling

The backend interval runs once per minute when `OUTREACH_SCHEDULER_ENABLED` is not `false`, outside tests. Database keys and leases coordinate concurrent processing. Attendance post-commit hooks refresh affected cases without rolling back attendance when evaluation fails.

A sleeping hosting service cannot guarantee timely reminders. Use an available scheduler to run `npm run outreach:process` in the backend environment, or POST `/api/outreach/jobs/run` with `Authorization: Bearer <OUTREACH_JOB_TOKEN>`. Set a random token of at least 32 characters in server secrets. Never put it in frontend configuration or a URL. The endpoint is closed when no strong token is configured. No external scheduler or paid resource is provisioned by this change.

The UI also offers **Evaluate due work**, **Process due queue**, and **Refresh view**. Only Admin/Registration may process; scoped leaders and Pastor can refresh their reads. Expired reminders are cancelled rather than sent late. Processing and evaluation use bounded batches.

## Consent and contact updates

SMS starts opted out. A Member may manage their own preferences; Admin/Registration can record explicit permission with an evidence note. A changed mobile number requires fresh consent. An opt-out cancels pending SMS. Disabling a notification category also prevents that category during dispatch. A case remains available to authorized workers even if SMS is off.

## Future SMS enablement — not performed

The Mocean adapter is present but unverified. Before any real send, separately authorize a controlled provider test and review provider/carrier terms, credits, sender registration and current pricing. No continuing free allowance is guaranteed by this implementation.

Required server-only values are `MOCEAN_API_KEY`, `MOCEAN_API_SECRET`, `MOCEAN_SENDER_ID`, `SMS_DELIVERY_ENABLED=true`, and an explicit `SMS_ALLOWED_RECIPIENTS` allowlist. Keep `SMS_ALLOW_ALL_OPTED_IN=false` for initial testing. `SMS_MAX_SEGMENTS` defaults to one. Configuration additionally requires live mode and enforces a daily attempt cap. Both the environment gate and configuration must permit live sending.

Simulation records are labelled **Simulated**, never **Sent** or **Delivered**. **Sent** means provider acceptance, not receipt or reading. Ambiguous results become **Unknown** and require review; they are not blindly retried. Definitive failures can be retried through the staff UI after eligibility and consent checks. Never retry an unknown result before checking the provider's status.

## Support and rollback

- Set configuration `enabled=false` to stop new evaluation/processing, or set SMS mode Disabled to stop SMS processing while internal notifications remain available. For an immediate independent SMS stop, set `SMS_DELIVERY_ENABLED=false`.
- Inspect scoped **Delivery history** and case timelines. Phone numbers are masked in collection history; contact details are limited to authorized case/consent access.
- Do not delete delivery or follow-up history as a routine repair. The migration's down operation refuses a populated workflow.
- After restoring or changing attendance, refinalize and evaluate, then refresh the list. Optimistic revisions reject stale edits.
- Existing login, QR credentials, attendance scan endpoints and production provider secrets are not replaced by this feature.

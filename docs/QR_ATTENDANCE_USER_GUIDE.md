# PLWM-MCC QR Attendance User Guide

This guide explains how Members, Leaders, Registration Team, Admins, and Pastors use QR attendance for Services and Events. A registration or RSVP is a planning record; attendance is recorded separately when a person physically checks in.

## Roles at a glance

| Role | QR attendance work | Important boundary |
|---|---|---|
| Member | Create, download, or print a fixed personal QR; review personal attendance history in the Member Portal. | Use your own QR. Do not share it with another person. |
| Cell Group Leader or Group Leader | Start a batch for an open session, scan or select members in the assigned roster, and submit the batch for review. | A leader batch is pending until Registration approves it. Leaders cannot add people outside their assigned scope. |
| Leader (unified scope) | One account can hold Cell Group and/or Group assignments and work in the selected scope. | Select one scope before writing. **All assigned teams** is read-only. |
| Registration Team | Set up Service/Event sessions, directly check in a Member, and review/approve or reject leader batches. | Verify the activity and person at the registration desk before confirming. |
| System Admin | Configure sessions and use the administrative attendance tools allowed by permissions. | Keep the QR setting enabled only after the database schema is ready. |
| Pastor | Review attendance summaries and authorized reports. | Pastor reporting is read-only. |

## Member fixed QR

1. Sign in and open the Member Portal.
2. Open the **Attendance** tab and choose **My Attendance QR**.
3. If you do not have a QR yet, select **Create My QR**. Create it once; the same active QR can be shown for a Service or Event.
4. At the registration desk, show the QR on your phone or use **Download PNG** or **Print QR** to prepare a copy.
5. If the QR is lost or may have been shared, contact an authorized Admin to revoke and reissue it. Stop using the old image after it is reissued.

The QR belongs to one Member account. A Member can see only their own attendance history and does not use the staff scanning page.

## Registration direct check-in

1. Open the correct Service or Event and its **QR Attendance** workspace.
2. Select the matching attendance session. Only an **open** session accepts check-ins. Confirm the activity and session before scanning.
3. Select **Scan Member QR**. Choose **Start Camera** after granting the browser camera permission, or select **Upload QR Image** and choose a clear PNG, JPEG, or WebP image. Image decoding happens in the browser; the QR image itself is not uploaded.
4. Review the Member preview. Use **Confirm Check-in** only after confirming the person is present.
5. If the screen says **Already checked in**, do not create another check-in. If the QR cannot be read, use the manual member search and review the result before confirming.

The Event registration or Service RSVP is not a check-in. It does not count the person as present.

## Leader batch check-in

1. Open the same Service/Event attendance session used by Registration. It must be open before member scanning begins.
2. If your account uses the unified **Leader** role, select the assigned Cell Group or Group scope in the page header. Do not use **All assigned teams** for a write operation.
3. Select **Start Leader Batch**. Use **Scan Member into Draft** for each member QR, or search and add a member from the assigned roster.
4. Review the draft attendee list. Remove an incorrect entry before submission. A duplicate already in the draft is not added twice.
5. Select **Submit Batch for Review**. The batch becomes pending and does not count as confirmed attendance yet.
6. Show, download, or print the generated batch QR and present it to Registration. Keep it limited to the intended session and Registration staff.

## Registration review of a leader batch

1. In the selected session, open **Review leader batches** or choose **Scan Leader Batch QR**.
2. Check that the batch belongs to the correct Service/Event and review the complete attendee list, capture times, scope, and duplicate outcomes.
3. Select **Approve Attendance** to add the batch to the shared attendance record. If the approval deadline has passed, provide the required late-approval reason.
4. Select **Reject Batch** when the list is incorrect or cannot be verified; enter the required reason so the leader knows what to correct.
5. Confirm the result in the session summary. Direct check-ins and approved batch check-ins converge in the same attendance record, with duplicate protection.

## Session setup and reports

Admin or Registration creates a session from the selected Service/Event workspace. Set the session title, key, expected-attendance basis, check-in opening and closing times, and batch-approval deadline. A new session starts as **Draft**; select **Open Check-in** when the desk is ready. If event registrations or an explicit expected roster are selected, prepare that roster before opening because it is frozen when the session opens.

Registration reviews the current session attendance and approved batches. Pastors can use authorized reports to review attendance without making check-ins or corrections. Members see only their own history in the Member Portal.

## Troubleshooting and safe handling

- **QR attendance is unavailable:** Contact an Admin to check whether the feature is enabled and the database migration is ready.
- **Camera is denied or cannot start:** Use **Upload QR Image**. Live camera use requires a supported secure page and camera permission from the browser.
- **The Member QR is invalid:** Confirm that it is the current QR for the correct Member; an old image may have been revoked after reissue.
- **The Member is already checked in:** Do not repeat the direct check-in. Registration can review the existing record or use the authorized correction flow.
- **A batch is still pending:** Attendance is not counted until Registration approves it. Do not resubmit the same batch; ask Registration to review or reject it.
- **A member is outside the visible roster:** Leaders must not bypass the assigned Cell Group/Group scope. Ask Registration or an Admin to verify the correct scope.
- **The session is closed or cancelled:** Do not scan into another activity to work around the state. Ask Registration to select the correct session or follow the church's approved attendance correction procedure.

Protect member QR images and attendance records as personal information. Use the paper attendance fallback if the authorized QR workflow is unavailable; enter paper results later only through the approved correction or reconciliation process.

# Production QR capture-window follow-up

Date: 13 October 2026. Frontend only.

## Production observation

On the production Registration QR page, one Service session was marked `open` while its check-in window ended several days earlier. The UI still exposed Scan Member QR and manual lookup. Uploading a Member QR reached the server preview route, which correctly rejected the scan with “The check-in window has closed.” The confirmed attendance count remained zero; no check-in or other production data was written.

## Local fix

The QR workspace now evaluates the session’s configured check-in opening/closing times as well as its session state. It displays an Asia/Manila status message for upcoming, expired, or unavailable window times, changes the visible status badge, and hides scanning/manual lookup while capture is unavailable. Leader batch creation and member scanning also follow the capture window. A previously started batch may still be submitted for review within its existing submission deadline, matching the backend rule.

## Verification

- Frontend production build passed.
- Full frontend suite: 47 files, 157 tests passed.
- The QR workspace test covers expired-window guidance, hidden capture controls, and confirms no attendance request was sent.
- The earlier production upload reached preview but was rejected by the API; confirmed attendance remained unchanged.

The repair is on a follow-up branch pending PR checks and production deployment.

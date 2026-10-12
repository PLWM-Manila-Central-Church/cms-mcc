# Tool access and production storage review

Review date: 12 October 2026. The user requires zero cost. No subscription, paid plan, payment, or storage credential was created during this review.

## Available capabilities

The current tool registry exposes 1,016 tools, including 955 connected-app tool definitions. Tool visibility establishes callable capability; it does not establish authorization or successful access to every provider resource.

Task-relevant capabilities include GitHub repository/PR/CI tools, Render services/deploys/logs/environment updates, Vercel projects/deployments/configuration, Supabase management, Postman API tools, native document-control discovery, browser control, local shell/file editing, document/PDF runtimes, and code review.

Other app families exposed in the registry include Canva, Figma, Gmail, Google Drive/Calendar/Contacts, Higgsfield, Hugging Face, Klook, Pets, Sites, Spotify, Whimsical, plugin management, and safety-support tools. Their authenticated resource access was not tested because it is unrelated to MCC completion.

## Verified provider and browser access

| Surface | Current observation | Effect on MCC work |
|---|---|---|
| Cloudflare browser | Signed-in account; R2 overview redirects to subscription enrollment. | Sign-in blocker cleared, but R2 is not activated. |
| GitHub browser | MCC repository, signed-in user navigation, one remote branch, main at 5856fb5. | Repository inspection is available. Current local changes remain uncommitted. |
| Render browser | PLWM workspace, plwm-mcc-api Free service, live deployment at 5856fb5. | Deployment/environment inspection is available. Free-instance inactivity can delay requests. |
| Vercel browser | Signed-in dashboard is on the unrelated SISP project. | Do not use its current page as evidence about MCC. Use the MCC project through the connector or an explicitly selected MCC tab. |
| TiDB browser | PLWM-MCC cluster Networking page is authenticated; public endpoint and existing scoped network rules are visible. | Connectivity inspection is available; no firewall rule changed. |
| Codex document control | No connected Word, Excel, PowerPoint or Sheets executor session was returned. | No live document-control session is available to render or edit the master manual. |
| Plugin search | Combined Cloudflare R2, TiDB and Brevo search returned no plugins. | Browser access remains the available management route for these providers. Search results are not an exhaustive directory. |

Render's app-specific permission is Allow all actions. GitHub and Vercel inherit Allow low-risk actions. These settings were read only; no plugin permissions changed. Provider resource permissions and per-action reviews still apply.

## Zero-cost storage decision

Cloudflare's R2 enrollment page shows zero due now and free monthly allowances, but enrollment accepts terms and enables automatically renewing usage billing. The user declined any cost. R2 must remain unactivated; a free usage allowance is insufficient to guarantee no charges.

Supabase's current Free plan lists 1 GB file storage, 5 GB egress, 5 GB cached egress, two active projects, and pausing after one week of inactivity. The connected account lists only inactive SISP and Vertica projects; no MCC project exists. Those projects must not be reused for MCC data. A dedicated, verified Free project is a candidate, not a configured provider. Creating it and integrating its private storage requires confirming the organization is Free, available capacity, provider access, quotas, and authenticated upload/read/delete behavior. The TiDB database need not move.

Sources: https://supabase.com/pricing and https://supabase.com/docs/guides/platform/billing-on-supabase . The connector account is separate from the browser account; its project list is not authoritative for the browser account.

### Existing MCC project verified in browser

The user corrected the project-discovery result. Browser inspection confirms existing project PLWM MCC (`xbxfsieriaffsxvsodyi`) in PLWM-MCC organization (`snpiehcnfgnxhmfzxphx`), marked FREE, Healthy, Singapore (`ap-southeast-1`). This supersedes the earlier suggestion to create a School project. No new project is needed.

Storage Files shows no buckets. S3 Configuration shows the protocol enabled, endpoint `https://xbxfsieriaffsxvsodyi.storage.supabase.co/storage/v1/s3`, region `ap-southeast-1`, and no access keys. The existing backend uses AWS S3Client with forcePathStyle, matching the official Supabase S3 configuration. No provider adapter rewrite is presently justified.

Implementation sequence: create a private MCC uploads bucket; create a backend-only S3 key after the browser's required action-time confirmation; store credentials only in ignored backend environment and Render secrets; configure the verified endpoint and region; validate synthetic upload/read/delete through the application UI and verify persistence after API restart/deploy. Keep paid upgrades disabled. Do not move TiDB data or change application authentication. Provider-generated S3 keys bypass RLS across this project's buckets, so they must never reach frontend variables or committed files.

Current acceptance: provider identity and S3 compatibility confirmed; bucket, credentials, application integration, durability and production UI smoke remain pending. Source: https://supabase.com/docs/guides/storage/s3/authentication . No external state was changed.

Until a provider is configured, keep the local development disk path and the production upload-unavailable guard. Do not use Render's ephemeral filesystem as durable production storage. Existing S3 examples are optional; the region setting alone does not activate storage.

## Master manual progress

The existing master DOCX was inspected. A separate draft at output/docx/PLWM-MCC_Full_System_User_Documentation_QR_DRAFT.docx adds the unified Leader role, Member QR entry, a contents entry, and the QR workflow chapter from the source-verified Markdown guide. Structural checks confirmed the additions.

The prescribed renderer failed with FileNotFoundError because LibreOffice soffice.exe is unavailable. No page images or revised PDF were produced. The draft has not passed visual QA and has not replaced either published master file. Remaining acceptance: render every page, inspect layout, fix any defects, update the final PDF, and then distribute the reviewed manual.

### Provider integration progress

Created mcc-uploads with Public bucket disabled and no public policies. After specific action-time user approval, created mcc-backend-uploads S3 credentials and saved the endpoint, bucket, region and credentials only in cms-api/.env (git check-ignore confirmed ignored). Synthetic S3 PutObject/GetObject content verification and DeleteObject cleanup passed. The initial command failed before network access because dotenv was resolved from the repository root; rerunning from cms-api resolved it. No real member files were uploaded. Application UI upload/read/delete, API restart persistence and Render secret/deployment integration remain pending. No paid plan was enabled.

### Rendered application storage verification

Started local API on 5001 (migrations disabled for this startup) and Vite on 3000; /health returned database connected. Guarded seed created disposable synthetic users only in qr_attendance_qa, manifest at OS temp mcc-storage-browser-qa-20261012.json. Through the in-app browser, synthetic Admin logged in, uploaded a restricted PNG archive titled MCC Storage QA 20261012, approved it, and opened its detail/version history. Download File produced an access-log entry without a visible application error, but the browser download-event observer timed out; saved file/content verification remains unproven. Screenshot tmp/mcc-s3-archive-ui-20261012.png shows the approved restricted record and access log. Fixture remains for persistence/download/delete checks and must be cleaned before cleaning its users. Local API and frontend sessions: 53479 and 38226 respectively. Production Render variables have not changed.

### Persistence and exact browser download acceptance

Stopped API session 53479 and started 76161 on port 5001, then reloaded the authenticated archive page. The approved record remained visible. Retargeting Download File by its exact semantic button produced a browser download; the saved PNG was 42,917 bytes and matched the original upload byte-for-byte. The earlier numeric target was stale; its access-log observation proved only record viewing, not downloading. This corrects the previous weak download evidence. Final QA archive deletion is staged in the UI and awaiting action-time confirmation because the dialog states it cannot be undone. Record ID 60001; synthetic title MCC Storage QA 20261012.

### Deletion and fixture cleanup acceptance

User specifically approved deleting archive 60001 through the UI. The rendered list became zero records, and the QA row had is_deleted=1. Archive deletion is a logical deletion; provider object retention is intentional until guarded cleanup. Extended the existing manifest title guard to recognize strictly dated MCC Storage QA synthetic archives while preserving exact ID/uploader/version/key checks. Manifest-scoped cleanup removed archive versions/access logs/row, stored object and all seeded synthetic users/events/services/teams, restored the prior QR setting, and removed the temporary manifest. First cleanup rejected the nonconforming filename before writes; renamed the same manifest to the required mcc-qr-browser-e2e-qa-storage-20261012.json and cleanup passed. Production credentials/deployment remain unchanged.

### Deployment configuration reconciliation

Corrected render.yaml and both backend environment examples from R2 signing region auto to the verified Supabase region ap-southeast-1. Example comments now identify Supabase's direct S3 endpoint and backend-only project-wide key scope. git diff --check passed. Browser revalidated production service plwm-mcc-api, Free plan, branch main, live commit 5856fb5; current local repairs are not deployed. Render secret insertion and production verification remain pending; this source adjustment does not configure live service variables.

### Production storage environment saved

Saved five S3 variables in the existing PLWM Render service: verified Supabase endpoint, private bucket mcc-uploads, ap-southeast-1 region and approved backend credentials. Existing unrelated variables were preserved; no secret was committed. Dashboard confirmed Updated environment variables for this service and started deploy dep-db68jgp42hec73baoch0 at 15:18 GMT+8 on 12 October 2026, source main 5856fb5. Deployment was Building at last observation. This deploy does not include uncommitted local repairs. Live readiness, runtime storage logging, rendered production uploads and persistence remain unproven until deployment finishes and UI verification passes.

Deployment dep-db68jgp42hec73baoch0 reached Deploy succeeded | Live in 1m56s. Runtime logs confirm S3 storage configured with bucket mcc-uploads, database connected, startup migrations completed, API bound port 10000 and /health HTTP 200. Saved screenshot tmp/mcc-render-storage-deploy-20261012.png. This confirms configuration/startup only; actual production file flows remain pending. AWS SDK logs a future Node >=22 support requirement; current production runtime is 20.20.2, to assess during the release review.

### Production browser check and release dependency

Admin login succeeded through the production browser after the storage deployment. Archives listed one existing approved public DOCX record, try. Opened its details and attempted Download File; no download event or visible application error was observed. No existing production record was modified. Inspection of authoritative deployed commit HEAD=5856fb5 shows handleDownload still builds REACT_APP_API_URL or localhost:5000 plus file_url and silently falls back to window.open. The current local repaired implementation instead calls authorized /archives/:id/file and version file endpoints and reports errors. Therefore provider configuration alone cannot establish production download acceptance; release the reviewed local repair first. Asked for explicit authorization for one disposable production storage archive before creating hosted fixture data. Awaiting answer; no production fixture was created.

### Main production rollout and Supabase storage acceptance

PR #19 passed all checks after fixing a duplicate seeded Leader in the Admin UI browser fixture, then merged by squash as main commit 113008eef2b6700f68c43027afbe16c9650348f5. GitHub main reports this exact SHA. Render Free API deployed that commit, completed startup migrations and returned health HTTP 200; runtime logs confirm S3 storage configured with mcc-uploads. Vercel Connector confirms cms-mcc production deployment READY on same SHA.

Admin UI created one approved, restricted synthetic production Archive `MCC Production Storage QA 20261012` using generated checker PNG. Production Download File created a browser download; the saved file matched the generated image byte-for-byte. Thus production authenticated archive upload/download and storage integration are verified. The record/file cleanup action is staged in the production UI; awaiting required action-time user confirmation because UI states deletion cannot be undone. No ordinary member/financial content was changed.

Remaining deployment difference: AWS SDK warns that later v3 releases will require Node >=22 from Jan 2027, while Render currently runs 20.20.2. Node 20 is supported today and this warning did not prevent startup; plan a Node upgrade before that compatibility date.

### Production browser camera smoke after rollout

On Vercel production commit 113008e, signed in as Admin and opened QR Attendance with its existing selected Service session. Opened Scan Member QR, clicked Start Camera and observed the UI state Camera is ready. The visible video element was playing at readyState 4 with 640x480 frames. Repeated the same read-only preview for Scan Leader Batch QR and observed the same live frame dimensions/state. Closed the camera dialog and signed out. No scan, attendance write, registration change, batch approval, or session mutation was made. This verifies the connected browser's actual camera on the production origin in this workstation session; it does not prove camera behavior on every device/browser. Production synthetic storage archive remains awaiting user confirmation for irreversible UI deletion.

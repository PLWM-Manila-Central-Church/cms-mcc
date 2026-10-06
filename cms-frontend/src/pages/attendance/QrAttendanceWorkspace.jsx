import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import QrScannerDialog from '../../components/attendance/QrScannerDialog';
import '../../components/attendance/qrAttendance.css';

const apiError = (error, fallback) => error.response?.data?.message || error.response?.data?.error?.message || fallback;
const toLocalInput = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const makeInitialTimes = () => {
  const now = new Date();
  const checkInOpen = new Date(now.getTime() + 5 * 60 * 1000);
  const starts = new Date(now.getTime() + 15 * 60 * 1000);
  const ends = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const deadline = new Date(ends.getTime() + 24 * 60 * 60 * 1000);
  return {
    starts_at: toLocalInput(starts),
    ends_at: toLocalInput(ends),
    check_in_opens_at: toLocalInput(checkInOpen),
    check_in_closes_at: toLocalInput(ends),
    approval_deadline: toLocalInput(deadline),
  };
};

export default function QrAttendanceWorkspace({ targetType: targetTypeProp, targetId: targetIdProp }) {
  const { user, hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const targetType = targetTypeProp || searchParams.get('target_type') || '';
  const targetId = targetIdProp || searchParams.get('target_id') || '';
  const canConfigure = hasPermission('qr_attendance', 'configure_session');
  const canCheckIn = hasPermission('qr_attendance', 'check_in');
  const canRecordBatch = hasPermission('qr_attendance', 'record_batch');
  const canSubmitBatch = hasPermission('qr_attendance', 'submit_batch');
  const canReviewBatch = hasPermission('qr_attendance', 'review_batch');
  const canCorrect = hasPermission('qr_attendance', 'correct');
  const isGroupLeader = ['Cell Group Leader', 'Group Leader'].includes(user?.roleName);

  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(searchParams.get('session_id') || '');
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [batchRows, setBatchRows] = useState([]);
  const [draftDetail, setDraftDetail] = useState(null);
  const [reviewDetail, setReviewDetail] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [scannerMode, setScannerMode] = useState('');
  const [rosterQuery, setRosterQuery] = useState('');
  const [rosterResults, setRosterResults] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [expectedQuery, setExpectedQuery] = useState('');
  const [expectedResults, setExpectedResults] = useState([]);
  const [expectedReason, setExpectedReason] = useState('Added to attendance roster');
  const [batchQrUrl, setBatchQrUrl] = useState('');
  const [lateReason, setLateReason] = useState('');
  const [forceLateApproval, setForceLateApproval] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState(() => ({
    ...makeInitialTimes(),
    title: 'Main Session',
    session_key: targetType === 'service' ? 'primary' : 'session-1',
    expected_basis: 'none',
    registration_required: false,
  }));

  const title = targetType === 'event' ? 'Event QR Attendance' : 'Service QR Attendance';
  const query = useMemo(() => ({
    ...(targetType && targetId && { target_type: targetType, target_id: Number(targetId) }),
    limit: 100,
  }), [targetType, targetId]);

  const releaseBatchQr = useCallback(() => {
    setBatchQrUrl((oldUrl) => {
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return '';
    });
  }, []);

  const loadQrImage = useCallback(async (batchId) => {
    releaseBatchQr();
    const response = await axiosInstance.get(`/qr-attendance/batches/${batchId}/image.png`, { responseType: 'blob' });
    setBatchQrUrl(URL.createObjectURL(response.data));
  }, [releaseBatchQr]);

  const loadSessions = useCallback(async (preferredId = '') => {
    const response = await axiosInstance.get('/qr-attendance/sessions', { params: query });
    const rows = response.data.data.sessions || [];
    setSessions(rows);
    const preferred = preferredId || sessionId;
    const selected = rows.find((row) => String(row.id) === String(preferred)) || rows[0];
    setSessionId(selected ? String(selected.id) : '');
    return selected || null;
  }, [query, sessionId]);

  const loadSessionData = useCallback(async (id) => {
    if (!id) {
      setSession(null); setSummary(null); setAttendance([]); setAttendanceCount(0); setBatchRows([]); setDraftDetail(null); setReviewDetail(null);
      return;
    }
    setLoading(true);
    setError('');
    setSession(null);
    setSummary(null);
    setAttendance([]);
    setBatchRows([]);
    setDraftDetail(null);
    setCandidate(null);
    releaseBatchQr();
    try {
      const batchState = isGroupLeader && !canReviewBatch ? undefined : 'submitted';
      const [sessionResponse, summaryResponse, attendanceResponse, batchResponse] = await Promise.all([
        axiosInstance.get(`/qr-attendance/sessions/${id}`),
        axiosInstance.get(`/qr-attendance/sessions/${id}/summary`),
        axiosInstance.get(`/qr-attendance/sessions/${id}/attendance`, { params: { page: attendancePage, limit: 100 } }),
        axiosInstance.get(`/qr-attendance/sessions/${id}/batches`, { params: batchState ? { state: batchState } : {} }),
      ]);
      const nextSession = sessionResponse.data.data;
      const nextBatches = batchResponse.data.data.batches || [];
      setSession(nextSession);
      setSummary(summaryResponse.data.data);
      setAttendance(attendanceResponse.data.data.records || []);
      setAttendanceCount(Number(attendanceResponse.data.data.count || 0));
      setBatchRows(nextBatches);
      const ownBatch = isGroupLeader
        ? (nextBatches.find((batch) => batch.state === 'draft') || nextBatches[0])
        : null;
      if (ownBatch) {
        const draftResponse = await axiosInstance.get(`/qr-attendance/batches/${ownBatch.id}`);
        setDraftDetail(draftResponse.data.data);
        if (ownBatch.state === 'submitted') {
          try { await loadQrImage(ownBatch.id); } catch { setError('Batch was submitted, but its QR image could not be loaded. Retry from this batch.'); }
        } else {
          releaseBatchQr();
        }
      } else {
        setDraftDetail(null);
        releaseBatchQr();
      }
      if (reviewDetail) {
        const stillListed = nextBatches.find((batch) => Number(batch.id) === Number(reviewDetail.batch.id));
        if (stillListed) {
          const detailResponse = await axiosInstance.get(`/qr-attendance/batches/${stillListed.id}`);
          setReviewDetail({
            ...detailResponse.data.data,
            ...(reviewDetail.receipt && { receipt: reviewDetail.receipt }),
          });
        } else if (reviewDetail.batch.state === 'submitted') {
          try {
            const detailResponse = await axiosInstance.get(`/qr-attendance/batches/${reviewDetail.batch.id}`);
            setReviewDetail({
              ...detailResponse.data.data,
              ...(reviewDetail.receipt && { receipt: reviewDetail.receipt }),
            });
          } catch { setReviewDetail(null); }
        }
      }
    } catch (requestError) {
      setError(apiError(requestError, 'Could not load this attendance session.'));
    } finally {
      setLoading(false);
    }
  }, [attendancePage, canReviewBatch, isGroupLeader, loadQrImage, releaseBatchQr, reviewDetail]);

  const loadAttendancePage = async (id, page) => {
    setAttendanceLoading(true); setError('');
    try {
      const response = await axiosInstance.get(`/qr-attendance/sessions/${id}/attendance`, { params: { page, limit: 100 } });
      setAttendance(response.data.data.records || []);
      setAttendanceCount(Number(response.data.data.count || 0));
      setAttendancePage(page);
    } catch (requestError) { setError(apiError(requestError, 'Could not load this attendance page.')); }
    finally { setAttendanceLoading(false); }
  };

  const refreshAll = useCallback(async (preferredId = '') => {
    setError('');
    try {
      await loadSessions(preferredId);
      setLoading(false);
    } catch (requestError) {
      setLoading(false);
      setError(apiError(requestError, 'Could not load QR attendance.'));
    }
  }, [loadSessions]);

  useEffect(() => {
    let active = true;
    axiosInstance.get('/qr-attendance/capabilities')
      .then((response) => {
        if (!active) return;
        const data = response.data.data;
        setAvailability(data);
        if (data.enabled) return refreshAll(searchParams.get('session_id') || '');
        setLoading(false);
      })
      .catch((requestError) => {
        if (!active) return;
        setAvailability({ enabled: false, reason: 'unavailable' });
        setError(apiError(requestError, 'QR attendance is not available yet.'));
        setLoading(false);
      });
    return () => { active = false; };
  }, []); // QR capability is intentionally fetched only when this workspace opens.

  useEffect(() => {
    if (!availability?.enabled || !sessionId) return;
    loadSessionData(sessionId);
  }, [sessionId, availability?.enabled]);

  useEffect(() => {
    if (!availability?.enabled || !sessionId || rosterQuery.trim().length < 2) { setRosterResults([]); return undefined; }
    let active = true;
    const timeout = window.setTimeout(async () => {
      setRosterLoading(true);
      try {
        const response = await axiosInstance.get(`/qr-attendance/sessions/${sessionId}/roster`, {
          params: { search: rosterQuery.trim(), limit: 30, page: 1 },
        });
        if (active) setRosterResults(response.data.data.members || []);
      } catch (requestError) {
        if (active) setError(apiError(requestError, 'Member search failed.'));
      } finally { if (active) setRosterLoading(false); }
    }, 250);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [availability?.enabled, rosterQuery, sessionId]);

  useEffect(() => {
    if (!availability?.enabled || !sessionId || !canConfigure || session?.expected_basis !== 'explicit_roster' || session.status !== 'draft' || expectedQuery.trim().length < 2) {
      setExpectedResults([]); return undefined;
    }
    let active = true;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await axiosInstance.get(`/qr-attendance/sessions/${sessionId}/roster`, {
          params: { search: expectedQuery.trim(), limit: 30, page: 1 },
        });
        if (active) setExpectedResults(response.data.data.members || []);
      } catch (requestError) {
        if (active) setError(apiError(requestError, 'Roster search failed.'));
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [availability?.enabled, canConfigure, expectedQuery, session?.expected_basis, session?.status, sessionId]);

  useEffect(() => () => { if (batchQrUrl) URL.revokeObjectURL(batchQrUrl); }, [batchQrUrl]);

  const createSession = async (event) => {
    event.preventDefault();
    if (!targetType || !targetId) { setError('Open QR attendance from a specific Service or Event to create a session.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const toIso = (value) => new Date(value).toISOString();
      const payload = {
        target_type: targetType,
        target_id: Number(targetId),
        title: form.title.trim(),
        session_key: form.session_key.trim(),
        starts_at: toIso(form.starts_at),
        ends_at: toIso(form.ends_at),
        check_in_opens_at: toIso(form.check_in_opens_at),
        check_in_closes_at: toIso(form.check_in_closes_at),
        approval_deadline: toIso(form.approval_deadline),
        time_zone: 'Asia/Manila',
        expected_basis: form.expected_basis,
        registration_required: Boolean(form.registration_required),
        leader_confirmation_mode: 'batch_review',
      };
      const response = await axiosInstance.post('/qr-attendance/sessions', payload);
      const created = response.data.data;
      setNotice('Draft attendance session created. Open it when check-in is ready.');
      await refreshAll(String(created.id));
    } catch (requestError) { setError(apiError(requestError, 'Could not create the attendance session.')); }
    finally { setBusy(false); }
  };

  const updateSession = async (action, body = {}) => {
    if (!session) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await axiosInstance.post(`/qr-attendance/sessions/${session.id}/${action}`, body);
      setNotice(action === 'open' ? 'Attendance session opened.' : action === 'close' ? 'Attendance session closed.' : 'Attendance session cancelled.');
      await loadSessionData(session.id);
    } catch (requestError) { setError(apiError(requestError, 'Could not update this attendance session.')); }
    finally { setBusy(false); }
  };

  const addExpectedMember = async (member) => {
    setBusy(true); setError('');
    try {
      await axiosInstance.post(`/qr-attendance/sessions/${session.id}/expected-members`, {
        member_ids: [member.id], reason: expectedReason.trim(),
      });
      setNotice(`${member.first_name} ${member.last_name} added to the expected roster.`);
      setExpectedQuery(''); setExpectedResults([]);
      await loadSessionData(session.id);
    } catch (requestError) { setError(apiError(requestError, 'Could not add this member to the expected roster.')); }
    finally { setBusy(false); }
  };

  const startDraft = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await axiosInstance.post(`/qr-attendance/sessions/${session.id}/batches`, {
        client_request_id: crypto.randomUUID(),
      });
      const batch = response.data.data.batch;
      const detail = await axiosInstance.get(`/qr-attendance/batches/${batch.id}`);
      setDraftDetail(detail.data.data);
      setNotice('Leader attendance draft is ready for member scans.');
    } catch (requestError) { setError(apiError(requestError, 'Could not start an attendance batch.')); }
    finally { setBusy(false); }
  };

  const addMemberToDraft = async (memberId, qrPayload) => {
    if (!draftDetail?.batch) { setError('Start a leader batch before scanning members.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await axiosInstance.post(`/qr-attendance/batches/${draftDetail.batch.id}/items`, {
        ...(qrPayload ? { qr_payload: qrPayload } : { member_id: Number(memberId) }),
        expected_revision: Number(draftDetail.batch.revision),
      });
      const added = response.data.data;
      const detail = await axiosInstance.get(`/qr-attendance/batches/${draftDetail.batch.id}`);
      setDraftDetail(detail.data.data);
      setNotice(added.added ? `${added.member.first_name} ${added.member.last_name} saved as pending.` : 'This member is already in the draft.');
    } catch (requestError) { setError(apiError(requestError, 'Could not add this member to the draft.')); }
    finally { setBusy(false); }
  };

  const removeDraftMember = async (memberId) => {
    setBusy(true); setError('');
    try {
      await axiosInstance.delete(`/qr-attendance/batches/${draftDetail.batch.id}/items/${memberId}`, {
        data: { expected_revision: Number(draftDetail.batch.revision) },
      });
      const detail = await axiosInstance.get(`/qr-attendance/batches/${draftDetail.batch.id}`);
      setDraftDetail(detail.data.data);
      setNotice('Member removed from the attendance draft.');
    } catch (requestError) { setError(apiError(requestError, 'Could not remove this member.')); }
    finally { setBusy(false); }
  };

  const submitDraft = async () => {
    setBusy(true); setError(''); setNotice(''); releaseBatchQr();
    try {
      const response = await axiosInstance.post(`/qr-attendance/batches/${draftDetail.batch.id}/submit`, {
        expected_revision: Number(draftDetail.batch.revision),
      });
      const batch = response.data.data.batch;
      const detail = await axiosInstance.get(`/qr-attendance/batches/${batch.id}`);
      setDraftDetail(detail.data.data);
      await loadQrImage(batch.id);
      setNotice('Batch submitted. Registration Team must scan or open it and approve the attendance.');
      await loadSessionData(session.id);
    } catch (requestError) { setError(apiError(requestError, 'Could not submit this attendance batch.')); }
    finally { setBusy(false); }
  };

  const openReviewBatch = async (batchId) => {
    setBusy(true); setError('');
    try {
      const response = await axiosInstance.get(`/qr-attendance/batches/${batchId}`);
      setReviewDetail(response.data.data);
      setRejectReason(''); setLateReason(''); setForceLateApproval(false);
    } catch (requestError) { setError(apiError(requestError, 'Could not open this attendance batch.')); }
    finally { setBusy(false); }
  };

  const resolveDecodedQr = async (payload) => {
    const mode = scannerMode;
    setScannerMode(''); setError(''); setNotice('');
    if (!session) return;
    if (mode === 'batch') {
      setBusy(true);
      try {
        const response = await axiosInstance.post('/qr-attendance/batches/resolve', {
          session_id: Number(session.id), qr_payload: payload,
        });
        setReviewDetail(response.data.data);
        setRejectReason(''); setLateReason(''); setForceLateApproval(false);
      } catch (requestError) { setError(apiError(requestError, 'This is not a reviewable batch QR for the selected session.')); }
      finally { setBusy(false); }
      return;
    }
    if (mode === 'leader') {
      await addMemberToDraft(null, payload);
      return;
    }
    setBusy(true);
    try {
      const response = await axiosInstance.post(`/qr-attendance/sessions/${session.id}/member-preview`, { qr_payload: payload });
      setCandidate({ ...response.data.data, qr_payload: payload });
    } catch (requestError) { setError(apiError(requestError, 'Member QR could not be verified for this session.')); }
    finally { setBusy(false); }
  };

  const confirmCandidate = async () => {
    if (!candidate || candidate.outcome !== 'ready') return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await axiosInstance.post(`/qr-attendance/sessions/${session.id}/check-ins`, {
        ...(candidate.qr_payload ? { qr_payload: candidate.qr_payload } : { member_id: candidate.member.id }),
      });
      setNotice(`${response.data.data.member.first_name} ${response.data.data.member.last_name} is checked in.`);
      setCandidate(null);
      await loadSessionData(session.id);
    } catch (requestError) { setError(apiError(requestError, 'Check-in could not be saved.')); }
    finally { setBusy(false); }
  };

  const approveBatch = async () => {
    if (!reviewDetail?.batch) return;
    const isLate = Date.now() > new Date(reviewDetail.batch.approval_deadline).getTime();
    if (isLate && lateReason.trim().length < 5) { setForceLateApproval(true); setError('Enter a reason of at least 5 characters to approve a late batch.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await axiosInstance.post(`/qr-attendance/batches/${reviewDetail.batch.id}/approve`, {
        expected_revision: Number(reviewDetail.batch.revision),
        content_digest: reviewDetail.batch.content_digest,
        late_approval: isLate,
        ...(isLate && { late_approval_reason: lateReason.trim() }),
      });
      const result = response.data.data;
      setReviewDetail({ ...reviewDetail, batch: result.batch, receipt: result });
      setNotice(`Approved: ${result.newly_confirmed_count} new check-ins, ${result.already_confirmed_count} already confirmed.`);
      await loadSessionData(session.id);
    } catch (requestError) { setError(apiError(requestError, 'Batch approval failed.')); }
    finally { setBusy(false); }
  };

  const rejectBatch = async () => {
    if (!reviewDetail?.batch || rejectReason.trim().length < 5) { setError('Enter a rejection reason of at least 5 characters.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await axiosInstance.post(`/qr-attendance/batches/${reviewDetail.batch.id}/reject`, {
        expected_revision: Number(reviewDetail.batch.revision), reason: rejectReason.trim(),
      });
      setNotice('Batch rejected with the recorded reason.');
      setReviewDetail(null);
      await loadSessionData(session.id);
    } catch (requestError) { setError(apiError(requestError, 'Could not reject this attendance batch.')); }
    finally { setBusy(false); }
  };

  const withdrawBatch = async () => {
    if (!draftDetail?.batch || !window.confirm('Withdraw this draft or pending batch?')) return;
    setBusy(true); setError('');
    try {
      await axiosInstance.post(`/qr-attendance/batches/${draftDetail.batch.id}/withdraw`, {
        expected_revision: Number(draftDetail.batch.revision), reason: 'Withdrawn by submitting leader',
      });
      setDraftDetail(null); releaseBatchQr();
      setNotice('Attendance batch withdrawn.');
      await loadSessionData(session.id);
    } catch (requestError) { setError(apiError(requestError, 'Could not withdraw this batch.')); }
    finally { setBusy(false); }
  };

  const correctRecord = async (record, action) => {
    const name = `${record.Member?.first_name || record.member?.first_name || ''} ${record.Member?.last_name || record.member?.last_name || ''}`.trim();
    const reason = window.prompt(`${action === 'void' ? 'Void' : 'Reinstate'} attendance for ${name}. Enter a reason (at least 5 characters):`);
    if (!reason || reason.trim().length < 5) return;
    setBusy(true); setError('');
    try {
      await axiosInstance.post(`/qr-attendance/sessions/${session.id}/members/${record.member_id}/correction`, {
        action, reason: reason.trim(), expected_version: Number(record.qr_revision ?? record.version ?? 0),
      });
      setNotice(`Attendance ${action === 'void' ? 'voided' : 'reinstated'} with an audit record.`);
      await loadSessionData(session.id);
    } catch (requestError) { setError(apiError(requestError, 'Attendance correction failed.')); }
    finally { setBusy(false); }
  };

  const downloadCsv = async () => {
    if (!session) return;
    setBusy(true); setError('');
    try {
      const response = await axiosInstance.get(`/qr-attendance/sessions/${session.id}/export.csv`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-session-${session.id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) { setError(apiError(requestError, 'Could not export this session.')); }
    finally { setBusy(false); }
  };

  if (loading && !availability) return <div className="qr-workspace"><div className="qr-workspace-card" role="status">Loading QR attendance…</div></div>;
  if (availability && !availability.enabled) return (
    <div className="qr-workspace"><div className="qr-workspace-card">
      <h1>{title}</h1>
      <div className="qr-muted-box" role="status">
        {availability.reason === 'disabled' ? 'QR attendance is switched off in Admin Settings.' : 'QR attendance schema is not ready. Ask an administrator to verify the database migration before opening sessions.'}
      </div>
      {error && <div className="qr-inline-error" role="alert">{error}</div>}
    </div></div>
  );

  const submittedBatches = batchRows.filter((batch) => batch.state === 'submitted');
  const isLate = forceLateApproval || (reviewDetail?.batch && Date.now() > new Date(reviewDetail.batch.approval_deadline).getTime());
  const sessionTarget = session?.target || {};

  return (
    <div className="qr-workspace">
      <div className="qr-workspace-card">
        <div className="qr-workspace-header">
          <div>
            <h1>{title}</h1>
            <p>Select the correct activity session before scanning. Attendance is kept separately for each Service or Event.</p>
          </div>
          <a className="qr-secondary-button" href="/attendance">Back to Attendance</a>
        </div>
        {error && <div className="qr-inline-error" role="alert">{error}</div>}
        {notice && <div className="qr-success-box" role="status">{notice}</div>}

        {!targetType || !targetId ? (
          <div className="qr-muted-box">Open QR attendance from a specific Service or Event to manage its sessions.</div>
        ) : null}

        <div className="qr-section-heading">
          <label className="qr-form-field" htmlFor="qr-session-select">Attendance session
            <select id="qr-session-select" className="qr-session-select" value={sessionId} onChange={(event) => {
              const nextId = event.target.value;
              setReviewDetail(null); setCandidate(null); setNotice(''); setError(''); setForceLateApproval(false); setAttendancePage(1); setSessionId(nextId);
              if (!nextId) loadSessionData('');
            }}>
              <option value="">Select a session</option>
              {sessions.map((row) => <option key={row.id} value={row.id}>{row.title} · {row.status} · {new Date(row.starts_at).toLocaleString()}</option>)}
            </select>
          </label>
          {canConfigure && targetType && targetId && <span className="qr-state-pill">Admin session setup</span>}
        </div>

        {canConfigure && targetType && targetId && (
          <details className="qr-section">
            <summary className="qr-secondary-button">Create attendance session</summary>
            <form className="qr-workspace-card qr-section" onSubmit={createSession}>
              <div className="qr-form-grid">
                <label className="qr-form-field">Session title
                  <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={150} />
                </label>
                <label className="qr-form-field">Session key
                  <input value={form.session_key} onChange={(event) => setForm({ ...form, session_key: event.target.value })} required maxLength={80} />
                </label>
                <label className="qr-form-field">Expected attendance
                  <select value={form.expected_basis} onChange={(event) => setForm({ ...form, expected_basis: event.target.value, registration_required: event.target.value === 'registrations' })}>
                    <option value="none">No expected roster</option>
                    {targetType === 'event' && <option value="registrations">Event registrations</option>}
                    <option value="explicit_roster">Explicit member list</option>
                  </select>
                </label>
                {Object.entries({
                  starts_at: 'Activity starts',
                  ends_at: 'Activity ends',
                  check_in_opens_at: 'Check-in opens',
                  check_in_closes_at: 'Check-in closes',
                  approval_deadline: 'Batch approval deadline',
                }).map(([key, label]) => (
                  <label className="qr-form-field" key={key}>{label}
                    <input type="datetime-local" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required />
                  </label>
                ))}
              </div>
              {targetType === 'event' && form.expected_basis === 'registrations' && (
                <p className="qr-muted-box">Event registration will be required for check-in in this session.</p>
              )}
              <div className="qr-action-row"><button className="qr-primary-button" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Draft Session'}</button></div>
              <p className="qr-scanner-footnote">New sessions start as draft. Opening is a separate action. Times are converted to UTC from this browser and shown in Asia/Manila.</p>
            </form>
          </details>
        )}

        {sessions.length === 0 && targetType && targetId && !canConfigure && <div className="qr-muted-box">No QR attendance session has been created for this activity yet.</div>}
      </div>

      {loading && sessionId && !session && <div className="qr-workspace-card qr-section" role="status">Loading the selected session…</div>}

      {session && (
        <div className="qr-workspace-card qr-section">
          <div className="qr-workspace-header">
            <div>
              <h2>{session.title}</h2>
              <p>{sessionTarget.title || (session.service_id ? 'Service session' : 'Event session')} · {new Date(session.starts_at).toLocaleString()} · {session.time_zone || 'Asia/Manila'}</p>
            </div>
            <span className={`qr-session-status qr-status-${session.status}`}>{session.status}</span>
          </div>

          {summary && <div className="qr-summary-grid">
            <div className="qr-summary-tile"><strong>{summary.confirmed_count}</strong><span>Confirmed</span></div>
            <div className="qr-summary-tile"><strong>{summary.expected_count ?? '—'}</strong><span>Expected</span></div>
            <div className="qr-summary-tile"><strong>{summary.registered_count}</strong><span>Registered / RSVP</span></div>
            <div className="qr-summary-tile"><strong>{summary.pending_members_count}</strong><span>Pending leader entries</span></div>
            <div className="qr-summary-tile"><strong>{summary.absent_count ?? '—'}</strong><span>Absent after close</span></div>
          </div>}

          {canConfigure && <div className="qr-action-row">
            {session.status === 'draft' && <button type="button" className="qr-primary-button" disabled={busy} onClick={() => updateSession('open')}>Open Check-in</button>}
            {session.status === 'open' && <button type="button" className="qr-secondary-button" disabled={busy} onClick={() => updateSession('close')}>Close Check-in</button>}
            {['draft', 'open'].includes(session.status) && <button type="button" className="qr-danger-button" disabled={busy} onClick={() => {
              const reason = window.prompt('Enter a reason for cancelling this attendance session (at least 5 characters):');
              if (reason?.trim().length >= 5) updateSession('cancel', { reason: reason.trim() });
            }}>Cancel Session</button>}
            <button type="button" className="qr-secondary-button" disabled={busy} onClick={downloadCsv}>Export CSV</button>
          </div>}

          {canConfigure && session.status === 'draft' && session.expected_basis === 'explicit_roster' && (
            <section className="qr-section">
              <h3>Expected member roster</h3>
              <p>Add expected members before opening the session. The roster is frozen when the session opens.</p>
              <label className="qr-form-field">Add a member
                <input className="qr-search-input" value={expectedQuery} onChange={(event) => setExpectedQuery(event.target.value)} placeholder="Search members by name or barcode" />
              </label>
              <label className="qr-form-field qr-section">Reason
                <input className="qr-search-input" value={expectedReason} onChange={(event) => setExpectedReason(event.target.value)} minLength={5} maxLength={500} />
              </label>
              <div className="qr-list qr-section">{expectedResults.map((member) => <div className="qr-list-row" key={member.id}>
                <span>{member.last_name}, {member.first_name}</span>
                <button className="qr-secondary-button" type="button" disabled={busy} onClick={() => addExpectedMember(member)}>Add</button>
              </div>)}</div>
            </section>
          )}

          {session.status === 'open' && canCheckIn && <section className="qr-section qr-workspace-card">
            <h3>Registration Team · Individual check-in</h3>
            <p>Scan a fixed member QR or find the member manually. Confirm after checking the member at the desk.</p>
            <div className="qr-action-row"><button type="button" className="qr-primary-button" disabled={busy} onClick={() => { setCandidate(null); setScannerMode('member'); }}>Scan Member QR</button></div>
            {candidate && <div className="qr-result-box">
              <strong>{candidate.member.first_name} {candidate.member.last_name}</strong>
              <div>{candidate.outcome === 'ready' ? 'Ready to check in' : candidate.outcome === 'already_confirmed' ? `Already checked in at ${new Date(candidate.checked_in_at).toLocaleTimeString()}` : 'This attendance was voided. Use the audited correction action.'}</div>
              {candidate.outcome === 'ready' && <button type="button" className="qr-primary-button qr-section" disabled={busy} onClick={confirmCandidate}>Confirm Check-in</button>}
              <button type="button" className="qr-secondary-button qr-section" onClick={() => setCandidate(null)}>Clear</button>
            </div>}
          </section>}

          {session.status === 'open' && canRecordBatch && isGroupLeader && <section className="qr-section qr-workspace-card">
            <h3>Leader attendance batch · {user.roleName}</h3>
            <p>Scan or select members assigned to your current group. Scans are saved as pending draft entries and do not affect confirmed totals.</p>
            {!draftDetail?.batch && <button type="button" className="qr-primary-button" onClick={startDraft} disabled={busy}>Start Leader Batch</button>}
            {draftDetail?.batch?.state === 'draft' && <div className="qr-action-row">
              <button type="button" className="qr-primary-button" disabled={busy} onClick={() => setScannerMode('leader')}>Scan Member into Draft</button>
              <button type="button" className="qr-secondary-button" disabled={busy} onClick={submitDraft}>Submit Batch for Review</button>
              <button type="button" className="qr-danger-button" disabled={busy} onClick={withdrawBatch}>Withdraw</button>
            </div>}
          </section>}

          {(canCheckIn || (canRecordBatch && isGroupLeader && session.status === 'open')) && session.status === 'open' && (
            <section className="qr-section qr-workspace-card">
              <h3>{isGroupLeader ? 'Add a member manually' : 'Manual member lookup'}</h3>
              <input className="qr-search-input" value={rosterQuery} onChange={(event) => setRosterQuery(event.target.value)} placeholder="Search by member name or barcode" aria-label="Search members" />
              {rosterLoading && <p role="status">Searching members…</p>}
              <div className="qr-list qr-section">{rosterResults.map((member) => <div className="qr-list-row" key={member.id}>
                <span>{member.last_name}, {member.first_name} <small>· {member.status}</small></span>
                {isGroupLeader
                  ? <button type="button" className="qr-secondary-button" disabled={busy || !draftDetail?.batch} onClick={() => addMemberToDraft(member.id, null)}>Add to Draft</button>
                  : <button type="button" className="qr-secondary-button" disabled={busy} onClick={() => {
                    setCandidate({ member, outcome: 'ready', qr_payload: null, checked_in_at: null });
                    setRosterQuery(''); setRosterResults([]);
                  }}>Review Check-in</button>}
              </div>)}</div>
            </section>
          )}

          {['open', 'closed'].includes(session.status) && canReviewBatch && <section className="qr-section qr-workspace-card">
            <h3>Registration Team · Review leader batches</h3>
            <p>Scan the leader's batch QR or open one of the submitted batches below. Approval adds the entries to this event or service once.</p>
            <div className="qr-action-row"><button type="button" className="qr-primary-button" disabled={busy} onClick={() => setScannerMode('batch')}>Scan Leader Batch QR</button></div>
            {submittedBatches.length === 0 ? <div className="qr-muted-box qr-section">No leader batches are waiting for review.</div> : (
              <div className="qr-list qr-section">{submittedBatches.map((batch) => <div className="qr-list-row" key={batch.id}>
                <div className="qr-list-row-main"><strong>Batch #{batch.id}</strong><small>{batch.submitter?.member ? `${batch.submitter.member.first_name} ${batch.submitter.member.last_name}` : 'Leader'} · {batch.cellGroup?.name || batch.group?.name || 'No group'} · submitted {batch.submitted_at ? new Date(batch.submitted_at).toLocaleString() : ''}</small></div>
                <button type="button" className="qr-secondary-button" onClick={() => openReviewBatch(batch.id)}>Review</button>
              </div>)}</div>
            )}
          </section>}

          {reviewDetail?.batch && <section className="qr-section qr-result-box">
            <div className="qr-section-heading"><h3>Review Batch #{reviewDetail.batch.id}</h3><span className={`qr-state-pill qr-status-${reviewDetail.batch.state}`}>{reviewDetail.batch.state}</span></div>
            <p>{reviewDetail.session?.target?.title || sessionTarget.title} · {reviewDetail.session?.title || session.title} · submitted by {reviewDetail.submitter?.name || `Leader #${reviewDetail.submitter?.id || reviewDetail.batch.submitted_by}`} · {reviewDetail.scope?.name || 'Group not listed'} · {reviewDetail.batch.submitted_at ? new Date(reviewDetail.batch.submitted_at).toLocaleString() : ''}</p>
            <p>Review the complete attendee list before approval. Capture times and duplicates are preserved.</p>
            <div className="qr-table-wrap"><table className="qr-table"><thead><tr><th>Member</th><th>Captured at</th><th>Capture</th><th>Outcome</th></tr></thead><tbody>
              {(reviewDetail.items || []).map((item) => <tr key={item.id}><td>{item.member?.last_name}, {item.member?.first_name}</td><td>{new Date(item.captured_at).toLocaleString()}</td><td>{item.capture_method}</td><td>{item.outcome}</td></tr>)}
            </tbody></table></div>
            {reviewDetail.batch.state === 'submitted' && canReviewBatch && <>
              {isLate && <label className="qr-form-field qr-section">Reason for late approval
                <textarea className="qr-reason-input" value={lateReason} onChange={(event) => setLateReason(event.target.value)} minLength={5} maxLength={500} placeholder="Explain why this late batch should be approved" />
              </label>}
              <label className="qr-form-field qr-section">Reason for rejection (required to reject)
                <textarea className="qr-reason-input" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} minLength={5} maxLength={500} placeholder="Explain what needs correction" />
              </label>
              <div className="qr-action-row">
                <button type="button" className="qr-primary-button" disabled={busy} onClick={approveBatch}>Approve Attendance</button>
                <button type="button" className="qr-danger-button" disabled={busy || rejectReason.trim().length < 5} onClick={rejectBatch}>Reject Batch</button>
                <button type="button" className="qr-secondary-button" onClick={() => { setReviewDetail(null); setForceLateApproval(false); }}>Close Review</button>
              </div>
            </>}
            {reviewDetail.receipt && <div className="qr-success-box">Approval receipt: {reviewDetail.receipt.newly_confirmed_count} new, {reviewDetail.receipt.already_confirmed_count} already confirmed.</div>}
          </section>}

          {draftDetail?.batch && <section className="qr-section qr-workspace-card">
            <div className="qr-section-heading"><h3>Your batch · #{draftDetail.batch.id}</h3><span className={`qr-state-pill qr-status-${draftDetail.batch.state}`}>{draftDetail.batch.state}</span></div>
            {(draftDetail.items || []).length ? <div className="qr-table-wrap"><table className="qr-table"><thead><tr><th>Member</th><th>Captured</th><th>Outcome</th>{draftDetail.batch.state === 'draft' && <th>Action</th>}</tr></thead><tbody>
              {(draftDetail.items || []).map((item) => <tr key={item.id}><td>{item.member?.last_name}, {item.member?.first_name}</td><td>{new Date(item.captured_at).toLocaleTimeString()}</td><td>{item.outcome}</td>{draftDetail.batch.state === 'draft' && <td><button type="button" className="qr-danger-button" disabled={busy} onClick={() => removeDraftMember(item.member_id)}>Remove</button></td>}</tr>)}
            </tbody></table></div> : <div className="qr-muted-box">No members added yet.</div>}
            {draftDetail.batch.state === 'draft' && session.status !== 'open' && <div className="qr-action-row">
              <button type="button" className="qr-primary-button" disabled={busy} onClick={submitDraft}>Submit Batch for Review</button>
              <button type="button" className="qr-danger-button" disabled={busy} onClick={withdrawBatch}>Withdraw Draft</button>
            </div>}
            {draftDetail.batch.state === 'submitted' && <>
              {batchQrUrl && <div className="qr-print-area qr-section"><img className="qr-member-qr" src={batchQrUrl} alt="Submitted attendance batch QR code" /></div>}
              <div className="qr-action-row">
                {batchQrUrl && <a className="qr-secondary-button" href={batchQrUrl} download={`mcc-attendance-batch-${draftDetail.batch.id}.png`}>Download Batch QR</a>}
                {batchQrUrl && <button className="qr-secondary-button" type="button" onClick={() => window.print()}>Print Batch QR</button>}
                <button type="button" className="qr-danger-button" disabled={busy} onClick={withdrawBatch}>Withdraw Submission</button>
              </div>
              <p className="qr-scanner-footnote">Give this QR to Registration Team. Approval is still required before the attendees count as present.</p>
            </>}
            {draftDetail.batch.state === 'approved' && <div className="qr-success-box">Approved: {draftDetail.receipt?.newly_confirmed_count ?? 0} new check-ins, {draftDetail.receipt?.already_confirmed_count ?? 0} already confirmed.</div>}
            {draftDetail.batch.state === 'rejected' && <div className="qr-inline-error">Rejected: {draftDetail.batch.decision_reason}</div>}
          </section>}

          <section className="qr-section qr-workspace-card">
            <div className="qr-section-heading"><div><h3>Confirmed attendance</h3><small>{attendanceCount.toLocaleString()} total records</small></div><button type="button" className="qr-secondary-button" disabled={busy} onClick={downloadCsv}>Export CSV</button></div>
            {attendance.length === 0 ? <div className="qr-muted-box">No confirmed attendance has been recorded for this session.</div> : (
              <div className="qr-table-wrap"><table className="qr-table"><thead><tr><th>Member</th><th>Check-in</th><th>Method</th><th>Source</th><th>Status</th>{canCorrect && <th>Correction</th>}</tr></thead><tbody>
                {attendance.map((record) => {
                  const member = record.Member || record.member;
                  const qrRecord = session.service_id ? record.entry_source !== 'legacy' : true;
                  return <tr key={`${session.service_id ? 's' : 'e'}-${record.id}`}>
                    <td>{member?.last_name}, {member?.first_name}</td>
                    <td>{new Date(record.checked_in_at).toLocaleString()}</td>
                    <td>{record.check_in_method}</td>
                    <td>{record.entry_source}</td>
                    <td>{record.voided_at ? 'Voided' : 'Present'}</td>
                    {canCorrect && <td>{qrRecord && <button type="button" className={record.voided_at ? 'qr-secondary-button' : 'qr-danger-button'} disabled={busy} onClick={() => correctRecord(record, record.voided_at ? 'reinstate' : 'void')}>{record.voided_at ? 'Reinstate' : 'Void'}</button>}</td>}
                  </tr>;
                })}
              </tbody></table></div>
            )}
            {attendanceCount > 100 && <div className="qr-action-row" aria-label="Attendance pagination">
              <button type="button" className="qr-secondary-button" disabled={attendanceLoading || attendancePage <= 1} onClick={() => loadAttendancePage(session.id, attendancePage - 1)}>Previous</button>
              <span aria-live="polite" className="qr-scanner-footnote">Page {attendancePage} of {Math.ceil(attendanceCount / 100)}</span>
              <button type="button" className="qr-secondary-button" disabled={attendanceLoading || attendancePage >= Math.ceil(attendanceCount / 100)} onClick={() => loadAttendancePage(session.id, attendancePage + 1)}>Next</button>
              {attendanceLoading && <span role="status" className="qr-scanner-footnote">Loading…</span>}
            </div>}
          </section>

          {canReviewBatch && batchRows.length > 0 && <section className="qr-section qr-workspace-card">
            <h3>Recent batch history</h3>
            <div className="qr-list qr-section">{batchRows.map((batch) => <div className="qr-list-row" key={batch.id}>
              <div className="qr-list-row-main"><strong>Batch #{batch.id}</strong><small>{batch.submitter?.member ? `${batch.submitter.member.first_name} ${batch.submitter.member.last_name}` : 'Leader'} · {batch.cellGroup?.name || batch.group?.name || 'No group'} · {batch.submitted_at ? new Date(batch.submitted_at).toLocaleString() : 'Draft'}</small></div>
              <span className={`qr-state-pill qr-status-${batch.state}`}>{batch.state}</span>
              {batch.state === 'submitted' && <button type="button" className="qr-secondary-button" onClick={() => openReviewBatch(batch.id)}>Open</button>}
            </div>)}</div>
          </section>}
        </div>
      )}

      {scannerMode && <QrScannerDialog
        title={scannerMode === 'batch' ? 'Scan Leader Batch QR' : scannerMode === 'leader' ? 'Scan Member into Leader Draft' : 'Scan Member QR'}
        onClose={() => setScannerMode('')}
        onDecode={resolveDecodedQr}
      />}
    </div>
  );
}

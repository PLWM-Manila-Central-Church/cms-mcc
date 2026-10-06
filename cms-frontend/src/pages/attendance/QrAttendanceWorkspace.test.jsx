import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  user: null,
  permissions: new Set(),
}));

vi.mock('../../api/axiosInstance', () => ({ default: { get: fixture.get, post: fixture.post, delete: fixture.delete } }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: fixture.user, hasPermission: (moduleName, action) => fixture.permissions.has(`${moduleName}:${action}`) }),
}));
vi.mock('../../components/attendance/QrScannerDialog', () => ({
  default: ({ title, onDecode, onClose }) => <div role="dialog" aria-label={title}>
    <button type="button" onClick={() => onDecode(title.includes('Batch') ? 'MCC:BATCH:1:123' : 'MCC:MEMBER:1:123')}>Simulate QR scan</button>
    <button type="button" onClick={onClose}>Close mock scanner</button>
  </div>,
}));

import QrAttendanceWorkspace from './QrAttendanceWorkspace';

const session = {
  id: 1,
  event_id: 7,
  service_id: null,
  title: 'Main Gathering',
  session_key: 'morning',
  starts_at: '2026-10-07T02:00:00.000Z',
  status: 'open',
  approval_deadline: '2026-10-08T02:00:00.000Z',
  target: { title: 'Test Event', status: 'Ongoing' },
};
const member = { id: 10, first_name: 'Jordan', last_name: 'Test', status: 'Active' };

let batchRows;
let batchDetail;

function mockScenario() {
  fixture.get.mockImplementation(async (url) => {
    if (url === '/qr-attendance/capabilities') return { data: { data: { enabled: true, schemaReady: true, reason: null } } };
    if (url === '/qr-attendance/sessions') return { data: { data: { sessions: [session] } } };
    if (url === '/qr-attendance/sessions/1') return { data: { data: session } };
    if (url.endsWith('/summary')) return { data: { data: { confirmed_count: 0, expected_count: null, registered_count: 0, pending_members_count: 0, absent_count: null } } };
    if (url.endsWith('/attendance')) return { data: { data: { records: [], count: 0, page: 1, limit: 100 } } };
    if (url.endsWith('/batches')) return { data: { data: { batches: batchRows } } };
    if (url === '/qr-attendance/batches/8') return { data: { data: batchDetail } };
    if (url === '/qr-attendance/batches/44') return { data: { data: batchDetail } };
    if (url.endsWith('/image.png')) return { data: new Blob(['png']) };
    throw new Error(`Unexpected GET ${url}`);
  });
}

function renderWorkspace() {
  return render(<MemoryRouter><QrAttendanceWorkspace targetType="event" targetId="7" /></MemoryRouter>);
}

describe('QR attendance workspace role flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    batchRows = [];
    batchDetail = {
      batch: { id: 8, state: 'draft', revision: 1, submitted_by: 2, approval_deadline: '2026-10-08T02:00:00.000Z' },
      items: [],
    };
    fixture.user = { userId: 2, roleName: 'Registration Team' };
    fixture.permissions = new Set([
      'qr_attendance:read', 'qr_attendance:check_in', 'qr_attendance:review_batch',
      'qr_attendance:correct', 'qr_attendance:configure_session', 'member_qr:manage',
    ]);
    mockScenario();
  });

  it('requires Registration Team confirmation before a direct check-in', async () => {
    fixture.post.mockImplementation(async (url) => {
      if (url.endsWith('/member-preview')) return { data: { data: { member, outcome: 'ready', checked_in_at: null } } };
      if (url.endsWith('/check-ins')) return { data: { data: { member, outcome: 'confirmed', created: true, attendance: { id: 30 } } } };
      throw new Error(`Unexpected POST ${url}`);
    });

    renderWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Scan Member QR' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate QR scan' }));
    expect(await screen.findByText('Jordan Test')).toBeInTheDocument();
    expect(fixture.post).toHaveBeenCalledWith('/qr-attendance/sessions/1/member-preview', { qr_payload: 'MCC:MEMBER:1:123' });
    expect(fixture.post).not.toHaveBeenCalledWith('/qr-attendance/sessions/1/check-ins', expect.anything());

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Check-in' }));
    await waitFor(() => expect(fixture.post).toHaveBeenCalledWith('/qr-attendance/sessions/1/check-ins', { qr_payload: 'MCC:MEMBER:1:123' }));
    expect(await screen.findByText('Jordan Test is checked in.')).toBeInTheDocument();
  });

  it('lets a scoped Cell Group Leader record a draft and receive a batch QR only after submission', async () => {
    fixture.user = { userId: 2, roleName: 'Cell Group Leader' };
    fixture.permissions = new Set(['qr_attendance:read', 'qr_attendance:record_batch', 'qr_attendance:submit_batch']);
    fixture.post.mockImplementation(async (url) => {
      if (url.endsWith('/sessions/1/batches')) return { data: { data: { batch: { id: 8, state: 'draft', revision: 1 }, created: true } } };
      if (url === '/qr-attendance/batches/8/items') {
        batchDetail = {
          batch: { id: 8, state: 'draft', revision: 2, submitted_by: 2, approval_deadline: session.approval_deadline },
          items: [{ id: 1, member_id: member.id, captured_at: '2026-10-07T02:15:00.000Z', outcome: 'pending', member }],
        };
        return { data: { data: { added: true, member } } };
      }
      if (url === '/qr-attendance/batches/8/submit') {
        batchDetail = {
          ...batchDetail,
          batch: { ...batchDetail.batch, state: 'submitted', revision: 3, content_digest: 'a'.repeat(64), submitted_at: '2026-10-07T02:20:00.000Z' },
        };
        batchRows = [batchDetail.batch];
        return { data: { data: { batch: batchDetail.batch, payload: 'MCC:BATCH:1:123', item_count: 1 } } };
      }
      throw new Error(`Unexpected POST ${url}`);
    });

    renderWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Start Leader Batch' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Scan Member into Draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate QR scan' }));
    expect(await screen.findByText('Jordan Test saved as pending.')).toBeInTheDocument();
    expect(fixture.post).toHaveBeenCalledWith('/qr-attendance/batches/8/items', {
      qr_payload: 'MCC:MEMBER:1:123', expected_revision: 1,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Batch for Review' }));
    expect(await screen.findByRole('link', { name: 'Download Batch QR' })).toHaveAttribute('download', 'mcc-attendance-batch-8.png');
    expect(fixture.get).toHaveBeenCalledWith('/qr-attendance/batches/8/image.png', { responseType: 'blob' });
  });

  it('lets Registration Team review the saved batch and approve it once', async () => {
    const submittedBatch = {
      id: 44, state: 'submitted', revision: 2, content_digest: 'b'.repeat(64), submitted_by: 3,
      submitted_at: '2026-10-07T02:20:00.000Z', approval_deadline: session.approval_deadline,
    };
    batchRows = [submittedBatch];
    batchDetail = {
      batch: submittedBatch,
      items: [{ id: 5, member_id: member.id, captured_at: '2026-10-07T02:15:00.000Z', capture_method: 'qr', outcome: 'pending', member }],
      session,
      submitter: { id: 3, name: 'Cell Leader' },
      scope: { name: 'North Cell' },
    };
    fixture.post.mockImplementation(async (url) => {
      if (url === '/qr-attendance/batches/44/approve') {
        batchDetail = {
          ...batchDetail,
          batch: { ...submittedBatch, state: 'approved', revision: 3 },
          receipt: { newly_confirmed_count: 1, already_confirmed_count: 0 },
        };
        batchRows = [];
        return { data: { data: { batch: batchDetail.batch, newly_confirmed_count: 1, already_confirmed_count: 0 } } };
      }
      throw new Error(`Unexpected POST ${url}`);
    });

    renderWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    expect(await screen.findByText('Test, Jordan')).toBeInTheDocument();
    expect(screen.getByText(/Cell Leader.*North Cell/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve Attendance' }));
    await waitFor(() => expect(fixture.post).toHaveBeenCalledWith('/qr-attendance/batches/44/approve', {
      expected_revision: 2, content_digest: 'b'.repeat(64), late_approval: false,
    }));
    expect(await screen.findByText(/Approved: 1 new check-ins, 0 already confirmed/)).toBeInTheDocument();
  });
});

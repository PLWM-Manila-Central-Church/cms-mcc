import { useSearchParams } from 'react-router-dom';
import QrAttendanceWorkspace from './QrAttendanceWorkspace';

export default function QrAttendancePage() {
  const [params] = useSearchParams();
  return <QrAttendanceWorkspace targetType={params.get('target_type') || ''} targetId={params.get('target_id') || ''} />;
}

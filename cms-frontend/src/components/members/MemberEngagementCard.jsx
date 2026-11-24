import { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';

export default function MemberEngagementCard({ memberId }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!memberId) return;
    axiosInstance.get(`/members/${memberId}/engagement`)
      .then((res) => setProfile(res.data?.data || null))
      .catch(() => setProfile(null));
  }, [memberId]);

  if (!profile) return null;

  const rsvp = profile.rsvp_summary || {};
  return (
    <section style={S.card} aria-label="Member ministry and engagement profile">
      <h2 style={S.title}>Ministry &amp; Pastoral Engagement</h2>
      <div style={S.grid}>
        <div style={S.stat}>
          <span style={S.label}>Life-Stage Ministry</span>
          <strong style={S.value}>{profile.ministry?.name || 'Unassigned'}</strong>
        </div>
        <div style={S.stat}>
          <span style={S.label}>Serving Teams</span>
          <strong style={S.value}>
            {(profile.serving_teams || []).length > 0
              ? profile.serving_teams.map((t) => t.name).join(', ')
              : 'None assigned'}
          </strong>
        </div>
        <div style={S.stat}>
          <span style={S.label}>Activity RSVPs (Yes / No)</span>
          <strong style={S.value}>{rsvp.yes || 0} Yes · {rsvp.no || 0} No</strong>
        </div>
        <div style={S.stat}>
          <span style={S.label}>Verified Activity Check-ins</span>
          <strong style={S.value}>{rsvp.actual_attended || 0}</strong>
        </div>
      </div>
      {(profile.visitations || []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h3 style={S.subTitle}>Recent Pastoral Care &amp; Visitations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {profile.visitations.slice(0, 5).map((v) => (
              <div key={v.id} style={S.row}>
                <span><strong>{v.visit_date}</strong> · {v.visit_type.replace('_', ' ')} ({v.care_stage.replace('_', ' ')})</span>
                {v.notes && <span style={{ color: '#52647a' }}>— {v.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const S = {
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, marginTop: 18 },
  title: { margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#003d70' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 },
  stat: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3 },
  label: { fontSize: 11.5, fontWeight: 600, color: '#52647a', textTransform: 'uppercase' },
  value: { fontSize: 14, color: '#0f172a' },
  subTitle: { margin: '0 0 6px', fontSize: 13.5, fontWeight: 700, color: '#003d70' },
  row: { fontSize: 13, color: '#0f172a', display: 'flex', gap: 6, flexWrap: 'wrap' },
};

import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

const fetchStats = async () => {
  const res = await api.get('/dashboard/stats');
  return res.data.data;
};

export const dashboardStatsQueryKey = (user, activeLeaderScopeKey) => {
  const leaderAssignments = (user?.leaderAssignments || [])
    .map((assignment) => [
      assignment.scopeType || assignment.scope_type || '',
      assignment.scopeId ?? assignment.scope_id ?? '',
    ])
    .sort(([typeA, idA], [typeB, idB]) => `${typeA}:${idA}`.localeCompare(`${typeB}:${idB}`));

  return [
    'dashboard',
    'stats',
    user?.id ?? user?.userId ?? null,
    user?.roleName ?? null,
    user?.leadsMinistryId ?? null,
    user?.leadsCellGroupId ?? null,
    user?.leadsGroupId ?? null,
    activeLeaderScopeKey ?? null,
    leaderAssignments,
  ];
};

export function useDashboardStats() {
  const { user, loading, activeLeaderScopeKey } = useAuth();
  return useQuery({
    queryKey: dashboardStatsQueryKey(user, activeLeaderScopeKey),
    queryFn: fetchStats,
    enabled: !loading && Boolean(user),
  });
}

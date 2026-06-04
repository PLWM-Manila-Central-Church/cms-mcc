import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance';

const fetchStats = async () => {
  const res = await api.get('/dashboard/stats');
  return res.data.data;
};

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchStats,
  });
}

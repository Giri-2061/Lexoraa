import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface TeacherRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  organization: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/** Fetch the current user's own teacher requests */
export function useMyTeacherRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-teacher-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('teacher_requests' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as TeacherRequest[];
    },
    enabled: !!user,
  });
}

/** Submit a teacher request */
export function useSubmitTeacherRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { organization?: string; reason?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('teacher_requests' as any)
        .insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name ?? 'Unknown',
          email: user.email ?? '',
          organization: payload.organization ?? null,
          reason: payload.reason ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-teacher-requests'] });
      toast({
        title: 'Request Submitted',
        description: 'Your teacher account request has been submitted for review.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ── Admin hooks ──────────────────────────────────────────────

/** Fetch ALL teacher requests (super_admin only) */
export function useAllTeacherRequests() {
  const { role } = useAuth();

  return useQuery({
    queryKey: ['all-teacher-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_requests' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as TeacherRequest[];
    },
    enabled: role === 'super_admin',
  });
}

/** Approve or reject a teacher request */
export function useReviewTeacherRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      userId,
      approved,
    }: {
      requestId: string;
      userId: string;
      approved: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // 1. Update request status
      const { error: reqErr } = await supabase
        .from('teacher_requests' as any)
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (reqErr) throw reqErr;

      // 2. If approved → grant consultancy_owner role
      if (approved) {
        const { error: roleErr } = await supabase
          .from('user_roles')
          .upsert(
            { user_id: userId, role: 'consultancy_owner' as any },
            { onConflict: 'user_id,role' },
          );

        if (roleErr) throw roleErr;
      }
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ['all-teacher-requests'] });
      toast({
        title: approved ? 'Request Approved' : 'Request Rejected',
        description: approved
          ? 'User has been granted teacher access.'
          : 'Teacher request has been rejected.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

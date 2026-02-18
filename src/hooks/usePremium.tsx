import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface PremiumRequest {
  id: string;
  user_id: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
}

export function usePremiumStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['premium-status', user?.id],
    queryFn: async () => {
      if (!user) return { isPremium: false };
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return { isPremium: data?.is_premium ?? false };
    },
    enabled: !!user,
  });
}

export function useMyPremiumRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-premium-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('premium_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PremiumRequest[];
    },
    enabled: !!user,
  });
}

export function useSubmitPremiumRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reason: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('premium_requests')
        .insert({
          user_id: user.id,
          reason,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-premium-requests'] });
      toast({
        title: 'Request Submitted',
        description: 'Your premium membership request has been submitted for review.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Admin hooks
export function useAllPremiumRequests() {
  const { role } = useAuth();

  return useQuery({
    queryKey: ['all-premium-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch user profiles for display
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);
      
      return data.map(request => ({
        ...request,
        user_email: profileMap.get(request.user_id)?.email,
        user_name: profileMap.get(request.user_id)?.full_name,
      })) as PremiumRequest[];
    },
    enabled: role === 'super_admin',
  });
}

export function useReviewPremiumRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, userId, approved }: { requestId: string; userId: string; approved: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Update request status
      const { error: requestError } = await supabase
        .from('premium_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      
      if (requestError) throw requestError;
      
      // If approved, update user's premium status
      if (approved) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('user_id', userId);
        
        if (profileError) throw profileError;
      }
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ['all-premium-requests'] });
      toast({
        title: approved ? 'Request Approved' : 'Request Rejected',
        description: approved 
          ? 'User has been granted premium membership.'
          : 'Premium request has been rejected.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

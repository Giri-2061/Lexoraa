import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LiveSession {
  id: string;
  classroom_id: string;
  teacher_id: string;
  test_type: string;
  book_id: string;
  test_id: string;
  status: string;
  current_section: number;
  audio_state: {
    playing: boolean;
    currentTime: number;
    sectionAudioUrl?: string;
  };
  started_at: string;
  ended_at: string | null;
}

export interface LiveSessionParticipant {
  id: string;
  session_id: string;
  student_id: string;
  joined_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export function useLiveSession(classroomId?: string) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [participants, setParticipants] = useState<LiveSessionParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);

  // Fetch active session for classroom
  const fetchActiveSession = useCallback(async () => {
    if (!classroomId || !user) {
      setLoading(false);
      return;
    }

    try {
      // Check if user is teacher
      const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single();
      
      setIsTeacher(classroom?.teacher_id === user.id);

      // Fetch active session
      const { data: session, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('classroom_id', classroomId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      
      if (session) {
        setActiveSession(session as unknown as LiveSession);
        
        // Fetch participants
        const { data: parts } = await supabase
          .from('live_session_participants')
          .select('*')
          .eq('session_id', session.id);
        
        setParticipants((parts || []) as unknown as LiveSessionParticipant[]);
      } else {
        setActiveSession(null);
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error fetching live session:', error);
    } finally {
      setLoading(false);
    }
  }, [classroomId, user]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!classroomId) return;

    fetchActiveSession();

    const channel = supabase
      .channel(`live_session_${classroomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `classroom_id=eq.${classroomId}`
        },
        (payload) => {
          console.log('Live session change:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const session = payload.new as unknown as LiveSession;
            if (session.status === 'active') {
              setActiveSession(session);
            } else {
              setActiveSession(null);
            }
          } else if (payload.eventType === 'DELETE') {
            setActiveSession(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classroomId, fetchActiveSession]);

  // Start a new live session (teacher only)
  const startSession = async (testType: string, bookId: string, testId: string) => {
    if (!classroomId || !user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('live_sessions')
      .insert({
        classroom_id: classroomId,
        teacher_id: user.id,
        test_type: testType,
        book_id: bookId,
        test_id: testId,
        status: 'active',
        current_section: 1,
        audio_state: { playing: false, currentTime: 0 }
      })
      .select()
      .single();

    if (error) return { error };
    setActiveSession(data as unknown as LiveSession);
    return { data };
  };

  // End live session (teacher only)
  const endSession = async () => {
    if (!activeSession) return { error: new Error('No active session') };

    const { error } = await supabase
      .from('live_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', activeSession.id);

    if (error) return { error };
    setActiveSession(null);
    return { error: null };
  };

  // Join session (student)
  const joinSession = async () => {
    if (!activeSession || !user) return { error: new Error('No active session') };

    const { error } = await supabase
      .from('live_session_participants')
      .insert({
        session_id: activeSession.id,
        student_id: user.id
      });

    if (error && error.code !== '23505') { // Ignore duplicate key error
      return { error };
    }
    
    await fetchActiveSession();
    return { error: null };
  };

  // Leave session (student)
  const leaveSession = async () => {
    if (!activeSession || !user) return { error: new Error('No active session') };

    const { error } = await supabase
      .from('live_session_participants')
      .delete()
      .eq('session_id', activeSession.id)
      .eq('student_id', user.id);

    if (error) return { error };
    await fetchActiveSession();
    return { error: null };
  };

  // Update audio state (teacher only)
  const updateAudioState = async (audioState: LiveSession['audio_state']) => {
    if (!activeSession) return { error: new Error('No active session') };

    const { error } = await supabase
      .from('live_sessions')
      .update({ audio_state: audioState })
      .eq('id', activeSession.id);

    if (error) return { error };
    return { error: null };
  };

  // Update current section (teacher only)
  const updateSection = async (sectionNumber: number) => {
    if (!activeSession) return { error: new Error('No active session') };

    const { error } = await supabase
      .from('live_sessions')
      .update({ current_section: sectionNumber })
      .eq('id', activeSession.id);

    if (error) return { error };
    return { error: null };
  };

  return {
    activeSession,
    participants,
    loading,
    isTeacher,
    startSession,
    endSession,
    joinSession,
    leaveSession,
    updateAudioState,
    updateSection,
    refetch: fetchActiveSession
  };
}

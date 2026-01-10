import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { 
  Consultancy, 
  Classroom, 
  ClassroomMembership, 
  ClassroomPost, 
  Assignment,
  AssignmentSubmission 
} from '@/types/classroom';

export function useConsultancy() {
  const { user, role } = useAuth();
  const [consultancy, setConsultancy] = useState<Consultancy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || role !== 'consultancy_owner') {
      setLoading(false);
      return;
    }

    const fetchConsultancy = async () => {
      const { data, error } = await supabase
        .from('consultancies')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setConsultancy(data);
      }
      setLoading(false);
    };

    fetchConsultancy();
  }, [user, role]);

  const createConsultancy = async (name: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('consultancies')
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (!error && data) {
      setConsultancy(data);
    }
    return { data, error };
  };

  return { consultancy, loading, createConsultancy };
}

export function useClassrooms() {
  const { user, role } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClassrooms = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('classrooms')
      .select('*, consultancy:consultancies(*)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClassrooms(data as Classroom[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClassrooms();
  }, [user]);

  const createClassroom = async (name: string, description: string, consultancyId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('classrooms')
      .insert({
        name,
        description,
        consultancy_id: consultancyId,
        teacher_id: user.id
      })
      .select()
      .single();

    if (!error) {
      fetchClassrooms();
    }
    return { data, error };
  };

  const deleteClassroom = async (classroomId: string) => {
    const { error } = await supabase
      .from('classrooms')
      .delete()
      .eq('id', classroomId);

    if (!error) {
      fetchClassrooms();
    }
    return { error };
  };

  return { classrooms, loading, createClassroom, deleteClassroom, refetch: fetchClassrooms };
}

export function useClassroomDetail(classroomId: string | undefined) {
  const { user } = useAuth();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [members, setMembers] = useState<ClassroomMembership[]>([]);
  const [posts, setPosts] = useState<ClassroomPost[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    if (!classroomId || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [classroomRes, membersRes, postsRes, assignmentsRes] = await Promise.all([
      supabase.from('classrooms').select('*').eq('id', classroomId).single(),
      supabase.from('classroom_memberships').select('*').eq('classroom_id', classroomId),
      supabase.from('classroom_posts').select('*').eq('classroom_id', classroomId).order('created_at', { ascending: false }),
      supabase.from('assignments').select('*').eq('classroom_id', classroomId).order('created_at', { ascending: false })
    ]);

    if (!classroomRes.error) setClassroom(classroomRes.data);
    
    // Fetch profile data separately for members
    if (!membersRes.error && membersRes.data) {
      const memberIds = membersRes.data.map(m => m.student_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', memberIds);
      
      const membersWithProfiles = membersRes.data.map(member => ({
        ...member,
        profile: profiles?.find(p => p.user_id === member.student_id) || null
      }));
      setMembers(membersWithProfiles as ClassroomMembership[]);
    }
    
    if (!postsRes.error) setPosts(postsRes.data as ClassroomPost[]);
    if (!assignmentsRes.error) setAssignments(assignmentsRes.data as Assignment[]);

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [classroomId, user]);

  const addStudent = async (studentEmail: string) => {
    // First find the student by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', studentEmail)
      .single();

    if (profileError || !profile) {
      return { error: new Error('Student not found with that email') };
    }

    const { error } = await supabase
      .from('classroom_memberships')
      .insert({
        classroom_id: classroomId,
        student_id: profile.user_id
      });

    if (!error) {
      fetchAll();
    }
    return { error };
  };

  const removeStudent = async (membershipId: string) => {
    const { error } = await supabase
      .from('classroom_memberships')
      .delete()
      .eq('id', membershipId);

    if (!error) {
      fetchAll();
    }
    return { error };
  };

  const createPost = async (title: string, content: string, postType: 'resource' | 'announcement' | 'question') => {
    if (!user || !classroomId) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('classroom_posts')
      .insert({
        classroom_id: classroomId,
        teacher_id: user.id,
        title,
        content,
        post_type: postType
      });

    if (!error) {
      fetchAll();
    }
    return { error };
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase
      .from('classroom_posts')
      .delete()
      .eq('id', postId);

    if (!error) {
      fetchAll();
    }
    return { error };
  };

  const createAssignment = async (
    title: string,
    description: string,
    testType: 'listening' | 'reading',
    bookId: string,
    testId: string,
    dueDate?: string
  ) => {
    if (!user || !classroomId) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('assignments')
      .insert({
        classroom_id: classroomId,
        teacher_id: user.id,
        title,
        description,
        test_type: testType,
        book_id: bookId,
        test_id: testId,
        due_date: dueDate || null
      });

    if (!error) {
      fetchAll();
    }
    return { error };
  };

  const deleteAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (!error) {
      fetchAll();
    }
    return { error };
  };

  const isTeacher = classroom?.teacher_id === user?.id;

  return {
    classroom,
    members,
    posts,
    assignments,
    loading,
    isTeacher,
    addStudent,
    removeStudent,
    createPost,
    deletePost,
    createAssignment,
    deleteAssignment,
    refetch: fetchAll
  };
}

export function useStudentClassrooms() {
  const { user, role } = useAuth();
  const [memberships, setMemberships] = useState<ClassroomMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemberships = async () => {
    if (!user || role !== 'student') {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('classroom_memberships')
      .select('*, classroom:classrooms(*)')
      .eq('student_id', user.id);

    if (!error && data) {
      setMemberships(data as ClassroomMembership[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMemberships();
  }, [user, role]);

  const joinByCode = async (inviteCode: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Find classroom by invite code
    const { data: classroom, error: findError } = await supabase
      .from('classrooms')
      .select('id')
      .eq('invite_code', inviteCode.toLowerCase().trim())
      .single();

    if (findError || !classroom) {
      return { error: new Error('Invalid invite code') };
    }

    const { error } = await supabase
      .from('classroom_memberships')
      .insert({
        classroom_id: classroom.id,
        student_id: user.id
      });

    if (!error) {
      fetchMemberships();
    }
    return { error };
  };

  return { memberships, loading, joinByCode, refetch: fetchMemberships };
}

export function useAssignmentSubmissions(assignmentId: string | undefined) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assignmentId || !user) {
      setLoading(false);
      return;
    }

    const fetchSubmissions = async () => {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*, test_result:test_results(band_score, correct_count, total_questions)')
        .eq('assignment_id', assignmentId);

      if (!error && data) {
        setSubmissions(data as AssignmentSubmission[]);
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, [assignmentId, user]);

  return { submissions, loading };
}

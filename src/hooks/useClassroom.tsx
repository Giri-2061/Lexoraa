import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { 
  Consultancy, 
  Classroom, 
  ClassroomMembership, 
  ClassroomPost, 
  Assignment,
  AssignmentSubmission,
  PostComment
} from '@/types/classroom';

export function useConsultancy() {
  const { user, role } = useAuth();
  const [consultancy, setConsultancy] = useState<Consultancy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (role !== 'consultancy_owner' && role !== 'super_admin')) {
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

  const fetchAll = useCallback(async () => {
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
    
    // Fetch comments for posts
    if (!postsRes.error && postsRes.data) {
      const postIds = postsRes.data.map(p => p.id);
      let allComments: any[] = [];
      if (postIds.length > 0) {
        const { data: comments } = await supabase
          .from('post_comments')
          .select('*')
          .in('post_id', postIds)
          .order('created_at', { ascending: true });
        
        if (comments) {
          // Fetch profiles for comment authors
          const commentUserIds = [...new Set(comments.map(c => c.user_id))];
          const { data: commentProfiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', commentUserIds);
          
          allComments = comments.map(c => ({
            ...c,
            profile: commentProfiles?.find(p => p.user_id === c.user_id) || null
          }));
        }
      }

      const postsWithComments = postsRes.data.map(post => ({
        ...post,
        comments: allComments.filter(c => c.post_id === post.id),
        comment_count: allComments.filter(c => c.post_id === post.id).length
      }));
      setPosts(postsWithComments as ClassroomPost[]);
    }
    
    // Fetch submissions for assignments
    if (!assignmentsRes.error && assignmentsRes.data) {
      const assignmentIds = assignmentsRes.data.map(a => a.id);
      let allSubmissions: any[] = [];
      if (assignmentIds.length > 0) {
        const { data: subs } = await supabase
          .from('assignment_submissions')
          .select('*, test_result:test_results(band_score, correct_count, total_questions)')
          .in('assignment_id', assignmentIds);
        
        if (subs) {
          const subUserIds = [...new Set(subs.map(s => s.student_id))];
          const { data: subProfiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', subUserIds);
          
          allSubmissions = subs.map(s => ({
            ...s,
            profile: subProfiles?.find(p => p.user_id === s.student_id) || null
          }));
        }
      }

      const assignmentsWithSubs = assignmentsRes.data.map(a => ({
        ...a,
        submissions: allSubmissions.filter(s => s.assignment_id === a.id),
        submission_count: allSubmissions.filter(s => s.assignment_id === a.id).length
      }));
      setAssignments(assignmentsWithSubs as Assignment[]);
    }

    setLoading(false);
  }, [classroomId, user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

  // ── Post Comments ──────────────────────────────────────────────────
  const addComment = async (postId: string, content: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: user.id, content });
    if (!error) fetchAll();
    return { error };
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId);
    if (!error) fetchAll();
    return { error };
  };

  // ── Assignment Submissions ─────────────────────────────────────────
  const submitAssignment = async (assignmentId: string, testResultId?: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    // Upsert: if the student already has a pending row, update it
    const { data: existing } = await supabase
      .from('assignment_submissions')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          status: 'submitted',
          test_result_id: testResultId || null,
          submitted_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      if (!error) fetchAll();
      return { error };
    }

    const { error } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: user.id,
        status: testResultId ? 'submitted' : 'pending',
        test_result_id: testResultId || null,
        submitted_at: testResultId ? new Date().toISOString() : null
      });
    if (!error) fetchAll();
    return { error };
  };

  const gradeSubmission = async (submissionId: string, score: number, comment?: string) => {
    const { error } = await supabase
      .from('assignment_submissions')
      .update({
        status: 'graded',
        graded_score: score,
        teacher_comment: comment || null
      })
      .eq('id', submissionId);
    if (!error) fetchAll();
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
    addComment,
    deleteComment,
    submitAssignment,
    gradeSubmission,
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

    if (error) {
      // Handle the student limit trigger error
      if (error.message?.includes('Student limit reached')) {
        return { error: new Error('This consultancy has reached its student limit. Please ask the owner to upgrade their plan.') };
      }
      return { error };
    }

    fetchMemberships();
    return { error: null };
  };

  const enrollStudentByCode = async (classCode: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const code = classCode.toLowerCase().trim();
    if (!code) return { error: new Error('Please enter a class code') };

    // Find the classroom by invite_code
    const { data: classroom, error: findError } = await supabase
      .from('classrooms')
      .select('id, name')
      .eq('invite_code', code)
      .single();

    if (findError || !classroom) {
      return { error: new Error('Invalid class code. Please check and try again.') };
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('classroom_memberships')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('student_id', user.id)
      .maybeSingle();

    if (existing) {
      return { error: new Error('You are already enrolled in this classroom.') };
    }

    // Attempt to insert — the DB trigger will enforce the tier limit
    const { error } = await supabase
      .from('classroom_memberships')
      .insert({
        classroom_id: classroom.id,
        student_id: user.id
      });

    if (error) {
      if (error.message?.includes('Student limit reached')) {
        return { error: new Error('This consultancy has reached its student limit. Please ask the owner to upgrade their plan.') };
      }
      return { error };
    }

    fetchMemberships();
    return { error: null, classroomName: classroom.name };
  };

  return { memberships, loading, joinByCode, enrollStudentByCode, refetch: fetchMemberships };
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

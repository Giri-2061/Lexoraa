export type ConsultancyTier = 'basic' | 'professional' | 'enterprise';

export interface Consultancy {
  id: string;
  name: string;
  owner_id: string;
  tier: ConsultancyTier;
  created_at: string;
  updated_at: string;
}

export interface Classroom {
  id: string;
  name: string;
  description: string | null;
  consultancy_id: string;
  teacher_id: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
  consultancy?: Consultancy;
}

export interface ClassroomMembership {
  id: string;
  classroom_id: string;
  student_id: string;
  joined_at: string;
  classroom?: Classroom;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface ClassroomPost {
  id: string;
  classroom_id: string;
  teacher_id: string;
  title: string;
  content: string | null;
  post_type: 'resource' | 'announcement' | 'question';
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  comments?: PostComment[];
  comment_count?: number;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface Assignment {
  id: string;
  classroom_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  test_type: 'listening' | 'reading';
  book_id: string;
  test_id: string;
  section_ids: string[] | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  submissions?: AssignmentSubmission[];
  submission_count?: number;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  test_result_id: string | null;
  status: 'pending' | 'submitted' | 'graded';
  submitted_at: string | null;
  graded_score: number | null;
  teacher_comment: string | null;
  created_at: string;
  assignment?: Assignment;
  test_result?: {
    band_score: number;
    correct_count: number;
    total_questions: number;
  };
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface TestReviewRequest {
  id: string;
  classroom_id: string;
  student_id: string;
  test_result_id: string;
  status: 'pending' | 'graded';
  teacher_score: number | null;
  teacher_comment: string | null;
  teacher_criteria?: {
    taskAchievement?: number | null;
    coherenceCohesion?: number | null;
    lexicalResource?: number | null;
    grammarAccuracy?: number | null;
  } | null;
  requested_at: string;
  graded_at: string | null;
  created_at: string;
  test_result?: {
    id: string;
    test_type: string;
    test_id: string;
    band_score: number;
    created_at: string;
    answers?: unknown;
  };
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

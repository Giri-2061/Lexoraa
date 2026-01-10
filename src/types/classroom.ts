export interface Consultancy {
  id: string;
  name: string;
  owner_id: string;
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
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  test_result_id: string | null;
  status: 'pending' | 'submitted' | 'graded';
  submitted_at: string | null;
  created_at: string;
  assignment?: Assignment;
  test_result?: {
    band_score: number;
    correct_count: number;
    total_questions: number;
  };
}

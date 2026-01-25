# LoungeLearning - Complete Technical Documentation

## 📋 System Overview

**LoungeLearning** is a comprehensive IELTS preparation platform built with modern web technologies. It provides students with full-featured mock tests for all four IELTS sections (Listening, Reading, Writing, Speaking) with AI-powered evaluation capabilities. The system includes authentication, classroom management, and personalized learning features.

---

## 🏗️ System Architecture

### Technology Stack

#### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.19
- **Styling**: TailwindCSS 3.4.17 with custom animations
- **UI Components**: Radix UI primitives (shadcn/ui)
- **Routing**: React Router DOM 6.30.1
- **State Management**: React Context API + Custom Hooks
- **Animations**: Framer Motion 10.12.16

#### Backend & Infrastructure
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Serverless Functions**: Supabase Edge Functions (Deno runtime)
- **Storage**: Supabase Storage (for user uploads)
- **API Client**: Supabase JS v2.89.0

#### AI Services
- **Writing/Speaking Evaluation**: Groq API (llama-3.3-70b-versatile)
- **Speech-to-Text**: Groq Whisper-large-v3
- **Alternative AI**: Google Gemini (optional, free tier)

---

## 🔐 Authentication System

### Overview
The authentication system is built on **Supabase Auth**, providing secure, production-ready user management with email verification, password recovery, and role-based access control.

### Authentication Flow

#### 1. **Sign Up Process**
```
User Registration → Email Verification Required → Account Activation
```

**Technical Implementation:**
- Location: `src/pages/Auth.tsx` + `src/hooks/useAuth.tsx`
- Method: `supabase.auth.signUp()`
- Process:
  1. User submits: email, password, full name, role (student/teacher)
  2. System creates auth user in `auth.users` table
  3. User profile created in `profiles` table (via database trigger)
  4. Role assigned in `user_roles` table
  5. Verification email sent via Supabase email service
  6. Email contains magic link: `{SITE_URL}/auth/verified`
  7. User clicks link → `detectSessionInUrl` validates token
  8. Account activated, user redirected to dashboard

**Database Tables:**
```sql
auth.users (Supabase managed)
├── id (UUID, primary key)
├── email (unique, indexed)
├── encrypted_password
├── email_confirmed_at
└── raw_user_meta_data (stores full_name)

public.profiles
├── user_id (FK to auth.users)
├── full_name
├── email
├── target_score (default: 7.0)
└── created_at

public.user_roles
├── user_id (FK to auth.users)
├── role (student | consultancy_owner | super_admin)
└── created_at
```

#### 2. **Sign In Process**
```
Credentials → Session Token → Auto-Refresh → Persistent Login
```

**Technical Implementation:**
- Method: `supabase.auth.signInWithPassword()`
- Session Storage: `localStorage` (configurable)
- Token Refresh: Automatic via `autoRefreshToken: true`
- Session Persistence: Enabled by default

**Configuration** (`src/integrations/supabase/client.ts`):
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
```

#### 3. **Password Recovery**
```
Forgot Password → Reset Email → Token Validation → New Password
```

**Implementation Flow:**
1. User requests reset at `/forgot-password`
2. System calls: `supabase.auth.resetPasswordForEmail(email)`
3. Email sent with recovery link (1-hour expiry)
4. User clicks link → redirected to `/reset-password?token=...`
5. Token extracted from URL hash
6. New password submitted via: `supabase.auth.updateUser({ password })`

#### 4. **Session Management**

**Auth Context Provider** (`src/hooks/useAuth.tsx`):
```typescript
- Listens to auth state changes via onAuthStateChange()
- Automatically updates user/session state
- Fetches user role from user_roles table
- Provides: user, session, loading, role, signUp, signIn, signOut
```

**Auth State Listener:**
```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchUserRole(session.user.id);
    }
  );
  return () => subscription.unsubscribe();
}, []);
```

### Row Level Security (RLS)

All database tables use PostgreSQL RLS policies:

**Example: Profiles Table**
```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);
```

**Role-Based Access:**
```sql
-- Teachers can view all student data
CREATE POLICY "Teachers can view all"
  ON table_name FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND role IN ('consultancy_owner', 'super_admin')
    )
  );
```

---

## 📊 Database Architecture

### Connection & Access

**Database Client Initialization:**
```typescript
// Location: src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
```

**Environment Variables:**
```
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi... (anon key)
```

### Database Schema

#### Core Tables

**1. profiles** - User information
```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  full_name TEXT,
  email TEXT UNIQUE,
  target_score NUMERIC DEFAULT 7.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**2. user_roles** - Role management
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  role TEXT CHECK (role IN ('student', 'consultancy_owner', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**3. test_results** - Test completion tracking
```sql
CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  test_id TEXT NOT NULL,
  test_type TEXT CHECK (test_type IN ('listening', 'reading', 'writing', 'speaking')),
  correct_count INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  band_score DECIMAL(2,1) DEFAULT 0,
  duration_minutes INTEGER,
  answers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**4. writing_evaluations** - AI evaluation results
```sql
CREATE TABLE writing_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  task_number INT CHECK (task_number IN (1, 2)),
  essay_text TEXT NOT NULL,
  task_achievement_score DECIMAL(2,1),
  coherence_cohesion_score DECIMAL(2,1),
  lexical_resource_score DECIMAL(2,1),
  grammar_score DECIMAL(2,1),
  overall_band_score DECIMAL(2,1),
  feedback JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**5. Classroom System Tables**
```sql
-- Consultancies (owned by teachers)
CREATE TABLE consultancies (
  id UUID PRIMARY KEY,
  name TEXT,
  owner_id UUID REFERENCES auth.users
);

-- Classrooms (belong to consultancies)
CREATE TABLE classrooms (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  consultancy_id UUID REFERENCES consultancies,
  teacher_id UUID REFERENCES auth.users
);

-- Student memberships
CREATE TABLE classroom_memberships (
  id UUID PRIMARY KEY,
  classroom_id UUID REFERENCES classrooms,
  student_id UUID REFERENCES auth.users
);

-- Assignments
CREATE TABLE assignments (
  id UUID PRIMARY KEY,
  classroom_id UUID REFERENCES classrooms,
  title TEXT,
  description TEXT,
  test_type TEXT,
  due_date TIMESTAMPTZ
);

-- Assignment submissions
CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY,
  assignment_id UUID REFERENCES assignments,
  student_id UUID REFERENCES auth.users,
  submission_data JSONB,
  submitted_at TIMESTAMPTZ
);
```

### Database Access Patterns

**Query Example (React Component):**
```typescript
// Fetch user's test history
const { data, error } = await supabase
  .from('test_results')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(10);
```

**Insert with RLS:**
```typescript
// Save test result (RLS ensures user_id matches auth.uid())
const { error } = await supabase
  .from('test_results')
  .insert({
    user_id: user.id,
    test_id: 'book15-test1',
    test_type: 'reading',
    correct_count: 32,
    total_questions: 40,
    band_score: 7.5
  });
```

---

## 📝 Writing Test System

### Test Flow
```
Load Question → User Writes → Submit → AI Evaluation → Display Results
```

### Technical Implementation

#### Frontend Component
- **Location**: `src/pages/WritingTest.tsx`
- **Test Structure**:
  - Task 1: 20 minutes, 150 words minimum (describe graph/chart)
  - Task 2: 40 minutes, 250 words minimum (essay)
  - Total Duration: 60 minutes with countdown timer

**Features:**
- Real-time word counter
- Draft auto-save to localStorage
- Image upload option (handwritten answers)
- Simultaneous evaluation of both tasks

#### Evaluation Process

**Client-Side (`src/utils/writingEvaluation.ts`):**
```typescript
1. Collect essay text and metadata
2. Convert uploaded images to base64 (if any)
3. Make HTTP POST to Supabase Edge Function
4. Display evaluation results
```

**Server-Side Edge Function** (`supabase/functions/evaluate-writing/index.ts`):

**Step 1: Authentication**
```typescript
const authHeader = req.headers.get('Authorization');
const { data: { user } } = await supabaseClient.auth.getUser();
if (!user) throw new Error('Unauthorized');
```

**Step 2: Strict Examiner System Prompt**
```typescript
const systemPrompt = `You are a Senior IELTS Examiner...

HARD CRITERIA CEILINGS:
- Task 1: No overview = Max 5.0
- Task 2: Partial prompt response = Max 5.0
- Off-topic essay = Max 4.0
- No paragraphing = Max 5.0
- Grammar/lexical errors = penalties apply

Return JSON with scores for:
- taskAchievement (score, feedback, ceilingReached, reason)
- coherenceCohesion
- lexicalResource
- grammarAccuracy
- overallBand
- examinerNotes
- wordCount
`;
```

**Step 3: AI API Call (Groq)**
```typescript
const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: essayText }
    ],
    temperature: 0.1, // Low temperature for consistent grading
    max_tokens: 2000
  })
});
```

**Step 4: Database Storage**
```typescript
await supabaseClient
  .from('writing_evaluations')
  .insert({
    user_id: user.id,
    test_id: testId,
    task_number: taskNumber,
    essay_text: essayText,
    evaluation: evaluationJson
  });
```

**Response Format:**
```json
{
  "success": true,
  "evaluation": {
    "taskAchievement": {
      "score": 6.5,
      "feedback": "The response addresses...",
      "ceilingReached": false
    },
    "coherenceCohesion": { "score": 7.0, "feedback": "..." },
    "lexicalResource": { "score": 6.5, "feedback": "..." },
    "grammarAccuracy": { "score": 6.0, "feedback": "..." },
    "overallBand": 6.5,
    "wordCount": 267,
    "examinerNotes": "Good structure but..."
  }
}
```

### Band Score Calculation
```
Overall Band = (Task Achievement + Coherence + Lexical + Grammar) / 4
Rounded to nearest 0.5
```

---

## 🎤 Speaking Test System

### Test Structure
- **Part 1**: Introduction & Interview (4-5 minutes)
- **Part 2**: Cue Card (3-4 minutes, 1 min preparation)
- **Part 3**: Discussion (4-5 minutes)

### AI Examiner Mode

#### Frontend Component
- **Location**: `src/pages/SpeakingTestAIExaminer.tsx`

**Features:**
- Web Speech API for recording
- Audio playback for each part
- Real-time recording status
- Multiple recordings per part

**Recording Implementation:**
```typescript
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus'
});

mediaRecorder.ondataavailable = (e) => {
  audioChunks.push(e.data);
};

mediaRecorder.onstop = () => {
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64 = reader.result.split(',')[1];
    // Store for evaluation
  };
  reader.readAsDataURL(audioBlob);
};
```

#### Backend Evaluation (`supabase/functions/evaluate-speaking/index.ts`)

**Step 1: Authentication**
```typescript
const { data: { user } } = await supabaseClient.auth.getUser();
if (!user) throw new Error('Invalid authentication');
```

**Step 2: Audio Transcription (Groq Whisper)**
```typescript
for (const recording of recordings) {
  const audioBuffer = Uint8Array.from(
    atob(recording.audioBase64), 
    c => c.charCodeAt(0)
  );
  
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer]), 'audio.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'en');
  
  const whisperRes = await fetch(
    'https://api.groq.com/openai/v1/audio/transcriptions',
    { method: 'POST', body: formData }
  );
  
  const data = await whisperRes.json();
  transcripts[`part${recording.part}`] = data.text;
}
```

**Step 3: IELTS Band Descriptor System**
```typescript
const BAND_DESCRIPTORS = `
FLUENCY & COHERENCE:
- Band 9: Rare repetition. Fully appropriate cohesion.
- Band 7: Speaks at length without effort.
- Band 5: Over-uses connectives. Slow speech.

LEXICAL RESOURCE:
- Band 9: Full flexibility. Natural idioms.
- Band 7: Uses idiomatic language.
- Band 5: Limited vocabulary.

GRAMMATICAL RANGE:
- Band 9: Consistently accurate.
- Band 7: Frequently error-free complex sentences.
- Band 5: Limited complex structures.

PRONUNCIATION:
- Focus: Clarity, intelligibility, word stress.
- NO accent penalty for South Asian speakers.
`;
```

**Step 4: AI Evaluation (Groq LLM)**
```typescript
const evaluationPrompt = `
Transcripts:
Part 1: ${transcripts.part1}
Part 2: ${transcripts.part2}
Part 3: ${transcripts.part3}

Evaluate strictly using IELTS descriptors.
Return JSON:
{
  "fluencyCohesion": { "score": number, "feedback": string },
  "lexicalResource": { "score": number, "feedback": string },
  "grammarRange": { "score": number, "feedback": string },
  "pronunciation": { "score": number, "feedback": string },
  "overallBand": number,
  "strengths": [...],
  "improvements": [...]
}
`;

const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: BAND_DESCRIPTORS },
      { role: 'user', content: evaluationPrompt }
    ],
    temperature: 0.1
  })
});
```

**Step 5: Result Storage**
```typescript
await supabaseClient
  .from('speaking_evaluations')
  .insert({
    user_id: user.id,
    test_id: testId,
    transcripts: transcripts,
    evaluation: evaluationJson,
    total_duration: totalDuration
  });
```

---

## 📖 Reading Test System

### Test Flow
```
Load Passage → Display Questions → User Answers → Submit → Score → Band
```

### Implementation

#### Frontend Component
- **Location**: `src/pages/ReadingTest.tsx`
- **Duration**: 60 minutes
- **Structure**: 3 passages, ~13-14 questions each (40 total)

**Question Types Supported:**
- Multiple choice (single select)
- Multiple choice (multi-select)
- True/False/Not Given
- Short answer
- Sentence completion
- Matching headings

**Answer Handling:**
```typescript
const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

// For multiple choice
const handleAnswerChange = (questionId: string, value: string) => {
  setAnswers(prev => ({ ...prev, [questionId]: value }));
};

// For multi-select
const handleMultiSelect = (questionId: string, option: string) => {
  setAnswers(prev => {
    const current = (prev[questionId] as string[]) || [];
    if (current.includes(option)) {
      return { ...prev, [questionId]: current.filter(o => o !== option) };
    }
    return { ...prev, [questionId]: [...current, option] };
  });
};
```

#### Scoring Algorithm

**Band Calculation** (from official IELTS conversion table):
```typescript
const calculateBand = (correctCount: number): number => {
  if (correctCount >= 39) return 9.0;
  if (correctCount >= 37) return 8.5;
  if (correctCount >= 35) return 8.0;
  if (correctCount >= 32) return 7.5;
  if (correctCount >= 30) return 7.0;
  if (correctCount >= 26) return 6.5;
  if (correctCount >= 23) return 6.0;
  if (correctCount >= 18) return 5.5;
  if (correctCount >= 16) return 5.0;
  if (correctCount >= 13) return 4.5;
  if (correctCount >= 10) return 4.0;
  // ... continues down to band 1
};
```

**Answer Validation:**
```typescript
const checkAnswer = (userAnswer: string | string[], correctAnswer: string): boolean => {
  if (Array.isArray(userAnswer)) {
    // Multi-select: all must match
    const correctOptions = correctAnswer.split(',').map(s => s.trim());
    return userAnswer.length === correctOptions.length &&
           userAnswer.every(ans => correctOptions.includes(ans));
  }
  
  // Single answer: case-insensitive comparison
  return userAnswer.toLowerCase().trim() === 
         correctAnswer.toLowerCase().trim();
};
```

#### Database Storage
```typescript
// Save completed test
await supabase.from('test_results').insert({
  user_id: user.id,
  test_id: testId,
  test_type: 'reading',
  correct_count: correctCount,
  total_questions: totalQuestions,
  band_score: calculateBand(correctCount),
  duration_minutes: durationMinutes,
  answers: answers // JSONB storage
});
```

---

## 🎧 Listening Test System

### Test Flow
```
Play Audio → User Answers → Submit → Score → Band
```

### Implementation

#### Frontend Component
- **Location**: `src/pages/ListeningTest.tsx`
- **Duration**: 30 minutes (recording) + 10 minutes (transfer time)
- **Structure**: 4 sections, 10 questions each (40 total)

**Audio Playback Integration:**
```typescript
const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

const playAudio = (audioUrl: string, sectionNumber: number) => {
  const audio = new Audio(audioUrl);
  audio.play();
  setAudioPlaying({ ...audioPlaying, [sectionNumber]: true });
  
  audio.onended = () => {
    setAudioPlaying({ ...audioPlaying, [sectionNumber]: false });
  };
  
  setAudioElement(audio);
};
```

**Question Format:**
```json
{
  "testId": "book15-test1",
  "title": "IELTS Listening Test 1",
  "sections": [
    {
      "sectionNumber": 1,
      "audioUrl": "/questions/audio/book15-test1-section1.mp3",
      "questions": [
        {
          "id": "1",
          "type": "form-completion",
          "question": "Name:",
          "correctAnswer": "Sarah",
          "answerLength": "ONE WORD"
        }
      ]
    }
  ]
}
```

#### Scoring System
- **Same band calculation as Reading** (40 questions → band 1-9)
- Answers normalized (case-insensitive, trimmed)
- Spelling variations handled

---

## 🏫 Classroom Management System

### Architecture

**Hierarchy:**
```
Consultancy (Teacher Account)
  └── Classrooms
      ├── Students (Members)
      ├── Posts (Announcements)
      └── Assignments
          └── Submissions
```

### Implementation

#### Custom Hook (`src/hooks/useClassroom.tsx`)

**1. Consultancy Management:**
```typescript
export function useConsultancy() {
  const { user, role } = useAuth();
  const [consultancy, setConsultancy] = useState<Consultancy | null>(null);
  
  const fetchConsultancy = async () => {
    const { data } = await supabase
      .from('consultancies')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    
    setConsultancy(data);
  };
  
  const createConsultancy = async (name: string) => {
    return await supabase
      .from('consultancies')
      .insert({ name, owner_id: user.id });
  };
  
  return { consultancy, createConsultancy };
}
```

**2. Classroom Operations:**
```typescript
export function useClassrooms() {
  const fetchClassrooms = async () => {
    const { data } = await supabase
      .from('classrooms')
      .select('*, consultancy:consultancies(*)')
      .order('created_at', { ascending: false });
    
    setClassrooms(data);
  };
  
  const createClassroom = async (name, description, consultancyId) => {
    await supabase.from('classrooms').insert({
      name,
      description,
      consultancy_id: consultancyId,
      teacher_id: user.id
    });
  };
  
  return { classrooms, createClassroom, deleteClassroom };
}
```

**3. Student Management:**
```typescript
const addStudent = async (studentEmail: string) => {
  // Find student by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', studentEmail)
    .single();
  
  // Add to classroom
  await supabase
    .from('classroom_memberships')
    .insert({
      classroom_id: classroomId,
      student_id: profile.user_id
    });
};
```

**4. Assignment System:**
```typescript
const createAssignment = async (assignmentData) => {
  return await supabase
    .from('assignments')
    .insert({
      classroom_id: classroomId,
      title: assignmentData.title,
      description: assignmentData.description,
      test_type: assignmentData.test_type,
      due_date: assignmentData.due_date
    });
};

const submitAssignment = async (assignmentId, submissionData) => {
  return await supabase
    .from('assignment_submissions')
    .insert({
      assignment_id: assignmentId,
      student_id: user.id,
      submission_data: submissionData,
      submitted_at: new Date()
    });
};
```

---

## ⏱️ Test Session Management

### Custom Hook (`src/hooks/useTestSession.tsx`)

**Features:**
- Countdown timer
- Auto-submit on time expiry
- Warning at 5 minutes remaining
- Confirmation dialog on exit attempt

**Implementation:**
```typescript
export function useTestSession(durationMinutes: number, callbacks) {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [showWarning, setShowWarning] = useState(false);
  
  useEffect(() => {
    if (!started || timeLeft <= 0) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        
        // Warning at 5 minutes
        if (newTime === 300) {
          toast({ title: "5 minutes remaining!" });
        }
        
        // Auto-submit at 0
        if (newTime === 0) {
          callbacks.onAutoSubmit?.();
        }
        
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [started, timeLeft]);
  
  return { started, setStarted, timeLeft, formatTime };
}
```

---

## 🔧 Configuration & Deployment

### Environment Variables
```env
# Supabase
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...

# AI Services (Server-side only)
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza... (optional)
```

### Build & Deploy
```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Deploy to Vercel/Netlify
npm run build
# Upload dist/ folder
```

### Supabase Deployment
```bash
# Login to Supabase CLI
npx supabase login

# Link project
npx supabase link --project-ref [project-id]

# Push database migrations
npx supabase db push

# Deploy edge functions
npx supabase functions deploy evaluate-writing
npx supabase functions deploy evaluate-speaking

# Set secrets
npx supabase secrets set GROQ_API_KEY=your_key_here
```

---

## 📱 Responsive Design

### Breakpoints (TailwindCSS)
```
sm:  640px  (tablet)
md:  768px  (small desktop)
lg:  1024px (desktop)
xl:  1280px (large desktop)
2xl: 1536px (extra large)
```

### Mobile Optimizations
- Hamburger navigation menu
- Touch-friendly buttons (min 44x44px)
- Responsive typography scaling
- Optimized test layouts for small screens
- Modal dialogs adapt to viewport

---

## 🚀 Performance Optimizations

### Code Splitting
```typescript
// Lazy load routes
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const WritingTest = lazy(() => import('@/pages/WritingTest'));
```

### Data Loading
- React Query for server state caching
- localStorage for draft persistence
- Debounced autosave (1 second delay)

### Asset Optimization
- Vite automatic code splitting
- Dynamic imports for large components
- Image lazy loading
- Audio preloading disabled (loaded on demand)

---

## 🐛 Error Handling

### Global Error Boundaries
```typescript
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

### API Error Handling
```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
} catch (err) {
  toast({
    title: "Error",
    description: err.message,
    variant: "destructive"
  });
}
```

### Edge Function Error Handling
```typescript
try {
  // Function logic
} catch (error) {
  console.error('Function error:', error);
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 500, headers: corsHeaders }
  );
}
```

---

## 📊 Analytics & Monitoring

### User Progress Tracking
- Test completion rates stored in `test_results`
- Band score progression over time
- Evaluation history queryable via user_id

### Database Queries
```sql
-- User progress report
SELECT 
  test_type,
  AVG(band_score) as avg_band,
  COUNT(*) as tests_taken,
  MAX(created_at) as last_test
FROM test_results
WHERE user_id = '[user-id]'
GROUP BY test_type;
```

---

## 🔒 Security Features

### Authentication Security
- Passwords hashed with bcrypt (Supabase default)
- JWT tokens with automatic refresh
- Email verification required
- Password reset with 1-hour token expiry

### Database Security
- Row Level Security (RLS) on all tables
- Service role key stored server-side only
- CORS headers configured on edge functions
- SQL injection protection (parameterized queries)

### API Security
- Bearer token authentication
- Rate limiting via Supabase
- HTTPS only
- API keys in environment variables (never client-side)

---

## 📚 Data Flow Summary

### Writing Test Flow
```
User writes essay
  → Submit button clicked
  → POST /functions/v1/evaluate-writing
  → Authenticate user (JWT)
  → Call Groq API (LLM evaluation)
  → Parse JSON response
  → Store in writing_evaluations table
  → Return to client
  → Display results component
```

### Reading/Listening Test Flow
```
User answers questions
  → Submit button clicked
  → Calculate score (client-side)
  → Convert to band score
  → POST to test_results table (with RLS)
  → Display results modal
```

### Speaking Test Flow
```
Record audio (3 parts)
  → Convert to base64
  → Submit all recordings
  → POST /functions/v1/evaluate-speaking
  → Authenticate user
  → Transcribe via Whisper API
  → Evaluate via Groq LLM
  → Store transcripts + evaluation
  → Return results
  → Display detailed feedback
```

---

## 🎯 Key Technical Decisions

### Why Supabase?
- PostgreSQL with full SQL power
- Built-in authentication
- Real-time capabilities (future feature)
- Serverless functions (Deno)
- Generous free tier

### Why Groq API?
- Fast inference (100+ tokens/sec)
- Free tier available
- Llama 3.3 70B model quality
- Whisper-large-v3 for transcription

### Why React + Vite?
- Fast HMR development
- Modern build tool
- TypeScript support
- Tree-shaking & code splitting

### Why TailwindCSS?
- Utility-first approach
- Minimal CSS bundle size
- Responsive design made easy
- Consistent design system

---

## 📦 Project Structure

```
loungelearning/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn/ui primitives
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── EvaluationResult.tsx
│   ├── pages/            # Route components
│   │   ├── Auth.tsx      # Login/Signup
│   │   ├── Dashboard.tsx
│   │   ├── WritingTest.tsx
│   │   ├── ReadingTest.tsx
│   │   ├── ListeningTest.tsx
│   │   └── SpeakingTestAIExaminer.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.tsx
│   │   ├── useClassroom.tsx
│   │   └── useTestSession.tsx
│   ├── utils/            # Helper functions
│   │   ├── writingEvaluation.ts
│   │   └── loadQuestions.ts
│   ├── types/            # TypeScript definitions
│   └── integrations/
│       └── supabase/     # Supabase client & types
├── supabase/
│   ├── functions/        # Edge functions (Deno)
│   │   ├── evaluate-writing/
│   │   └── evaluate-speaking/
│   └── migrations/       # SQL schema changes
├── public/
│   ├── questions/        # Test JSON files
│   │   ├── listening/
│   │   ├── reading/
│   │   ├── writing_questions/
│   │   └── speaking_questions/
│   └── images/
└── package.json
```

---

## 🔄 State Management

### Global State (Context API)
- **AuthContext**: user, session, role, auth functions
- **ThemeContext**: dark/light mode (future)

### Local State (useState)
- Test answers
- Timer state
- Loading states
- Form inputs

### Persistent State (localStorage)
- Draft answers (auto-save)
- Remember email preference
- Theme preference

### Server State (React Query - future)
- User profile
- Test history
- Classroom data

---

## 🧪 Testing Strategy (Future Implementation)

### Unit Tests
- Utility functions (band calculation, answer validation)
- Custom hooks (useAuth, useTestSession)

### Integration Tests
- Authentication flow
- Test submission flow
- Evaluation API calls

### E2E Tests
- Complete test taking experience
- User signup to test completion

---

## 🌐 Browser Compatibility

**Supported Browsers:**
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

**Features Requiring Modern Browser:**
- Web Speech API (recording)
- localStorage
- Fetch API
- ES2020 features

---

## 📈 Scalability Considerations

### Database
- Indexed foreign keys for fast joins
- JSONB for flexible data storage
- Connection pooling via Supabase

### Edge Functions
- Stateless design (horizontal scaling)
- Cold start optimization
- Error retry logic

### Frontend
- Code splitting per route
- Lazy loading images
- CDN for static assets

---

## 🛠️ Development Workflow

```bash
# Clone repository
git clone https://github.com/yourusername/loungelearning.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev

# Open browser at http://localhost:8080
```

### Adding a New Test
```bash
# 1. Create JSON file
public/questions/reading/book16-test1.json

# 2. Format: { testId, title, sections: [...] }

# 3. Add route in App.tsx (auto-detected via :testId param)

# 4. Test locally, then commit
```

---

## 📞 Support & Maintenance

### Database Backups
- Automatic daily backups (Supabase)
- Point-in-time recovery available
- Export via pg_dump

### Monitoring
- Supabase dashboard for database metrics
- Edge function logs in Supabase console
- Error tracking via toast notifications (client-side)

### Updates
- Dependency updates: `npm outdated && npm update`
- Security patches: `npm audit fix`
- Database migrations: sequential versioned SQL files

---

**Last Updated**: January 2026  
**System Version**: 1.0.0  
**Documentation Maintained By**: LoungeLearning Development Team
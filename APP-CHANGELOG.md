# Lexora IELTS — App Changelog

> A comprehensive record of existing features and planned improvements for the Lexora IELTS Preparation Platform.

---

## ✅ Current Features (v1.0.0)

### Authentication & User Management
- **Email/Password Sign Up & Sign In** — Full registration flow with Zod validation, password visibility toggle, and "Remember Me" persistence
- **Email Verification** — Post-signup email confirmation with redirect to verified page
- **Forgot / Reset Password** — Password recovery via email link with dedicated reset form
- **Role-Based Access Control** — Three roles (`super_admin`, `consultancy_owner`, `student`) with priority-based role resolution
- **Teacher Registration Flow** — Students can request teacher (consultancy owner) access with organization/reason fields; requests go to admin for approval
- **User Profiles** — Profile with full name, email, target score, and feedback tracking fields; auto-created on signup
- **User Menu** — Dropdown showing avatar initials, name, email, role badge, and quick links
- **Auth Debug Mode** — `?reset=true` URL param clears all auth data for troubleshooting

---

### IELTS Mock Test System

#### Test Catalog & Navigation
- **Mock Tests Hub** — Landing page showing all 4 test types (Listening, Reading, Writing, Speaking) as cards with duration, question count, and completion status
- **Cambridge Book Browser** — Per-skill pages listing Cambridge Books 13–19, each with Tests 1–4 and lock/unlock state persisted in localStorage
- **Completion Tracking** — Tests marked as completed via URL params and localStorage

#### Listening Test
- **Timed Listening Test** — 30-minute timer with 4 sections, audio playback (play/pause), and section navigation
- **Multiple Question Types** — Multiple-choice, form-completion, and matching questions rendered per section
- **Auto-Scoring** — Answers checked against correct answers with IELTS band score calculation
- **Answer Review** — Show/hide correct answers after submission
- **Result Persistence** — Test results saved to database (band score, correct count, total questions, duration, answers JSON)
- **Question Bank** — 28 listening tests across Cambridge Books 13–19 with audio files

#### Reading Test
- **Timed Reading Test** — 60-minute timer with 3 sections featuring full passage text alongside questions
- **Multiple Question Types** — Multiple-choice, true/false/not-given, matching headings, and sentence completion
- **Full Passage Display** — Complete passage text rendered alongside questions with placeholder generation for missing tests
- **Auto-Scoring & Results** — Same scoring engine as listening with band calculation and result modal
- **Question Bank** — 28 reading tests across Cambridge Books 13–19

#### Writing Test
- **Timed Writing Test** — 60-minute timer with 2 tasks (Task 1: 150+ words, Task 2: 250+ words)
- **Rich Text Input** — Textarea with live word counter per task
- **Image Upload (Task 1)** — Upload charts/graphs/diagrams as base64 for Task 1 prompts
- **Draft Auto-Save** — Answers and uploaded images persisted in localStorage, restored on reload
- **AI Writing Evaluation** — Submits essays to Supabase Edge Function using Groq AI for strict IELTS examiner-calibrated scoring
- **Detailed Criterion Feedback** — Per-criterion scores and feedback for Task Achievement, Coherence & Cohesion, Lexical Resource, and Grammar; includes strengths, improvements, examiner notes, and word count
- **Vision Model for Task 1** — AI evaluates Task 1 image-based responses using a vision model
- **Evaluation History** — Past writing evaluations stored and retrievable per user/test
- **Question Bank** — Writing prompts for Cambridge Books 13–19

#### Speaking Test (Self-Practice)
- **3-Part Speaking Flow** — Full IELTS speaking simulation: Part 1 (interview), Part 2 (long turn with 1-min prep + 2-min speak), Part 3 (discussion)
- **Microphone Recording** — Browser MediaRecorder API for recording responses per question/part with permission detection
- **Timed Phases** — Configurable timers for prep time and speaking time per phase with auto-advance
- **Part 2 Note-Taking** — Textarea for cue card notes during preparation
- **AI Speaking Evaluation** — Audio sent to Edge Function using Groq Whisper (whisper-large-v3) for transcription, then LLM for IELTS criteria evaluation
- **Detailed Speaking Metrics** — Fluency analysis (WPM, filler words, speech rate, hesitation ratio), vocabulary analysis (lexical diversity, advanced vocab, idioms), grammar analysis (sentence complexity), pronunciation clarity scoring
- **Expandable Result Cards** — Criterion cards with scores, confidence %, strengths, improvements, progress bars, band range, and tabbed transcript view
- **Question Bank** — 3 speaking test sets with Part 1 topics, Part 2 cue cards, and Part 3 discussion questions

#### Speaking Test — AI Examiner Mode
- **AI Examiner with TTS** — Enhanced speaking test where an AI examiner reads questions aloud using browser text-to-speech, simulating real examiner interaction with beep sounds
- **Audio Context Management** — Handles browser autoplay policies, audio context unlocking, and beep sounds between phases

#### Test Session Management
- **Countdown Timer** — Configurable duration timer with start/pause and auto-countdown
- **Exit Confirmation** — Dialog confirming exit; resets state and navigates to mock tests hub
- **Test Header Bar** — Fixed header during tests showing title, timer, "Begin Test" / "Exit Test" buttons, and theme toggle

---

### Score Calculator
- **Raw-to-Band Converter** — Convert raw listening/reading scores (0–40) to IELTS band scores using official conversion tables
- **Overall Band Calculator** — Enter individual band scores for all 4 skills to calculate overall IELTS band (rounded to nearest 0.5)
- **Band Score Descriptions** — Reference table showing all band levels (3–9) with proficiency descriptions
- **Conversion Table View** — Full raw-to-band score conversion table displayed in a dialog

---

### User Dashboard
- **Progress Overview** — Cards showing tests completed, average band score, practice hours, and target score
- **Per-Skill Statistics** — Breakdown per skill (Listening, Reading, Writing, Speaking) with count completed and average score
- **Editable Target Score** — Users can set/edit their target IELTS band score, saved to profile
- **Test History** — Chronological list of all completed tests with date, type, score, and correct/total counts

---

### Classroom System (LMS)

#### Consultancy & Classroom Management
- **Consultancy Creation** — Teachers create a consultancy (organization entity) before creating classrooms
- **Classroom CRUD** — Teachers create/delete classrooms with name and description
- **Invite Code System** — Each classroom gets a unique invite code; teachers can copy it, students join by entering it
- **Student Views** — Students see enrolled classrooms and can join new ones via invite code

#### Classroom Detail
- **Member Management** — Teachers add students by email, remove students; member list with profiles
- **Posts / Announcements** — Teachers create posts (resource, announcement, question) with title and content
- **Post Comments** — All members can comment on posts; comments show author profile
- **Assignments** — Teachers create assignments linked to specific IELTS tests (book + test + type) with due dates
- **Assignment Submissions** — Students submit assignments linked to test results; status tracking: pending → submitted → graded
- **Grading** — Teachers grade submissions with numeric score and written comment
- **Tabbed Interface** — Classroom detail organized in tabs: Posts, Assignments, Members

#### Live Classroom Sessions
- **Start Live Class** — Teachers start a live session selecting test type → book → test via a multi-step dialog
- **Realtime Session Sync** — Uses Supabase Realtime (postgres_changes) to sync session state across participants
- **Audio Playback Control** — Teacher controls shared audio playback (play/pause/seek); students receive synced audio state with section navigation
- **Participant Tracking** — Students join/leave sessions with live participant count
- **Session Lifecycle** — Start → active (with section/audio state updates) → end; status persisted in database

#### Classroom Notifications
- **Announcement Notifications** — Unread notifications fetched on login; dialog shows new announcements with "View Classroom" action; notifications marked as read on view/dismiss

---

### Premium Membership
- **Premium Request Form** — Users submit a premium membership request with reason; request history shown with status badges
- **Premium Status Check** — Real-time hook to check if current user has premium flag
- **Admin Review** — Super admins view all premium requests and approve/reject; approval sets premium flag on user profile
- **Premium Badge** — Visual gold crown badge component for premium users

---

### Super Admin Dashboard
- **Admin Panel** — Comprehensive admin dashboard at `/admin` with tabs: Overview, Teacher Requests, Premium Requests, Feedback
- **System Analytics** — Total users, teachers, students, tests (by type), classrooms, recent signups (7-day), recent tests (7-day)
- **Teacher Request Management** — View, approve (grants consultancy_owner role), or reject teacher account requests
- **Premium Request Management** — View, approve, or reject premium membership requests
- **Feedback Dashboard** — View all user feedback with stats (total count, average rating, distribution), filtering by rating, sorting, and pagination
- **Admin Nav Visibility** — Admin Panel link appears in navbar only for super_admin users with shield icon

---

### Feedback System
- **Smart Auto-Prompt** — Feedback modal auto-triggered after cumulative usage thresholds (4+ hours, 7-day-old account, or after completing a test); respects 30-day cooldown
- **Feedback Modal** — Animated modal with 1–5 star rating and optional text message with labeled ratings (Poor → Excellent)
- **Floating Feedback Button** — Persistent button to manually open feedback modal at any time
- **Session Time Tracking** — Cumulative usage time tracked via localStorage with periodic persistence (every 30s) and beforeunload handler
- **Eligibility Checks** — Server-side checks: not already submitted, not prompted/dismissed in last 30 days, sufficient activity

---

### UI/UX
- **Dark / Light Theme** — Toggle between themes with system preference detection, persisted in localStorage
- **Responsive Design** — Mobile-responsive layout with `use-mobile` hook and hamburger menu for mobile nav
- **Page Transitions** — Framer Motion `AnimatePresence` page transitions
- **Toast Notifications** — Dual toast systems: shadcn/ui Toaster + Sonner for different notification styles
- **shadcn/ui Component Library** — Full component set: Cards, Dialogs, Tabs, Badges, Dropdowns, Selects, Tables, Progress, Avatars, etc.

---

### Static / Marketing Pages
- **About Page** — Company overview with stats (10+ years, 5000+ students, 95% success rate) and global partnerships
- **Testimonials** — Student success stories section
- **Contact Page** — Contact form (name, email, phone, message), address/phone/email cards, and team profiles with social links
- **Hero Section** — Landing page hero with gradient background, CTA button, and animated decorative elements
- **Expertise Section** — 4-card grid: IELTS Preparation, Mini Library, Community Programs, Co-working Space
- **Map Section** — Embedded MapLibre/MapTiler interactive map showing office location
- **Privacy Policy & Terms** — Legal pages with dedicated layout and modal variants
- **404 Page** — Custom Not Found page for unmatched routes
- **Footer** — Site-wide footer component

---

### Backend (Supabase Edge Functions)
- **Writing Evaluation API** — Edge function using Groq AI with strict IELTS examiner prompt; handles image-based Task 1 evaluation via vision model; saves results to database; scores enforced with ceiling rules
- **Speaking Evaluation API** — Edge function: (1) transcribes audio via Whisper-large-v3, (2) evaluates transcripts via LLM with IELTS band descriptors; accent-agnostic pronunciation scoring; saves results to database

---

## 🔮 Planned Improvements & Future Features

### High Priority

#### Enhanced Test Experience
- **Full-Length Timed Mock Exams** — Combine all 4 skills into a single full-length practice test with section transitions and a unified result summary
- **Adaptive Difficulty** — Dynamically adjust question difficulty based on user performance history to focus on weak areas
- **Question Bookmarking** — Allow users to bookmark/flag difficult questions for later review
- **Detailed Answer Explanations** — Provide explanations for why each answer is correct (especially for Reading and Listening)
- **Practice by Question Type** — Let users filter and practice specific question types (e.g., only "matching headings" or only "form completion")
- **Listening Playback Controls** — Add speed controls (0.75x, 1x, 1.25x, 1.5x) for listening practice mode (not timed test mode)
- **Reading Passage Highlighting** — Allow highlighting and annotating reading passages during tests

#### AI Evaluation Enhancements
- **Writing Sample Answers** — Show model Band 9 sample answers alongside student submissions for comparison
- **Comparative Progress Reports** — AI-generated insights comparing performance across attempts ("Your coherence improved from 6.0 → 7.0 over the last 5 essays")
- **Grammar Error Highlighting** — Inline annotation of grammar and vocabulary errors in writing submissions
- **Speaking Pronunciation Feedback** — More granular phoneme-level pronunciation feedback with audio examples of correct pronunciation
- **AI Conversation Practice** — Two-way AI speaking partner for free-form conversation practice beyond structured test format
- **Writing Rewrite Suggestions** — AI suggests sentence-level rewrites with explanations for improving band score

#### Dashboard & Analytics
- **Score Trend Charts** — Visual graphs showing band score progression over time per skill
- **Strengths & Weaknesses Analysis** — AI-generated summary of user's strongest and weakest areas across all skills
- **Study Plan Generator** — Personalized study plan based on target score, current level, and available study time
- **Weekly Progress Reports** — Automated email or in-app weekly summaries of study activity and score changes
- **Predicted Band Score** — ML-based prediction of expected band score based on practice performance trends

---

### Medium Priority

#### Classroom & Collaboration
- **Video/Audio Live Sessions** — WebRTC-based video/audio calls for live classroom sessions (beyond just synced audio playback)
- **Student Progress Dashboard for Teachers** — Per-student analytics showing score trends, completion rates, and time spent
- **Bulk Assignment Creation** — Create assignments for multiple tests at once
- **Classroom Chat** — Real-time text chat within classrooms for Q&A and discussion
- **Resource Library** — Teachers upload and share study materials (PDFs, links, notes) within classrooms
- **Peer Review** — Students review each other's writing submissions with guided rubrics
- **Leaderboard** — Optional gamified leaderboard within classrooms showing top performers
- **Assignment Templates** — Save and reuse assignment configurations

#### Content & Question Bank
- **User-Generated Practice Questions** — Allow teachers to create custom questions beyond Cambridge materials
- **More Speaking Test Sets** — Expand from 3 to 20+ speaking test sets covering more topics
- **General Training Module** — Add IELTS General Training reading and writing tests (currently Academic only)
- **Vocabulary Builder** — Integrated vocabulary lists organized by IELTS topic (environment, education, technology, etc.) with flashcard practice
- **Grammar Lessons** — Structured grammar reference material with exercises targeting common IELTS errors
- **Reading Speed Trainer** — Timed reading exercises to improve reading speed and comprehension

#### Mobile & Accessibility
- **React Native Mobile App** — Native mobile app for iOS and Android (monorepo structure already in place)
- **Offline Mode** — Cache tests and allow offline practice with sync when back online
- **PWA Support** — Progressive Web App with install prompt, push notifications, and offline caching
- **Accessibility (a11y)** — WCAG 2.1 AA compliance: screen reader support, keyboard navigation, high contrast mode
- **Multi-Language UI** — Interface localization for non-English speakers (e.g., Arabic, Chinese, Spanish, Turkish)

---

### Lower Priority / Nice-to-Have

#### Gamification & Engagement
- **Achievement Badges** — Earn badges for milestones (first test, 10 tests completed, Band 7+ achieved, etc.)
- **Daily Streaks** — Track consecutive days of practice with visual streak counter
- **XP & Levels** — Experience points system for completing tests and activities
- **Daily Challenge** — One randomly selected question per day with leaderboard
- **Study Reminders** — Push/email reminders to maintain study consistency

#### Social & Community
- **Public User Profiles** — Optional public profiles showing band scores and achievements
- **Discussion Forum** — Community forum for IELTS tips, question discussions, and study groups
- **Study Buddy Matching** — Match users with similar target scores and timelines for mutual practice
- **Speaking Partner Pairing** — Match two users for live peer-to-peer speaking practice sessions

#### Payment & Monetization
- **Stripe/PayPal Integration** — Self-service premium subscription with payment processing
- **Tiered Pricing Plans** — Free, Pro, and Enterprise tiers with feature gating
- **Referral Program** — Users earn credits or free premium time for referring new users
- **Gift Subscriptions** — Allow purchasing premium access for others

#### Advanced AI Features
- **AI Tutor Chatbot** — In-app chatbot for answering IELTS strategy questions, explaining grammar rules, and providing study tips
- **Automated Essay Similarity Detection** — Flag potential plagiarism in writing submissions
- **Handwriting Recognition** — Mobile camera capture of handwritten essays with OCR for evaluation
- **Real-Time Speaking Feedback** — Live feedback while speaking (fluency meter, pace indicator) rather than post-recording evaluation
- **Custom AI Examiner Personas** — Choose between examiner styles (strict, encouraging, detailed) for different feedback tones

#### Infrastructure & DevOps
- **CI/CD Pipeline** — Automated testing, linting, and deployment on push to main branch
- **Error Monitoring** — Sentry or similar integration for real-time error tracking and alerting
- **Performance Monitoring** — Web Vitals tracking and performance dashboards
- **Database Backups** — Automated daily database backups with point-in-time recovery
- **Rate Limiting** — API rate limiting for AI evaluation endpoints to manage costs
- **Audit Logging** — Track admin actions (approvals, rejections, role changes) for accountability
- **Email Notifications** — Transactional emails for assignment due dates, evaluation completion, classroom invites

---

## 📊 Content Coverage Summary

| Skill     | Current Content                              | Goal                                  |
|-----------|----------------------------------------------|---------------------------------------|
| Listening | 28 tests (Cambridge Books 13–19 × 4 tests)  | Add Books 1–12, community-contributed |
| Reading   | 28 tests (Cambridge Books 13–19 × 4 tests)  | Add Books 1–12, General Training      |
| Writing   | 7 books of prompts (Cambridge 13–19)         | Add more prompts, General Training    |
| Speaking  | 3 test sets                                  | Expand to 20+ sets, more topic variety|

---

## 🗄️ Database Schema

| Table                        | Purpose                                                  |
|------------------------------|----------------------------------------------------------|
| `profiles`                   | User profiles (name, email, target score, premium flag)  |
| `user_roles`                 | Role assignments (super_admin, consultancy_owner, student)|
| `test_results`               | All test scores, answers, and duration                   |
| `writing_evaluations`        | AI writing evaluation results per task                   |
| `consultancies`              | Teacher organizations                                    |
| `classrooms`                 | Classroom entities with invite codes                     |
| `classroom_memberships`      | Student–classroom enrollment                             |
| `classroom_posts`            | Announcements, resources, questions                      |
| `post_comments`              | Comments on classroom posts                              |
| `assignments`                | Teacher-created assignments linked to tests              |
| `assignment_submissions`     | Student submissions with grading                         |
| `live_sessions`              | Real-time classroom sessions                             |
| `live_session_participants`  | Students in live sessions                                |
| `feedback`                   | User feedback ratings and messages                       |
| `premium_requests`           | Premium membership requests                              |
| `teacher_requests`           | Teacher account upgrade requests                         |
| `notifications`              | Classroom announcement notifications                    |

---

*Last updated: February 2026*

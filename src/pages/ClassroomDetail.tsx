import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClassroomDetail } from '@/hooks/useClassroom';
import { useLiveSession } from '@/hooks/useLiveSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  FileText, 
  ClipboardList, 
  Trash2,
  Copy,
  Check,
  Calendar,
  BookOpen,
  Headphones,
  MessageSquare,
  Link as LinkIcon,
  Send,
  CheckCircle2,
  Clock,
  Award,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ClassroomLayout from '@/components/classroom/ClassroomLayout';
import LiveSessionBanner from '@/components/classroom/LiveSessionBanner';
import StartClassDialog from '@/components/classroom/StartClassDialog';
import { supabase } from '@/integrations/supabase/client';
import { calculateAverageBand } from '@/utils/writingEvaluation';
import type { PostComment, AssignmentSubmission, TestReviewRequest } from '@/types/classroom';

const BOOKS = Array.from({ length: 7 }, (_, i) => ({ id: `book${13 + i}`, name: `Cambridge Book ${13 + i}` }));
const TESTS = ['test1', 'test2', 'test3', 'test4'];

export default function ClassroomDetail() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    classroom,
    members,
    posts,
    assignments,
    testReviewRequests,
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
    submitTestReviewRequest,
    gradeTestReviewRequest,
    refetch
  } = useClassroomDetail(classroomId);

  const {
    activeSession,
    participants,
    loading: sessionLoading,
    isTeacher: isSessionTeacher,
    startSession,
    endSession,
    joinSession,
    leaveSession,
    updateAudioState,
    updateSection
  } = useLiveSession(classroomId);

  const [copied, setCopied] = useState(false);

  if (authLoading || loading) {
    return (
      <ClassroomLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </ClassroomLayout>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!classroom) {
    return (
      <ClassroomLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Classroom not found</h2>
          <Button onClick={() => navigate('/classrooms')}>Back to Classrooms</Button>
        </div>
      </ClassroomLayout>
    );
  }

  const copyInviteCode = () => {
    navigator.clipboard.writeText(classroom.invite_code);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ClassroomLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/classrooms')} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Classrooms
            </Button>
            <h1 className="text-3xl font-bold">{classroom.name}</h1>
            {classroom.description && (
              <p className="text-muted-foreground mt-1">{classroom.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {isTeacher && !activeSession && (
              <StartClassDialog onStartClass={startSession} />
            )}
            {isTeacher && (
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg">
                <span className="text-sm text-muted-foreground">Invite Code:</span>
                <code className="font-mono font-bold text-primary">{classroom.invite_code}</code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyInviteCode}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Live Session Banner */}
        {activeSession && (
          <LiveSessionBanner
            session={activeSession}
            participants={participants}
            isTeacher={isSessionTeacher}
            onEndSession={endSession}
            onJoinSession={joinSession}
            onLeaveSession={leaveSession}
            onUpdateAudioState={updateAudioState}
            onUpdateSection={updateSection}
          />
        )}

        {/* Tabs */}
        <Tabs defaultValue="feed">
          <TabsList>
            <TabsTrigger value="feed" className="gap-2">
              <FileText className="h-4 w-4" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Assignments
            </TabsTrigger>
            {isTeacher && (
              <TabsTrigger value="submissions" className="gap-2">
                <Award className="h-4 w-4" />
                Submissions
              </TabsTrigger>
            )}
            {isTeacher && (
              <TabsTrigger value="students" className="gap-2">
                <Users className="h-4 w-4" />
                Students ({members.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="feed" className="mt-6">
            <FeedTab 
              posts={posts} 
              isTeacher={isTeacher}
              userId={user.id}
              onCreatePost={createPost}
              onDeletePost={deletePost}
              onAddComment={addComment}
              onDeleteComment={deleteComment}
            />
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <AssignmentsTab 
              assignments={assignments}
              testReviewRequests={testReviewRequests}
              members={members}
              isTeacher={isTeacher}
              userId={user.id}
              onCreateAssignment={createAssignment}
              onDeleteAssignment={deleteAssignment}
              onSubmitAssignment={submitAssignment}
              onGradeSubmission={gradeSubmission}
              onSubmitTestReviewRequest={submitTestReviewRequest}
            />
          </TabsContent>

          {isTeacher && (
            <TabsContent value="submissions" className="mt-6">
              <ReviewSubmissionsTab
                requests={testReviewRequests}
                onGrade={gradeTestReviewRequest}
              />
            </TabsContent>
          )}

          {isTeacher && (
            <TabsContent value="students" className="mt-6">
              <StudentsTab 
                members={members}
                onAddStudent={addStudent}
                onRemoveStudent={removeStudent}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ClassroomLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FEED TAB — Posts with comments
   ═══════════════════════════════════════════════════════════════════════ */

function FeedTab({ 
  posts, 
  isTeacher,
  userId,
  onCreatePost, 
  onDeletePost,
  onAddComment,
  onDeleteComment
}: { 
  posts: any[];
  isTeacher: boolean;
  userId: string;
  onCreatePost: (title: string, content: string, type: 'resource' | 'announcement' | 'question') => Promise<any>;
  onDeletePost: (id: string) => Promise<any>;
  onAddComment: (postId: string, content: string) => Promise<any>;
  onDeleteComment: (commentId: string) => Promise<any>;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'resource' | 'announcement' | 'question'>('announcement');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    const { error } = await onCreatePost(title, content, postType);
    setCreating(false);
    if (error) {
      toast.error('Failed to create post');
    } else {
      toast.success('Post created!');
      setShowDialog(false);
      setTitle('');
      setContent('');
    }
  };

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'resource': return <LinkIcon className="h-4 w-4" />;
      case 'question': return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getPostColor = (type: string) => {
    switch (type) {
      case 'resource': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'question': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      default: return 'bg-green-500/10 text-green-600 border-green-200';
    }
  };

  return (
    <div className="space-y-4">
      {isTeacher && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Post Type</Label>
                <Select value={postType} onValueChange={(v: any) => setPostType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">📢 Announcement</SelectItem>
                    <SelectItem value="resource">📎 Resource</SelectItem>
                    <SelectItem value="question">❓ Question</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Post content..." rows={4} />
              </div>
              <Button onClick={handleCreate} disabled={creating || !title.trim()} className="w-full">
                {creating ? 'Creating...' : 'Create Post'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {posts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No posts yet</p>
          </CardContent>
        </Card>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isTeacher={isTeacher}
            userId={userId}
            getPostIcon={getPostIcon}
            getPostColor={getPostColor}
            onDelete={onDeletePost}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
          />
        ))
      )}
    </div>
  );
}

function PostCard({
  post,
  isTeacher,
  userId,
  getPostIcon,
  getPostColor,
  onDelete,
  onAddComment,
  onDeleteComment
}: {
  post: any;
  isTeacher: boolean;
  userId: string;
  getPostIcon: (type: string) => React.ReactNode;
  getPostColor: (type: string) => string;
  onDelete: (id: string) => Promise<any>;
  onAddComment: (postId: string, content: string) => Promise<any>;
  onDeleteComment: (commentId: string) => Promise<any>;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    const { error } = await onAddComment(post.id, commentText.trim());
    setSubmitting(false);
    if (error) {
      toast.error('Failed to add comment');
    } else {
      setCommentText('');
    }
  };

  const comments: PostComment[] = post.comments || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${getPostColor(post.post_type)}`}>
              {getPostIcon(post.post_type)}
              <span className="capitalize">{post.post_type}</span>
            </div>
          </div>
          {isTeacher && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(post.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardTitle className="text-lg">{post.title}</CardTitle>
        <CardDescription>
          {format(new Date(post.created_at), 'MMM d, yyyy • h:mm a')}
        </CardDescription>
      </CardHeader>
      {post.content && (
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{post.content}</p>
        </CardContent>
      )}
      <CardFooter className="flex-col items-stretch gap-3 pt-0">
        <Separator />
        {/* Comment toggle */}
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageSquare className="h-4 w-4" />
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showComments && (
          <div className="space-y-3">
            {/* Existing comments */}
            {comments.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {comments.map((comment: PostComment) => (
                  <div key={comment.id} className="flex items-start gap-3 bg-muted/50 rounded-lg p-3">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                      {(comment.profile?.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.profile?.full_name || 'User'}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
                    </div>
                    {comment.user_id === userId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => onDeleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add comment */}
            <div className="flex gap-2">
              <Input
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                className="text-sm"
              />
              <Button
                size="icon"
                onClick={handleAddComment}
                disabled={!commentText.trim() || submitting}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ASSIGNMENTS TAB — Create, submit, grade
   ═══════════════════════════════════════════════════════════════════════ */

function AssignmentsTab({ 
  assignments, 
  testReviewRequests,
  members,
  isTeacher,
  userId,
  onCreateAssignment, 
  onDeleteAssignment,
  onSubmitAssignment,
  onGradeSubmission,
  onSubmitTestReviewRequest
}: { 
  assignments: any[];
  testReviewRequests: TestReviewRequest[];
  members: any[];
  isTeacher: boolean;
  userId: string;
  onCreateAssignment: (title: string, desc: string, type: 'listening' | 'reading', book: string, test: string, due?: string) => Promise<any>;
  onDeleteAssignment: (id: string) => Promise<any>;
  onSubmitAssignment: (assignmentId: string, testResultId?: string) => Promise<any>;
  onGradeSubmission: (submissionId: string, score: number, comment?: string) => Promise<any>;
  onSubmitTestReviewRequest: (testResultId: string) => Promise<any>;
}) {
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [testType, setTestType] = useState<'listening' | 'reading'>('listening');
  const [bookId, setBookId] = useState('book13');
  const [testId, setTestId] = useState('test1');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [studentResults, setStudentResults] = useState<Array<{
    id: string;
    test_type: string;
    test_id: string;
    band_score: number;
    created_at: string;
  }>>([]);
  const [selectedResultId, setSelectedResultId] = useState('');
  const [submittingReviewRequest, setSubmittingReviewRequest] = useState(false);

  useEffect(() => {
    const fetchStudentResults = async () => {
      if (isTeacher) return;
      const { data, error } = await supabase
        .from('test_results')
        .select('id, test_type, test_id, band_score, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setStudentResults(data as Array<{
          id: string;
          test_type: string;
          test_id: string;
          band_score: number;
          created_at: string;
        }>);
      }
    };

    fetchStudentResults();
  }, [isTeacher, userId]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    const { error } = await onCreateAssignment(title, description, testType, bookId, testId, dueDate || undefined);
    setCreating(false);
    if (error) {
      toast.error('Failed to create assignment');
    } else {
      toast.success('Assignment created!');
      setShowDialog(false);
      setTitle('');
      setDescription('');
    }
  };

  const startTest = (assignment: any) => {
    const testPath = assignment.test_type === 'listening' 
      ? `/test/listening/${assignment.book_id}-${assignment.test_id}`
      : `/test/reading/${assignment.book_id}-${assignment.test_id}`;
    navigate(testPath);
  };

  const myReviewRequests = testReviewRequests.filter(r => r.student_id === userId);

  const handleSubmitReviewRequest = async () => {
    if (!selectedResultId) return;
    setSubmittingReviewRequest(true);
    const { error } = await onSubmitTestReviewRequest(selectedResultId);
    setSubmittingReviewRequest(false);
    if (error) {
      toast.error(error.message || 'Failed to request review');
      return;
    }
    toast.success('Test submitted for teacher review');
    setSelectedResultId('');
  };

  return (
    <div className="space-y-4">
      {!isTeacher && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Request Teacher Review</CardTitle>
            <CardDescription>
              Submit any completed test result in this classroom to be reviewed and scored by your teacher.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Select Completed Test</Label>
              <Select value={selectedResultId} onValueChange={setSelectedResultId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a completed test result" />
                </SelectTrigger>
                <SelectContent>
                  {studentResults.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.test_type.toUpperCase()} • {r.test_id} • Band {r.band_score}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmitReviewRequest} disabled={!selectedResultId || submittingReviewRequest}>
              {submittingReviewRequest ? 'Submitting...' : 'Submit For Teacher Review'}
            </Button>

            {myReviewRequests.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Your review requests in this classroom</p>
                <div className="space-y-2">
                  {myReviewRequests.map((req) => (
                    <div key={req.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          {req.test_result?.test_type?.toUpperCase()} • {req.test_result?.test_id}
                        </span>
                        {req.status === 'graded' ? (
                          <Badge className="bg-green-500/10 text-green-600">Graded: {req.teacher_score ?? '-'}</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                      {req.teacher_comment && (
                        <p className="text-muted-foreground mt-2">Teacher: {req.teacher_comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isTeacher && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment title" />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Instructions..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Test Type</Label>
                  <Select value={testType} onValueChange={(v: any) => setTestType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="listening">Listening</SelectItem>
                      <SelectItem value="reading">Reading</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Due Date (optional)</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Book</Label>
                  <Select value={bookId} onValueChange={setBookId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOKS.map((book) => (
                        <SelectItem key={book.id} value={book.id}>{book.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Test</Label>
                  <Select value={testId} onValueChange={setTestId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TESTS.map((t) => (
                        <SelectItem key={t} value={t}>Test {t.slice(-1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={creating || !title.trim()} className="w-full">
                {creating ? 'Creating...' : 'Create Assignment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No assignments yet</p>
          </CardContent>
        </Card>
      ) : (
        assignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            members={members}
            isTeacher={isTeacher}
            userId={userId}
            onDelete={onDeleteAssignment}
            onStartTest={startTest}
            onSubmit={onSubmitAssignment}
            onGrade={onGradeSubmission}
          />
        ))
      )}
    </div>
  );
}

function AssignmentCard({
  assignment,
  members,
  isTeacher,
  userId,
  onDelete,
  onStartTest,
  onSubmit,
  onGrade
}: {
  assignment: any;
  members: any[];
  isTeacher: boolean;
  userId: string;
  onDelete: (id: string) => Promise<any>;
  onStartTest: (assignment: any) => void;
  onSubmit: (assignmentId: string, testResultId?: string) => Promise<any>;
  onGrade: (submissionId: string, score: number, comment?: string) => Promise<any>;
}) {
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [gradeDialogSub, setGradeDialogSub] = useState<AssignmentSubmission | null>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeComment, setGradeComment] = useState('');
  const [grading, setGrading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submissions: AssignmentSubmission[] = assignment.submissions || [];
  const mySubmission = submissions.find((s: AssignmentSubmission) => s.student_id === userId);
  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date();
  const submittedCount = submissions.filter((s: AssignmentSubmission) => s.status !== 'pending').length;

  const handleSubmit = async () => {
    setSubmitting(true);
    const { error } = await onSubmit(assignment.id);
    setSubmitting(false);
    if (error) {
      toast.error('Failed to mark as submitted');
    } else {
      toast.success('Assignment marked as submitted!');
    }
  };

  const handleGrade = async () => {
    if (!gradeDialogSub || !gradeScore) return;
    setGrading(true);
    const { error } = await onGrade(gradeDialogSub.id, parseFloat(gradeScore), gradeComment);
    setGrading(false);
    if (error) {
      toast.error('Failed to grade submission');
    } else {
      toast.success('Submission graded!');
      setGradeDialogSub(null);
      setGradeScore('');
      setGradeComment('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200"><CheckCircle2 className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'graded': return <Badge className="bg-green-500/10 text-green-600 border-green-200"><Award className="h-3 w-3 mr-1" />Graded</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {assignment.test_type === 'listening' ? (
                <Headphones className="h-4 w-4 text-primary" />
              ) : (
                <BookOpen className="h-4 w-4 text-primary" />
              )}
              <Badge variant="secondary" className="capitalize">{assignment.test_type}</Badge>
              {assignment.due_date && (
                <Badge variant={isOverdue ? 'destructive' : 'outline'} className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {isOverdue ? 'Overdue' : `Due ${format(new Date(assignment.due_date), 'MMM d')}`}
                </Badge>
              )}
              {isTeacher && (
                <Badge variant="outline" className="gap-1">
                  <Users className="h-3 w-3" />
                  {submittedCount}/{members.length} submitted
                </Badge>
              )}
            </div>
            {isTeacher && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(assignment.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CardTitle className="text-lg">{assignment.title}</CardTitle>
          <CardDescription>
            {assignment.book_id.replace('book', 'Book ')} • Test {assignment.test_id.slice(-1)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignment.description && (
            <p className="text-sm text-muted-foreground">{assignment.description}</p>
          )}

          {/* Student view: submission status + actions */}
          {!isTeacher && (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Your submission:</span>
                {mySubmission ? getStatusBadge(mySubmission.status) : <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Not started</Badge>}
                {mySubmission?.status === 'graded' && mySubmission.graded_score != null && (
                  <Badge className="bg-green-500 text-white">Score: {mySubmission.graded_score}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onStartTest(assignment)}>
                  {mySubmission ? 'Retake Test' : 'Start Test'}
                </Button>
                {(!mySubmission || mySubmission.status === 'pending') && (
                  <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Mark Submitted'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Student: teacher feedback */}
          {!isTeacher && mySubmission?.teacher_comment && (
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Teacher feedback:</p>
              <p className="text-sm">{mySubmission.teacher_comment}</p>
            </div>
          )}

          {/* Teacher: View submissions */}
          {isTeacher && submissions.length > 0 && (
            <>
              <Separator />
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowSubmissions(!showSubmissions)}
              >
                <Eye className="h-4 w-4" />
                View {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'}
                {showSubmissions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showSubmissions && (
                <div className="space-y-2">
                  {submissions.map((sub: AssignmentSubmission) => (
                    <div key={sub.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {(sub.profile?.full_name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{sub.profile?.full_name || sub.profile?.email || 'Student'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {getStatusBadge(sub.status)}
                            {sub.test_result && (
                              <span className="text-xs text-muted-foreground">
                                Band {sub.test_result.band_score} • {sub.test_result.correct_count}/{sub.test_result.total_questions}
                              </span>
                            )}
                            {sub.graded_score != null && (
                              <Badge className="bg-green-500/10 text-green-600 text-xs">Score: {sub.graded_score}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {sub.status === 'submitted' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setGradeDialogSub(sub);
                            setGradeScore(sub.test_result?.band_score?.toString() || '');
                          }}
                        >
                          <Award className="h-3 w-3 mr-1" />
                          Grade
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Grade dialog */}
      <Dialog open={!!gradeDialogSub} onOpenChange={(open) => !open && setGradeDialogSub(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Student: <span className="font-medium text-foreground">{gradeDialogSub?.profile?.full_name || 'Student'}</span>
            </p>
            {gradeDialogSub?.test_result && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm">
                  Test result: Band <span className="font-bold">{gradeDialogSub.test_result.band_score}</span> — {gradeDialogSub.test_result.correct_count}/{gradeDialogSub.test_result.total_questions} correct
                </p>
              </div>
            )}
            <div>
              <Label>Score</Label>
              <Input 
                type="number" 
                min="0" 
                max="9" 
                step="0.5"
                value={gradeScore} 
                onChange={(e) => setGradeScore(e.target.value)} 
                placeholder="e.g., 7.5" 
              />
            </div>
            <div>
              <Label>Comment (optional)</Label>
              <Textarea 
                value={gradeComment} 
                onChange={(e) => setGradeComment(e.target.value)} 
                placeholder="Feedback for student..." 
                rows={3} 
              />
            </div>
            <Button onClick={handleGrade} disabled={grading || !gradeScore} className="w-full">
              {grading ? 'Grading...' : 'Submit Grade'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReviewSubmissionsTab({
  requests,
  onGrade,
}: {
  requests: TestReviewRequest[];
  onGrade: (
    requestId: string,
    score: number,
    comment?: string,
    criteria?: {
      taskAchievement?: number | null;
      coherenceCohesion?: number | null;
      lexicalResource?: number | null;
      grammarAccuracy?: number | null;
    }
  ) => Promise<any>;
}) {
  const [activeRequest, setActiveRequest] = useState<TestReviewRequest | null>(null);
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [taskAchievement, setTaskAchievement] = useState('');
  const [coherenceCohesion, setCoherenceCohesion] = useState('');
  const [lexicalResource, setLexicalResource] = useState('');
  const [grammarAccuracy, setGrammarAccuracy] = useState('');

  const parseBandInput = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(9, Math.max(0, parsed));
  };

  const clampBandInput = (value: string) => {
    if (!value.trim()) return '';
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return '';
    return Math.min(9, Math.max(0, parsed)).toString();
  };

  const writingCriteriaScores = [taskAchievement, coherenceCohesion, lexicalResource, grammarAccuracy]
    .map(parseBandInput);

  const writingTeacherScore =
    activeRequest?.test_result?.test_type === 'writing' && writingCriteriaScores.every((score) => score !== null)
      ? calculateAverageBand(writingCriteriaScores.map((score) => score as number))
      : null;

  const pending = requests.filter((r) => r.status === 'pending');
  const graded = requests.filter((r) => r.status === 'graded');

  const openGradeDialog = (request: TestReviewRequest) => {
    setActiveRequest(request);
    setScore(request.test_result?.band_score?.toString() || '');
    setComment(request.teacher_comment || '');
    setTaskAchievement(request.teacher_criteria?.taskAchievement?.toString() || '');
    setCoherenceCohesion(request.teacher_criteria?.coherenceCohesion?.toString() || '');
    setLexicalResource(request.teacher_criteria?.lexicalResource?.toString() || '');
    setGrammarAccuracy(request.teacher_criteria?.grammarAccuracy?.toString() || '');
  };

  const renderSubmissionDetails = (request: TestReviewRequest) => {
    const answers: any = request.test_result?.answers || {};

    if (request.test_result?.test_type === 'writing') {
      return (
        <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm space-y-2">
          <div>
            <p className="font-medium">Question</p>
            <p className="text-muted-foreground">Task 1: {answers?.prompts?.task1 || 'Not available'}</p>
            <p className="text-muted-foreground">Task 2: {answers?.prompts?.task2 || 'Not available'}</p>
          </div>
          <div>
            <p className="font-medium">Student Answer</p>
            <p className="text-muted-foreground whitespace-pre-wrap">Task 1: {answers?.task1 || 'No answer submitted'}</p>
            <p className="text-muted-foreground whitespace-pre-wrap mt-2">Task 2: {answers?.task2 || 'No answer submitted'}</p>
          </div>
        </div>
      );
    }

    if (request.test_result?.test_type === 'speaking') {
      return (
        <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm space-y-2">
          <div>
            <p className="font-medium">Question</p>
            <p className="text-muted-foreground">Cue Card: {answers?.cueCardTopic || 'Not available'}</p>
            <p className="text-muted-foreground">Part 3 Theme: {answers?.part3Theme || 'Not available'}</p>
            {Array.isArray(answers?.questions) && answers.questions.length > 0 && (
              <div className="mt-2 space-y-1 text-muted-foreground">
                {answers.questions.map((entry: any, index: number) => (
                  <p key={index}>
                    Part {entry.part}: {Array.isArray(entry.questions) ? entry.questions.join(' | ') : 'No question data'}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="font-medium">Student Answer</p>
            <p className="text-muted-foreground whitespace-pre-wrap">Part 1: {answers?.transcripts?.part1 || 'No transcript available'}</p>
            <p className="text-muted-foreground whitespace-pre-wrap mt-2">Part 2: {answers?.transcripts?.part2 || 'No transcript available'}</p>
            <p className="text-muted-foreground whitespace-pre-wrap mt-2">Part 3: {answers?.transcripts?.part3 || 'No transcript available'}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const handleGrade = async () => {
    if (!activeRequest) return;

    const isWriting = activeRequest.test_result?.test_type === 'writing';

    const criteria = isWriting
      ? {
          taskAchievement: parseBandInput(taskAchievement),
          coherenceCohesion: parseBandInput(coherenceCohesion),
          lexicalResource: parseBandInput(lexicalResource),
          grammarAccuracy: parseBandInput(grammarAccuracy),
        }
      : undefined;

    const finalScore = isWriting
      ? writingTeacherScore
      : parseBandInput(score);

    if (finalScore === null) return;

    setSaving(true);
    const { error } = await onGrade(activeRequest.id, finalScore, comment, criteria);
    setSaving(false);

    if (error) {
      toast.error('Failed to submit teacher review');
      return;
    }

    toast.success('Teacher review submitted');
    setActiveRequest(null);
    setScore('');
    setComment('');
    setTaskAchievement('');
    setCoherenceCohesion('');
    setLexicalResource('');
    setGrammarAccuracy('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Review Requests</CardTitle>
          <CardDescription>
            Students requested manual teacher grading for these completed tests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending review requests.</p>
          ) : (
            pending.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{req.profile?.full_name || req.profile?.email || 'Student'}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.test_result?.test_type?.toUpperCase()} • {req.test_result?.test_id} • AI Band {req.test_result?.band_score ?? '-'}
                  </p>
                  {renderSubmissionDetails(req)}
                </div>
                <Button size="sm" variant="outline" onClick={() => openGradeDialog(req)}>
                  <Award className="h-3 w-3 mr-1" />
                  Grade
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Graded Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {graded.length === 0 ? (
            <p className="text-sm text-muted-foreground">No graded requests yet.</p>
          ) : (
            graded.map((req) => (
              <div key={req.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{req.profile?.full_name || req.profile?.email || 'Student'}</p>
                  <Badge className="bg-green-500/10 text-green-600">Score: {req.teacher_score ?? '-'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {req.test_result?.test_type?.toUpperCase()} • {req.test_result?.test_id} • AI Band {req.test_result?.band_score ?? '-'}
                </p>
                {req.teacher_comment && (
                  <p className="text-sm mt-2">{req.teacher_comment}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!activeRequest}
        onOpenChange={(open) => {
          if (!open) {
            setActiveRequest(null);
            setTaskAchievement('');
            setCoherenceCohesion('');
            setLexicalResource('');
            setGrammarAccuracy('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {activeRequest?.profile?.full_name || activeRequest?.profile?.email || 'Student'} — {activeRequest?.test_result?.test_type?.toUpperCase()} {activeRequest?.test_result?.test_id}
            </p>
            {activeRequest?.test_result?.test_type === 'writing' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3">
                <div>
                  <Label>Task Achievement</Label>
                  <Input
                    type="number"
                    min="0"
                    max="9"
                    step="0.5"
                    value={taskAchievement}
                    onChange={(e) => setTaskAchievement(clampBandInput(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Coherence & Cohesion</Label>
                  <Input
                    type="number"
                    min="0"
                    max="9"
                    step="0.5"
                    value={coherenceCohesion}
                    onChange={(e) => setCoherenceCohesion(clampBandInput(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Lexical Resource</Label>
                  <Input
                    type="number"
                    min="0"
                    max="9"
                    step="0.5"
                    value={lexicalResource}
                    onChange={(e) => setLexicalResource(clampBandInput(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Grammar Accuracy</Label>
                  <Input
                    type="number"
                    min="0"
                    max="9"
                    step="0.5"
                    value={grammarAccuracy}
                    onChange={(e) => setGrammarAccuracy(clampBandInput(e.target.value))}
                  />
                </div>
              </div>
            )}
            <div>
              <Label>Teacher Score</Label>
              <Input
                type="number"
                min="0"
                max="9"
                step="0.5"
                value={activeRequest?.test_result?.test_type === 'writing' ? (writingTeacherScore ?? '') : score}
                onChange={(e) => setScore(clampBandInput(e.target.value))}
                readOnly={activeRequest?.test_result?.test_type === 'writing'}
              />
            </div>
            <div>
              <Label>Comment</Label>
              <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <Button
              onClick={handleGrade}
              disabled={saving || (activeRequest?.test_result?.test_type === 'writing' ? writingTeacherScore === null : !score)}
              className="w-full"
            >
              {saving ? 'Saving...' : 'Submit Grade'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STUDENTS TAB
   ═══════════════════════════════════════════════════════════════════════ */

function StudentsTab({ 
  members, 
  onAddStudent, 
  onRemoveStudent 
}: { 
  members: any[];
  onAddStudent: (email: string) => Promise<any>;
  onRemoveStudent: (id: string) => Promise<any>;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setAdding(true);
    const { error } = await onAddStudent(email.trim());
    setAdding(false);
    if (error) {
      toast.error(error.message || 'Failed to add student');
    } else {
      toast.success('Student added!');
      setShowDialog(false);
      setEmail('');
    }
  };

  return (
    <div className="space-y-4">
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student by Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Student Email</Label>
              <Input 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="student@example.com" 
              />
            </div>
            <Button onClick={handleAdd} disabled={adding || !email.trim()} className="w-full">
              {adding ? 'Adding...' : 'Add Student'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {members.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No students yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {(member.profile?.full_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{member.profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Joined {format(new Date(member.joined_at), 'MMM d, yyyy')}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => onRemoveStudent(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClassroomDetail } from '@/hooks/useClassroom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ClassroomLayout from '@/components/classroom/ClassroomLayout';

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
    loading,
    isTeacher,
    addStudent,
    removeStudent,
    createPost,
    deletePost,
    createAssignment,
    deleteAssignment
  } = useClassroomDetail(classroomId);

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
              onCreatePost={createPost}
              onDeletePost={deletePost}
            />
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <AssignmentsTab 
              assignments={assignments}
              isTeacher={isTeacher}
              onCreateAssignment={createAssignment}
              onDeleteAssignment={deleteAssignment}
            />
          </TabsContent>

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

function FeedTab({ 
  posts, 
  isTeacher, 
  onCreatePost, 
  onDeletePost 
}: { 
  posts: any[];
  isTeacher: boolean;
  onCreatePost: (title: string, content: string, type: 'resource' | 'announcement' | 'question') => Promise<any>;
  onDeletePost: (id: string) => Promise<any>;
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
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="resource">Resource</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
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
          <Card key={post.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getPostIcon(post.post_type)}
                  <Badge variant="outline" className="capitalize">{post.post_type}</Badge>
                </div>
                {isTeacher && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDeletePost(post.id)}
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
          </Card>
        ))
      )}
    </div>
  );
}

function AssignmentsTab({ 
  assignments, 
  isTeacher, 
  onCreateAssignment, 
  onDeleteAssignment 
}: { 
  assignments: any[];
  isTeacher: boolean;
  onCreateAssignment: (title: string, desc: string, type: 'listening' | 'reading', book: string, test: string, due?: string) => Promise<any>;
  onDeleteAssignment: (id: string) => Promise<any>;
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

  return (
    <div className="space-y-4">
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
          <Card key={assignment.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {assignment.test_type === 'listening' ? (
                    <Headphones className="h-4 w-4 text-primary" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-primary" />
                  )}
                  <Badge variant="secondary" className="capitalize">{assignment.test_type}</Badge>
                  {assignment.due_date && (
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      Due {format(new Date(assignment.due_date), 'MMM d')}
                    </Badge>
                  )}
                </div>
                {isTeacher && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDeleteAssignment(assignment.id)}
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
            <CardContent className="flex items-center justify-between">
              {assignment.description && (
                <p className="text-sm text-muted-foreground">{assignment.description}</p>
              )}
              {!isTeacher && (
                <Button size="sm" onClick={() => startTest(assignment)}>
                  Start Test
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

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
                  <div>
                    <p className="font-medium">{member.profile?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => onRemoveStudent(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

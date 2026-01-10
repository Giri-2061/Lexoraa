import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConsultancy, useClassrooms, useStudentClassrooms } from '@/hooks/useClassroom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, BookOpen, GraduationCap, Building, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import ClassroomLayout from '@/components/classroom/ClassroomLayout';

export default function Classrooms() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();

  if (authLoading) {
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

  if (role === 'student') {
    return <StudentClassroomsView />;
  }

  if (role === 'consultancy_owner' || role === 'super_admin') {
    return <TeacherClassroomsView />;
  }

  return (
    <ClassroomLayout>
      <div className="text-center py-12">
        <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">Classroom features are only available for registered students and teachers.</p>
      </div>
    </ClassroomLayout>
  );
}

function TeacherClassroomsView() {
  const { consultancy, loading: consultancyLoading, createConsultancy } = useConsultancy();
  const { classrooms, loading: classroomsLoading, createClassroom } = useClassrooms();
  const navigate = useNavigate();

  const [showConsultancyDialog, setShowConsultancyDialog] = useState(false);
  const [consultancyName, setConsultancyName] = useState('');
  const [showClassroomDialog, setShowClassroomDialog] = useState(false);
  const [classroomName, setClassroomName] = useState('');
  const [classroomDescription, setClassroomDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateConsultancy = async () => {
    if (!consultancyName.trim()) return;
    setCreating(true);
    const { error } = await createConsultancy(consultancyName.trim());
    setCreating(false);
    if (error) {
      toast.error('Failed to create consultancy');
    } else {
      toast.success('Consultancy created!');
      setShowConsultancyDialog(false);
      setConsultancyName('');
    }
  };

  const handleCreateClassroom = async () => {
    if (!classroomName.trim() || !consultancy) return;
    setCreating(true);
    const { error } = await createClassroom(classroomName.trim(), classroomDescription.trim(), consultancy.id);
    setCreating(false);
    if (error) {
      toast.error('Failed to create classroom');
    } else {
      toast.success('Classroom created!');
      setShowClassroomDialog(false);
      setClassroomName('');
      setClassroomDescription('');
    }
  };

  if (consultancyLoading || classroomsLoading) {
    return (
      <ClassroomLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </ClassroomLayout>
    );
  }

  // Show consultancy creation if none exists
  if (!consultancy) {
    return (
      <ClassroomLayout>
        <div className="max-w-md mx-auto text-center py-12">
          <Building className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Create Your Consultancy</h2>
          <p className="text-muted-foreground mb-6">
            Set up your consultancy to start creating classrooms and managing students.
          </p>
          
          <Dialog open={showConsultancyDialog} onOpenChange={setShowConsultancyDialog}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Consultancy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Consultancy</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="consultancy-name">Consultancy Name</Label>
                  <Input
                    id="consultancy-name"
                    value={consultancyName}
                    onChange={(e) => setConsultancyName(e.target.value)}
                    placeholder="e.g., IELTS Academy"
                  />
                </div>
                <Button onClick={handleCreateConsultancy} disabled={creating || !consultancyName.trim()} className="w-full">
                  {creating ? 'Creating...' : 'Create Consultancy'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </ClassroomLayout>
    );
  }

  return (
    <ClassroomLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Classrooms</h1>
            <p className="text-muted-foreground">{consultancy.name}</p>
          </div>
          
          <Dialog open={showClassroomDialog} onOpenChange={setShowClassroomDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Classroom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Classroom</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="classroom-name">Classroom Name</Label>
                  <Input
                    id="classroom-name"
                    value={classroomName}
                    onChange={(e) => setClassroomName(e.target.value)}
                    placeholder="e.g., IELTS Prep - Batch 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="classroom-description">Description (optional)</Label>
                  <Textarea
                    id="classroom-description"
                    value={classroomDescription}
                    onChange={(e) => setClassroomDescription(e.target.value)}
                    placeholder="Brief description of this classroom..."
                  />
                </div>
                <Button onClick={handleCreateClassroom} disabled={creating || !classroomName.trim()} className="w-full">
                  {creating ? 'Creating...' : 'Create Classroom'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {classrooms.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No classrooms yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first classroom to start managing students and assignments.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classrooms.map((classroom) => (
              <ClassroomCard 
                key={classroom.id} 
                classroom={classroom} 
                onClick={() => navigate(`/classrooms/${classroom.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </ClassroomLayout>
  );
}

function StudentClassroomsView() {
  const { memberships, loading, joinByCode } = useStudentClassrooms();
  const navigate = useNavigate();

  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    const { error } = await joinByCode(inviteCode.trim());
    setJoining(false);
    if (error) {
      toast.error(error.message || 'Failed to join classroom');
    } else {
      toast.success('Joined classroom!');
      setShowJoinDialog(false);
      setInviteCode('');
    }
  };

  if (loading) {
    return (
      <ClassroomLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </ClassroomLayout>
    );
  }

  return (
    <ClassroomLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Classrooms</h1>
            <p className="text-muted-foreground">View your enrolled classrooms and assignments</p>
          </div>
          
          <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Join Classroom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Classroom</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="invite-code">Invite Code</Label>
                  <Input
                    id="invite-code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter invite code from your teacher"
                  />
                </div>
                <Button onClick={handleJoin} disabled={joining || !inviteCode.trim()} className="w-full">
                  {joining ? 'Joining...' : 'Join Classroom'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {memberships.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No classrooms yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Ask your teacher for an invite code to join a classroom.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {memberships.map((membership) => (
              membership.classroom && (
                <ClassroomCard 
                  key={membership.id} 
                  classroom={membership.classroom}
                  onClick={() => navigate(`/classrooms/${membership.classroom_id}`)}
                />
              )
            ))}
          </div>
        )}
      </div>
    </ClassroomLayout>
  );
}

function ClassroomCard({ 
  classroom, 
  onClick 
}: { 
  classroom: { id: string; name: string; description: string | null; invite_code: string }; 
  onClick: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { role } = useAuth();
  const isTeacher = role === 'consultancy_owner' || role === 'super_admin';

  const copyInviteCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(classroom.invite_code);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={onClick}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          {classroom.name}
        </CardTitle>
        {classroom.description && (
          <CardDescription>{classroom.description}</CardDescription>
        )}
      </CardHeader>
      {isTeacher && (
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Invite Code:</span>
            <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
              {classroom.invite_code}
            </code>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyInviteCode}>
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

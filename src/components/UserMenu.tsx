import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { User, LogOut, Shield, Building, GraduationCap, Trash2 } from 'lucide-react';

const roleLabels = {
  super_admin: { label: 'Super Admin', icon: Shield },
  consultancy_owner: { label: 'Consultancy Owner', icon: Building },
  student: { label: 'Student', icon: GraduationCap },
};

export default function UserMenu() {
  const navigate = useNavigate();
  const { user, role, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-account');

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Failed to delete account.');
      }

      await signOut();
      toast({
        title: 'Account deleted',
        description: 'Your account and related data have been permanently removed.',
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Deletion failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/auth')}
        className="border-primary/30 hover:bg-primary/10 text-primary"
      >
        <User className="h-4 w-4 mr-2" />
        Login
      </Button>
    );
  }

  const initials = user.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || 'U';

  const roleInfo = role ? roleLabels[role] : null;
  const RoleIcon = roleInfo?.icon || User;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              {roleInfo && (
                <div className="flex items-center gap-1 mt-1">
                  <RoleIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{roleInfo.label}</span>
                </div>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {role === 'super_admin' && (
            <DropdownMenuItem
              onClick={() => navigate('/admin')}
              className="cursor-pointer"
            >
              <Shield className="mr-2 h-4 w-4" />
              Admin Dashboard
            </DropdownMenuItem>
          )}
          {(role === 'super_admin' || role === 'consultancy_owner') && (
            <DropdownMenuItem
              onClick={() => navigate('/dashboard')}
              className="cursor-pointer"
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Teacher Dashboard
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete my account
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account and all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes your profile, test history, scores, classroom activity, and related account data from Lexora.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteAccount();
              }}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? 'Deleting...' : 'Yes, delete everything'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { 
  GraduationCap, 
  Home, 
  BookOpen, 
  FileText, 
  Users, 
  BarChart3,
  Menu,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import UserMenu from '@/components/UserMenu';

interface ClassroomLayoutProps {
  children: ReactNode;
}

export default function ClassroomLayout({ children }: ClassroomLayoutProps) {
  const { role } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isTeacher = role === 'consultancy_owner' || role === 'super_admin';

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Classrooms', path: '/classrooms', icon: GraduationCap },
    { name: 'Mock Tests', path: '/mock-tests', icon: BookOpen },
    ...(isTeacher ? [{ name: 'Analytics', path: '/classrooms/analytics', icon: BarChart3 }] : []),
  ];

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            {!collapsed && (
              <Link to="/" className="flex items-center gap-2">
                <img src="/logo-full.svg" alt="Logo" className="w-8 h-8" />
                <span className="font-bold text-primary">Learning Lounge</span>
              </Link>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCollapsed(!collapsed)}
              className={cn(collapsed && "mx-auto")}
            >
              {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-2 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="font-medium">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className={cn("p-4 border-t border-border", collapsed && "flex justify-center")}>
            <UserMenu />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300",
          collapsed ? "ml-16" : "ml-64"
        )}
      >
        <div className="container mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

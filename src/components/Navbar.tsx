import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenu from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  name: string;
  path: string;
  icon?: React.ReactNode;
  highlight?: boolean; // special styling for admin
}

const baseNavItems: NavItem[] = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Classrooms", path: "/classrooms" },
  { name: "Mock IELTS Tests", path: "/mock-tests" },
  { name: "Score Calculator", path: "/score-calculator" },
];

const adminNavItems: NavItem[] = [
  {
    name: "Admin Panel",
    path: "/admin",
    icon: <Shield className="h-3.5 w-3.5" />,
    highlight: true,
  },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { role } = useAuth();

  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    if (role === "super_admin") {
      items.push(...adminNavItems);
    }
    return items;
  }, [role]);

  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/10 shadow-sm text-white" style={{ backgroundColor: 'hsl(220 60% 25%)' }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="LEXORA" className="h-12 object-contain rounded-md" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.path === "/admin"
                ? isAdminRoute
                : location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                    isActive
                      ? item.highlight
                        ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30"
                        : "bg-white/20 text-white"
                      : item.highlight
                        ? "text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-300"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
            <ThemeToggle />
            <div className="ml-2">
              <UserMenu />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/20 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = item.path === "/admin"
                  ? isAdminRoute
                  : location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                      isActive
                        ? item.highlight
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-white/20 text-white"
                        : item.highlight
                          ? "text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-300"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}
              <div className="px-4 py-2 flex items-center gap-2">
                <ThemeToggle />
                <UserMenu />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

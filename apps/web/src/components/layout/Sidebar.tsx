'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Home, 
  User, 
  Settings, 
  LogOut, 
  Palette,
  Search,
  Plus,
  Menu,
  X,
  Briefcase,
  BookOpen,
  CheckSquare,
  Calendar,
  Globe,
  Bookmark,
  Mail,
  ChevronDown,
  ChevronRight,
  Brain,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentPage?: 'dashboard' | 'profiles' | 'opportunities' | 'settings' | 'research' | 'research-web-search' | 'research-llm-search' | 'research-sm-search' | 'research-bookmarks' | 'research-newsletter' | 'tasks' | 'calendar';
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ 
  currentPage = 'dashboard', 
  isCollapsed = false, 
  onToggleCollapse 
}: SidebarProps) {
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isResearchExpanded, setIsResearchExpanded] = useState(
    currentPage === 'research' || currentPage === 'research-web-search' || currentPage === 'research-llm-search' || currentPage === 'research-sm-search' || currentPage === 'research-bookmarks' || currentPage === 'research-newsletter'
  );

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, current: currentPage === 'dashboard' },
    { name: 'Profiles', href: '/dashboard/profiles', icon: User, current: currentPage === 'profiles' },
    { name: 'Portfolio', href: '/dashboard/portfolio', icon: Briefcase, current: false, badge: 'Soon' },
    { 
      name: 'Research', 
      href: '#', 
      icon: BookOpen, 
      current: currentPage === 'research-web-search' || currentPage === 'research-llm-search' || currentPage === 'research-sm-search' || currentPage === 'research-bookmarks' || currentPage === 'research-newsletter',
      hasSubmenu: true,
      submenu: [
        { name: 'Web Search', href: '/dashboard/research/web-search', icon: Globe, current: currentPage === 'research-web-search' },
        { name: 'LLM Search', href: '/dashboard/research/llm-search', icon: Brain, current: currentPage === 'research-llm-search' },
        { name: 'Social Media Search', href: '/dashboard/research/social-media', icon: Share2, current: currentPage === 'research-sm-search' },
        { name: 'Bookmarks', href: '/dashboard/research/bookmarks', icon: Bookmark, current: currentPage === 'research-bookmarks' },
        { name: 'Newsletter', href: '/dashboard/research/newsletter', icon: Mail, current: currentPage === 'research-newsletter' },
      ]
    },
    { name: 'Opportunities', href: '/dashboard/opportunities', icon: Search, current: currentPage === 'opportunities' },
    { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare, current: currentPage === 'tasks' },
    { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar, current: currentPage === 'calendar' },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-border",
        "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Palette className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">OPPO</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => onToggleCollapse?.(!isCollapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-2">
          {navigation.map((item) => (
            <div key={item.name}>
              {item.hasSubmenu ? (
                <div>
                  <button
                    onClick={() => !isCollapsed && setIsResearchExpanded(!isResearchExpanded)}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm rounded-lg transition-colors group w-full",
                      item.current
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.name}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {item.badge}
                          </Badge>
                        )}
                        {isResearchExpanded ? (
                          <ChevronDown className="h-4 w-4 ml-2" />
                        ) : (
                          <ChevronRight className="h-4 w-4 ml-2" />
                        )}
                      </>
                    )}
                  </button>
                  
                  {/* Submenu */}
                  {!isCollapsed && isResearchExpanded && item.submenu && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className={cn(
                            "flex items-center px-3 py-2 text-sm rounded-lg transition-colors group",
                            subItem.current
                              ? "bg-primary/10 text-primary border-l-2 border-primary"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <subItem.icon className="h-4 w-4 mr-3" />
                          <span className="flex-1">{subItem.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <a
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm rounded-lg transition-colors group",
                    item.current
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </a>
              )}
            </div>
          ))}
        </nav>

        <Separator />


        <Separator />

        {/* User section */}
        <div className="p-3">
          {!isCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 p-2 rounded-lg bg-muted">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.name || 'OPPO Artist'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 hover:bg-background/80"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
              <a 
                href="/dashboard/settings"
                className="flex items-center justify-center px-3 py-2 text-sm rounded-lg transition-colors hover:bg-muted text-muted-foreground hover:text-foreground w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10" 
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
                <a 
                  href="/dashboard/settings"
                  className="flex items-center justify-center h-10 w-10 rounded-lg transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer for main content */}
      <div className={cn("hidden lg:block", isCollapsed ? "w-16" : "w-64")} />
    </>
  );
}
'use client';

import { AuthGate } from '@/components/auth/AuthGate';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage?: 'dashboard' | 'profiles' | 'opportunities' | 'settings';
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function DashboardLayout({ 
  children, 
  currentPage, 
  title,
  subtitle,
  action 
}: DashboardLayoutProps) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-background">
        <Sidebar currentPage={currentPage} />
        
        {/* Main content */}
        <div className="lg:ml-64">
          {/* Page header */}
          {(title || action) && (
            <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                  <div className="ml-12 lg:ml-0">
                    {title && (
                      <div>
                        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                        {subtitle && (
                          <p className="text-sm text-muted-foreground">{subtitle}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {action && <div>{action}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Page content */}
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
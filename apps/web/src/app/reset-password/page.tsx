'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { auth } from '@/lib/auth-api';
import { useToast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid reset link. Missing token or email.');
      setIsLoading(false);
      return;
    }

    verifyToken();
  }, [token, email]);

  const verifyToken = async () => {
    try {
      setIsLoading(true);
      const response = await auth.verifyResetToken(token!, email!);
      
      if (response.success) {
        setUserData(response.user);
        setError(null);
      } else {
        setError(response.message || 'Invalid or expired reset token.');
      }
    } catch (error: any) {
      setError('Failed to verify reset token.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!token || !email) return;
    
    try {
      setIsVerifying(true);
      const response = await auth.resetPassword(token, email);
      
      if (response.success) {
        setIsSuccess(true);
        toast({
          title: "Success",
          description: response.message,
        });
        
        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setError(response.message || 'Failed to reset password.');
      }
    } catch (error: any) {
      setError('Failed to reset password.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Verifying reset link...</h3>
            <p className="text-muted-foreground">Please wait while we verify your reset token.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Invalid Reset Link</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => router.push('/forgot-password')}
                className="w-full"
              >
                Request a new reset link
              </Button>
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="w-full"
              >
                Back to login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Access Restored</CardTitle>
            <CardDescription>
              You have been successfully logged in and will be redirected to your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Redirecting you to the dashboard...
              </p>
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                Go to dashboard now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset Your Access</CardTitle>
          <CardDescription>
            {userData ? `Restore access for ${userData.email}` : 'Click below to restore your account access'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userData && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-foreground">
                    {userData.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{userData.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{userData.email}</p>
                </div>
              </div>
            </div>
          )}
          
          <Button 
            onClick={handleReset}
            disabled={isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Restoring access...
              </>
            ) : (
              'Restore my access'
            )}
          </Button>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
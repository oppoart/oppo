'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Sparkles, 
  User, 
  Settings, 
  Target, 
  Palette,
  ArrowRight,
  X
} from 'lucide-react';

interface WelcomeFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
  hasProfiles: boolean;
  hasPreferences: boolean;
  onCreateProfile: () => void;
  onOpenSettings: () => void;
}

export function WelcomeFlow({ 
  open, 
  onOpenChange, 
  userName, 
  hasProfiles, 
  hasPreferences,
  onCreateProfile,
  onOpenSettings 
}: WelcomeFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: `Welcome to OPPO${userName ? `, ${userName}` : ''}!`,
      description: "Your AI-powered opportunity discovery and application assistant for artists",
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <p className="text-muted-foreground">
              OPPO helps artists like you discover grants, residencies, exhibitions, and other opportunities 
              that match your artistic practice and career goals.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center p-4">
              <Palette className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <h4 className="font-medium text-sm">Create Profiles</h4>
              <p className="text-xs text-muted-foreground">Build specialized profiles for different art forms</p>
            </div>
            <div className="text-center p-4">
              <Target className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <h4 className="font-medium text-sm">AI Matching</h4>
              <p className="text-xs text-muted-foreground">Get personalized opportunity recommendations</p>
            </div>
            <div className="text-center p-4">
              <Settings className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <h4 className="font-medium text-sm">Auto-Apply</h4>
              <p className="text-xs text-muted-foreground">Automatically apply to matching opportunities</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Set up your artist profiles",
      description: "Create specialized profiles for different artistic mediums or themes",
      icon: <User className="h-8 w-8 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            {hasProfiles ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <div className="w-5 h-5 border-2 border-muted-foreground rounded-full" />
            )}
            <span className={hasProfiles ? "text-green-700" : "text-foreground"}>
              Create your first artist profile
            </span>
            {hasProfiles && (
              <Badge variant="secondary" className="text-xs">
                Complete
              </Badge>
            )}
          </div>
          
          <div className="pl-8 space-y-2">
            <p className="text-sm text-muted-foreground">
              Artist profiles help OPPO understand your practice and match you with relevant opportunities. 
              You can create multiple profiles for different mediums or artistic focuses.
            </p>
            
            {!hasProfiles && (
              <Button onClick={onCreateProfile} className="mt-4">
                <Palette className="h-4 w-4 mr-2" />
                Create Your First Profile
              </Button>
            )}
          </div>
        </div>
      )
    },
    {
      title: "Configure your preferences",
      description: "Set up AI matching preferences for personalized opportunities",
      icon: <Settings className="h-8 w-8 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            {hasPreferences ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <div className="w-5 h-5 border-2 border-muted-foreground rounded-full" />
            )}
            <span className={hasPreferences ? "text-green-700" : "text-foreground"}>
              Set up opportunity preferences
            </span>
            {hasPreferences && (
              <Badge variant="secondary" className="text-xs">
                Complete
              </Badge>
            )}
          </div>
          
          <div className="pl-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              Configure your preferences to help OPPO find the most relevant opportunities for you:
            </p>
            
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Funding amount ranges</li>
              <li>• Preferred locations</li>
              <li>• Types of opportunities</li>
              <li>• AI matching sensitivity</li>
              <li>• Notification preferences</li>
            </ul>
            
            {!hasPreferences && (
              <Button onClick={onOpenSettings} variant="outline" className="mt-4">
                <Settings className="h-4 w-4 mr-2" />
                Configure Preferences
              </Button>
            )}
          </div>
        </div>
      )
    },
    {
      title: "You're all set!",
      description: "Start discovering opportunities tailored to your artistic practice",
      icon: <CheckCircle2 className="h-8 w-8 text-green-500" />,
      content: (
        <div className="space-y-4 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Great! You've completed the initial setup. OPPO is now ready to help you discover 
              and apply to opportunities that match your artistic practice.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 mt-4">
              <p className="text-sm text-muted-foreground">
                <strong>What's next:</strong> The AI opportunity discovery system will be available soon. 
                In the meantime, you can refine your profiles and preferences at any time.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {currentStepData.icon}
              <div>
                <DialogTitle className="text-left">{currentStepData.title}</DialogTitle>
                <DialogDescription className="text-left">
                  {currentStepData.description}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Step content */}
          <div className="min-h-[300px]">
            {currentStepData.content}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {!isLastStep ? (
                <Button onClick={nextStep}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={() => onOpenChange(false)}>
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
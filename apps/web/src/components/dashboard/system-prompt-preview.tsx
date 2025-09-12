'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Sparkles, Save, Edit3, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArtistProfile } from '@/types/profile';
import { ARTIST_CATEGORIES } from '@/types/profile';
import { profileApi } from '@/lib/api';

interface SystemPromptPreviewProps {
  profile: ArtistProfile;
}

export function SystemPromptPreview({ profile }: SystemPromptPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tempEnhancedPrompt, setTempEnhancedPrompt] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  // Load enhanced prompt from localStorage on component mount
  useEffect(() => {
    const storageKey = `enhanced-prompt-${profile.id}`;
    const savedPrompt = localStorage.getItem(storageKey);
    if (savedPrompt) {
      setEnhancedPrompt(savedPrompt);
    }
  }, [profile.id]);

  // Save enhanced prompt to localStorage
  const saveEnhancedPrompt = () => {
    if (tempEnhancedPrompt) {
      const storageKey = `enhanced-prompt-${profile.id}`;
      localStorage.setItem(storageKey, tempEnhancedPrompt);
      setEnhancedPrompt(tempEnhancedPrompt);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  // Clear enhanced prompt from localStorage
  const clearEnhancedPrompt = () => {
    const storageKey = `enhanced-prompt-${profile.id}`;
    localStorage.removeItem(storageKey);
    setEnhancedPrompt(null);
    setTempEnhancedPrompt(null);
    setIsEditing(false);
  };

  // Toggle edit mode
  const toggleEdit = () => {
    if (!isEditing) {
      // Entering edit mode - set the current text
      setEditText(displayPrompt);
    } else {
      // Exiting edit mode - save the changes as temp enhanced prompt
      if (editText.trim() !== displayPrompt) {
        setTempEnhancedPrompt(editText.trim());
      }
    }
    setIsEditing(!isEditing);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditText(displayPrompt);
    setIsEditing(false);
  };

  const generateSystemPrompt = (profile: ArtistProfile): string => {
    const mediumLabels = profile.mediums.map(medium => 
      ARTIST_CATEGORIES.find(cat => cat.value === medium)?.label || medium
    );

    const sections = [];

    sections.push(`You are an AI assistant representing ${profile.name}, an artist specializing in ${mediumLabels.join(', ')}.`);

    if (profile.bio) {
      sections.push(`Background: ${profile.bio}`);
    }

    if (profile.artistStatement) {
      sections.push(`Artistic Philosophy: ${profile.artistStatement}`);
    }

    if (profile.skills && profile.skills.length > 0) {
      sections.push(`Technical Skills: ${profile.skills.join(', ')}`);
    }

    if (profile.interests && profile.interests.length > 0) {
      sections.push(`Areas of Interest: ${profile.interests.join(', ')}`);
    }

    sections.push(`When responding, maintain the voice and perspective of ${profile.name}. Draw upon their expertise in ${mediumLabels.join(', ')} and provide insights that reflect their artistic background and experience.`);

    return sections.join('\n\n');
  };

  const systemPrompt = generateSystemPrompt(profile);
  const displayPrompt = tempEnhancedPrompt || enhancedPrompt || systemPrompt;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEnhance = async () => {
    setEnhancing(true);
    setError(null);
    
    try {
      const result = await profileApi.enhancePrompt(profile.id);
      setTempEnhancedPrompt(result.enhancedPrompt);
    } catch (err: any) {
      console.error('Error enhancing prompt:', err);
      setError('Failed to enhance prompt. Please try again.');
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              System Prompt Preview
              {(tempEnhancedPrompt || enhancedPrompt) && (
                <span className="ml-2 text-sm text-green-600 font-normal">
                  ✨ {tempEnhancedPrompt && !enhancedPrompt ? 'Enhanced (Unsaved)' : 'Enhanced'}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {tempEnhancedPrompt || enhancedPrompt ? 'AI-enhanced' : 'Generated from profile data'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleEdit}
              className="flex items-center gap-2"
            >
              {isEditing ? (
                <>
                  <Eye className="h-4 w-4" />
                  View
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy}
              className="flex items-center gap-2"
              disabled={isEditing}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        {isEditing ? (
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="font-mono text-sm min-h-96 resize-none"
            placeholder="Edit your system prompt..."
          />
        ) : (
          <div className={`bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto border ${tempEnhancedPrompt || enhancedPrompt ? 'border-green-200' : ''}`}>
            {displayPrompt}
          </div>
        )}
        
        <div className="mt-4 space-y-2">
          {isEditing ? (
            <div className="flex gap-2">
              <Button
                onClick={toggleEdit}
                className="flex-1"
                variant="default"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button
                onClick={cancelEdit}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <Button
                onClick={handleEnhance}
                disabled={enhancing}
                className="w-full"
                variant="outline"
              >
                {enhancing ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {enhancedPrompt || tempEnhancedPrompt ? 'Enhance Again' : 'Enhance'}
                  </>
                )}
              </Button>
              
              {tempEnhancedPrompt && (
                <Button
                  onClick={saveEnhancedPrompt}
                  className="w-full"
                  variant="default"
                >
                  {saved ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Enhanced Prompt
                    </>
                  )}
                </Button>
              )}
              
              {(enhancedPrompt || tempEnhancedPrompt) && (
                <Button
                  onClick={clearEnhancedPrompt}
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                >
                  Show Original
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
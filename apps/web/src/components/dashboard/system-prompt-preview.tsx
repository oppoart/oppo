'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArtistProfile } from '@/types/profile';
import { ARTIST_CATEGORIES } from '@/types/profile';

interface SystemPromptPreviewProps {
  profile: ArtistProfile;
}

export function SystemPromptPreview({ profile }: SystemPromptPreviewProps) {
  const [copied, setCopied] = useState(false);

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(systemPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">System Prompt Preview</CardTitle>
            <CardDescription>
              AI agent prompt generated from profile data
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopy}
            className="flex items-center gap-2"
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
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto border">
          {systemPrompt}
        </div>
      </CardContent>
    </Card>
  );
}
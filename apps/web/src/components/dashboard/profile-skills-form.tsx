'use client';

import { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArtistProfile, UpdateProfileRequest } from '@/types/profile';
import { profileApi } from '@/lib/api';

interface ProfileSkillsFormProps {
  profile: ArtistProfile;
  onProfileUpdate: (profile: ArtistProfile) => void;
}

export function ProfileSkillsForm({ profile, onProfileUpdate }: ProfileSkillsFormProps) {
  const [skills, setSkills] = useState<string[]>(profile.skills || []);
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addSkill = () => {
    const skill = newSkill.trim();
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const addInterest = () => {
    const interest = newInterest.trim();
    if (interest && !interests.includes(interest)) {
      setInterests([...interests, interest]);
      setNewInterest('');
    }
  };

  const removeInterest = (interestToRemove: string) => {
    setInterests(interests.filter(interest => interest !== interestToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  const hasChanges = () => {
    return JSON.stringify(skills.sort()) !== JSON.stringify((profile.skills || []).sort()) ||
           JSON.stringify(interests.sort()) !== JSON.stringify((profile.interests || []).sort());
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const request: UpdateProfileRequest = {
        skills,
        interests,
      };

      const updatedProfile = await profileApi.updateProfile(profile.id, request);
      onProfileUpdate(updatedProfile);
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update skills and interests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skills & Interests</CardTitle>
        <CardDescription>
          Add your technical skills, artistic techniques, and areas of interest to help match you with relevant opportunities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Skills Section */}
        <div>
          <Label className="text-base font-medium">Skills & Techniques</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Add specific skills, techniques, tools, or software you work with
          </p>
          
          <div className="flex space-x-2 mb-3">
            <Input
              placeholder="e.g., Oil painting, Photoshop, 3D modeling..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, addSkill)}
              className="flex-1"
            />
            <Button 
              type="button" 
              onClick={addSkill}
              disabled={!newSkill.trim()}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <Badge key={index} variant="secondary" className="text-sm">
                {skill}
                <button
                  onClick={() => removeSkill(skill)}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {skills.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No skills added yet</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Interests Section */}
        <div>
          <Label className="text-base font-medium">Interests & Focus Areas</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Add topics, themes, or areas of artistic interest that drive your work
          </p>
          
          <div className="flex space-x-2 mb-3">
            <Input
              placeholder="e.g., Environmental art, Identity politics, Urban landscapes..."
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, addInterest)}
              className="flex-1"
            />
            <Button 
              type="button" 
              onClick={addInterest}
              disabled={!newInterest.trim()}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {interests.map((interest, index) => (
              <Badge key={index} variant="outline" className="text-sm">
                {interest}
                <button
                  onClick={() => removeInterest(interest)}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {interests.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No interests added yet</p>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">Skills and interests updated successfully!</p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave}
            disabled={loading || !hasChanges()}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
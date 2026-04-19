import { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Lock, CheckCircle, Edit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { 
  getCategoryForActivity, 
  getColorForActivity, 
  getRequiredFieldsForActivity,
  isActivityProfileComplete 
} from '../data/activityHelpers';
import { hasRankSystem, getRanksForGame, getRankLabelForGame, getIdSystemForGame } from '../data/gameRanks';
import { supabase } from '../lib/supabase';

export function ActivityProfileManager() {
  const { user, supabaseUserId, updateUser } = useAuth();
  const navigate = useNavigate();
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  if (!user) {
    return null;
  }

  const selectedActivities = user.enabledActivities;
  const completedCount = selectedActivities.filter(activity => 
    isActivityProfileComplete(user.activityProfiles[activity], activity)
  ).length;

  // Find first incomplete activity to auto-expand
  const firstIncompleteActivity = selectedActivities.find(activity => 
    !isActivityProfileComplete(user.activityProfiles[activity], activity)
  );

  const handleSaveProfile = async (activity: string) => {
    const activityProfiles = {
      ...user.activityProfiles,
      [activity]: formData
    };

    // Update local state
    updateUser({ activityProfiles });
    
    // Save to Supabase
    if (supabaseUserId) {
      await supabase.from('profiles').upsert({
        id: supabaseUserId,
        activity_profiles: activityProfiles,
      });
    }
    
    setEditingActivity(null);
    setFormData({});
  };

  const handleStartEditing = (activity: string) => {
    setEditingActivity(activity);
    setFormData(user.activityProfiles[activity] || {});
  };

  const renderProfileForm = (activity: string) => {
    const category = getCategoryForActivity(activity);
    const color = getColorForActivity(activity);

    if (category === 'gaming') {
      const hasRanks = hasRankSystem(activity);
      const ranks = hasRanks ? getRanksForGame(activity) : null;
      const rankLabel = hasRanks ? getRankLabelForGame(activity) : '';
      const idSystem = getIdSystemForGame(activity);

      return (
        <div className="space-y-4">
          {/* Only show rank selection if game has a rank system */}
          {hasRanks && ranks && (
            <div>
              <Label>{rankLabel}</Label>
              <Select
                value={formData.skillRank || ''}
                onValueChange={(v) => setFormData({ ...formData, skillRank: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${rankLabel.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {ranks.map(rank => (
                    <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Play Style</Label>
            <Select
              value={formData.playStyle || ''}
              onValueChange={(v) => setFormData({ ...formData, playStyle: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="competitive">Competitive</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="chill">Chill/Fun</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{idSystem.label} (optional)</Label>
            <Input
              type="text"
              placeholder={idSystem.placeholder}
              value={formData.inGameId || ''}
              onChange={(e) => setFormData({ ...formData, inGameId: e.target.value })}
            />
          </div>

          <div>
            <Label>Mic Preference</Label>
            <Select
              value={formData.micPreference || ''}
              onValueChange={(v) => setFormData({ ...formData, micPreference: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="required">Mic Required</SelectItem>
                <SelectItem value="optional">Mic Optional</SelectItem>
                <SelectItem value="no-mic">No Mic Preferred</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => handleSaveProfile(activity)}
            disabled={
              (hasRanks && !formData.skillRank) || 
              !formData.playStyle || 
              !formData.micPreference
            }
            className="w-full"
            style={{ backgroundColor: color }}
          >
            Save Profile for {activity}
          </Button>
        </div>
      );
    }

    if (category === 'sports') {
      return (
        <div className="space-y-4">
          <div>
            <Label>Skill Level</Label>
            <Select
              value={formData.skillLevel || ''}
              onValueChange={(v) => setFormData({ ...formData, skillLevel: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Activity Vibe</Label>
            <Select
              value={formData.vibe || ''}
              onValueChange={(v) => setFormData({ ...formData, vibe: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vibe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="competitive">Competitive</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="just-for-fun">Just for Fun</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => handleSaveProfile(activity)}
            disabled={!formData.skillLevel || !formData.vibe}
            className="w-full"
            style={{ backgroundColor: color }}
          >
            Save Profile for {activity}
          </Button>
        </div>
      );
    }

    if (category === 'studying') {
      return (
        <div className="space-y-4">
          <div>
            <Label>Major</Label>
            <Input
              type="text"
              placeholder="e.g., Computer Science"
              value={formData.major || ''}
              onChange={(e) => setFormData({ ...formData, major: e.target.value })}
            />
          </div>

          <div>
            <Label>Study Environment Preference</Label>
            <Select
              value={formData.environment || ''}
              onValueChange={(v) => setFormData({ ...formData, environment: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="silent">Silent Study</SelectItem>
                <SelectItem value="quiet">Quiet/Minimal Talking</SelectItem>
                <SelectItem value="collaborative">Collaborative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => handleSaveProfile(activity)}
            disabled={!formData.major || !formData.environment}
            className="w-full"
            style={{ backgroundColor: color }}
          >
            Save Profile for {activity}
          </Button>
        </div>
      );
    }

    // For campusEvents and social, no required fields
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No additional profile information required for this activity.
        </p>
        <Button
          onClick={() => handleSaveProfile(activity)}
          className="w-full"
          style={{ backgroundColor: color }}
        >
          Enable {activity}
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="mb-2">Complete Activity Profiles</h1>
          <p className="text-muted-foreground">
            Set up your profile for each activity to start matching ({completedCount}/{selectedActivities.length} completed)
          </p>
        </div>

        {selectedActivities.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No activities selected yet</p>
            <Button onClick={() => navigate('/activity-selection')}>
              Select Activities
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {selectedActivities.map((activity) => {
              const color = getColorForActivity(activity);
              const isComplete = isActivityProfileComplete(user.activityProfiles[activity], activity);
              const isEditing = editingActivity === activity;
              const requiredFields = getRequiredFieldsForActivity(activity);
              
              // Show form if: currently editing OR (incomplete AND first incomplete AND not editing anything else)
              const shouldShowForm = isEditing || (!isComplete && activity === firstIncompleteActivity && !editingActivity);

              return (
                <Card key={activity} className="p-6 border-2" style={{ borderColor: color }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: color }} />
                      <div>
                        <h3 style={{ color }}>{activity}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {isComplete ? (
                            <Badge variant="outline" className="bg-green-500/10 border-green-500 text-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500 text-yellow-500">
                              <Lock className="h-3 w-3 mr-1" />
                              Setup Required
                            </Badge>
                          )}
                          {requiredFields.length === 0 && (
                            <span className="text-xs text-muted-foreground">No setup needed</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isComplete && !isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEditing(activity)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    
                    {!isComplete && !shouldShowForm && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEditing(activity)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Setup
                      </Button>
                    )}
                  </div>

                  {shouldShowForm ? (
                    <>
                      {renderProfileForm(activity)}
                      {isEditing && (
                        <Button
                          variant="ghost"
                          className="w-full mt-2"
                          onClick={() => {
                            setEditingActivity(null);
                            setFormData({});
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                      {!isComplete && requiredFields.length === 0 && (
                        <Button
                          variant="ghost"
                          className="w-full mt-2"
                          onClick={() => handleSaveProfile(activity)}
                        >
                          Skip (No setup required)
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Profile configured. Click Edit to make changes.
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center space-y-3">
          {completedCount > 0 && (
            <Button
              onClick={() => navigate('/activity-hub')}
              size="lg"
              className="px-12"
            >
              Go to Activity Hub
            </Button>
          )}
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
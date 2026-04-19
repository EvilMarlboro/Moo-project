import { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { User, Activity, Edit, Trash2, Plus, CheckCircle, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { AVATAR_OPTIONS } from '../data/avatarImages';
import { ACTIVITIES, CATEGORY_COLORS } from '../data/mockData';
import { getCategoryForActivity, getColorForActivity, isActivityProfileComplete, getActivitiesInCategory } from '../data/activityHelpers';

export function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // User profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedUsername, setEditedUsername] = useState(user?.username || '');
  const [editedAvatar, setEditedAvatar] = useState(
    AVATAR_OPTIONS.find(a => a.emoji === user?.avatar)?.id || 'avatar1'
  );

  // Activity management state
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      // Fallback navigation in case AuthNavigator doesn't trigger
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login', { replace: true });
    }
  };

  const handleSaveProfile = () => {
    const avatar = AVATAR_OPTIONS.find(a => a.id === editedAvatar);
    updateUser({
      username: editedUsername,
      avatar: avatar?.emoji || user.avatar
    });
    setIsEditingProfile(false);
  };

  const handleCancelEdit = () => {
    setEditedUsername(user.username);
    setEditedAvatar(AVATAR_OPTIONS.find(a => a.emoji === user.avatar)?.id || 'avatar1');
    setIsEditingProfile(false);
  };

  const handleRemoveActivity = (activity: string) => {
    const newActivities = user.enabledActivities.filter(a => a !== activity);
    const newProfiles = { ...user.activityProfiles };
    delete newProfiles[activity];
    
    updateUser({
      enabledActivities: newActivities,
      activityProfiles: newProfiles
    });
  };

  const handleAddActivities = () => {
    if (selectedActivities.length === 0) return;

    const newActivities = [...user.enabledActivities, ...selectedActivities];
    updateUser({ enabledActivities: newActivities });

    // Reset state
    setShowAddActivity(false);
    setSelectedCategory(null);
    setSelectedActivities([]);

    // Navigate to profile manager to set up new activities
    navigate('/activity-profile');
  };

  const toggleActivitySelection = (activity: string) => {
    setSelectedActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const currentAvatar = AVATAR_OPTIONS.find(a => a.id === editedAvatar);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile and activities
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="profile" className="flex-1">
              <User className="h-4 w-4 mr-2" />
              User Profile
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex-1">
              <Activity className="h-4 w-4 mr-2" />
              Activity Profiles
            </TabsTrigger>
          </TabsList>

          {/* User Profile Tab */}
          <TabsContent value="profile">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-6">
                <h3>User Profile</h3>
                {!isEditingProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingProfile(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                {/* Avatar Selection */}
                <div>
                  <Label className="mb-3 block">Avatar</Label>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-20 w-20 border-2 border-primary">
                      <AvatarFallback 
                        className="text-4xl"
                        style={{ backgroundColor: currentAvatar?.color + '20' }}
                      >
                        {currentAvatar?.emoji}
                      </AvatarFallback>
                    </Avatar>
                    {isEditingProfile && (
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Choose a new avatar below
                        </p>
                      </div>
                    )}
                  </div>

                  {isEditingProfile && (
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                      {AVATAR_OPTIONS.map(avatar => (
                        <button
                          key={avatar.id}
                          onClick={() => setEditedAvatar(avatar.id)}
                          className={`
                            aspect-square rounded-lg border-2 p-2 transition-all
                            hover:scale-105 flex flex-col items-center justify-center gap-1
                            ${editedAvatar === avatar.id 
                              ? 'border-primary bg-primary/10 shadow-lg' 
                              : 'border-border bg-secondary/50 hover:border-primary/50'
                            }
                          `}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback 
                              className="text-xl"
                              style={{ backgroundColor: avatar.color + '20' }}
                            >
                              {avatar.emoji}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Username */}
                <div>
                  <Label>Username</Label>
                  <Input
                    type="text"
                    value={isEditingProfile ? editedUsername : user.username}
                    onChange={(e) => setEditedUsername(e.target.value)}
                    disabled={!isEditingProfile}
                    className="mt-2"
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <Label>USC Email</Label>
                  <Input
                    type="email"
                    value={user.email}
                    disabled
                    className="mt-2"
                  />
                </div>

                {/* Save/Cancel Buttons */}
                {isEditingProfile && (
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSaveProfile} className="flex-1">
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Activity Profiles Tab */}
          <TabsContent value="activities">
            <div className="space-y-4">
              {/* Current Activities */}
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3>Your Activities</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {user.enabledActivities.length} {user.enabledActivities.length === 1 ? 'activity' : 'activities'} enabled
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowAddActivity(true)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Activity
                  </Button>
                </div>

                {user.enabledActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No activities enabled yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {user.enabledActivities.map(activity => {
                      const color = getColorForActivity(activity);
                      const isComplete = isActivityProfileComplete(user.activityProfiles[activity], activity);
                      
                      return (
                        <div
                          key={activity}
                          className="flex items-center justify-between p-3 rounded-lg border-2 bg-secondary/20"
                          style={{ borderColor: color }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: color }} />
                            <div>
                              <p className="font-medium" style={{ color }}>{activity}</p>
                              {isComplete ? (
                                <Badge variant="outline" className="bg-green-500/10 border-green-500 text-green-500 mt-1">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Profile Complete
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500 text-yellow-500 mt-1">
                                  Setup Incomplete
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate('/activity-profile')}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {isComplete ? 'Edit' : 'Complete'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveActivity(activity)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Add Activity Panel */}
              {showAddActivity && (
                <Card className="p-6 border-2 border-primary">
                  <div className="flex items-start justify-between mb-4">
                    <h3>Add New Activities</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddActivity(false);
                        setSelectedCategory(null);
                        setSelectedActivities([]);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {/* Step 1: Select Category */}
                    <div>
                      <Label className="mb-2 block">Step 1: Select a Category</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(CATEGORY_COLORS).map(([key, color]) => {
                          const categoryName = key === 'campusEvents' ? 'Campus Events' : 
                                               key === 'social' ? 'Social & Hangouts' :
                                               key.charAt(0).toUpperCase() + key.slice(1);
                          
                          return (
                            <Button
                              key={key}
                              variant={selectedCategory === key ? 'default' : 'outline'}
                              onClick={() => {
                                setSelectedCategory(key);
                                setSelectedActivities([]);
                              }}
                              style={selectedCategory === key ? { backgroundColor: color } : {}}
                            >
                              {categoryName}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 2: Select Activities */}
                    {selectedCategory && (
                      <div>
                        <Label className="mb-2 block">Step 2: Select Activities to Add</Label>
                        <div className="space-y-2">
                          {getActivitiesInCategory(selectedCategory as keyof typeof ACTIVITIES)
                            .filter(activity => !user.enabledActivities.includes(activity))
                            .map(activity => {
                              const color = CATEGORY_COLORS[selectedCategory as keyof typeof CATEGORY_COLORS];
                              const isSelected = selectedActivities.includes(activity);
                              
                              return (
                                <button
                                  key={activity}
                                  onClick={() => toggleActivitySelection(activity)}
                                  className={`
                                    w-full p-3 rounded-lg border-2 text-left transition-all
                                    ${isSelected 
                                      ? 'bg-primary/10 border-primary' 
                                      : 'border-border hover:border-primary/50'
                                    }
                                  `}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium" style={{ color }}>
                                      {activity}
                                    </span>
                                    {isSelected && (
                                      <CheckCircle className="h-5 w-5 text-primary" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          {getActivitiesInCategory(selectedCategory as keyof typeof ACTIVITIES)
                            .filter(activity => !user.enabledActivities.includes(activity)).length === 0 && (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                              All activities in this category are already enabled
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Add Button */}
                    {selectedActivities.length > 0 && (
                      <Button
                        onClick={handleAddActivities}
                        className="w-full"
                        style={{ backgroundColor: CATEGORY_COLORS[selectedCategory as keyof typeof CATEGORY_COLORS] }}
                      >
                        Add {selectedActivities.length} {selectedActivities.length === 1 ? 'Activity' : 'Activities'}
                      </Button>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Sign Out */}
        <Card className="p-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3>Sign Out</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sign out of your MOO account
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
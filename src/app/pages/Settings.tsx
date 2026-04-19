import { useState, useEffect, useRef } from 'react';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { User, Activity, Edit, Trash2, Plus, CheckCircle, X, LogOut, Upload, ImageIcon, BarChart2, Heart, Eye, Palette } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { AVATAR_OPTIONS } from '../data/avatarImages';
import { ACTIVITIES, CATEGORY_COLORS } from '../data/mockData';
import { getCategoryForActivity, getColorForActivity, isActivityProfileComplete, getActivitiesInCategory } from '../data/activityHelpers';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { PROFILE_BACKGROUNDS, BackgroundKey } from '../data/profileBackgrounds';
import { UserAvatar } from '../components/UserAvatar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const isUrl = (s: string) => s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:');

export function Settings() {
  const { user, loading, updateUser, logout, supabaseUserId } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats state
  const [weeklyMatchData, setWeeklyMatchData] = useState<{ day: string; matches: number }[]>([]);
  const [totalWeekMatches, setTotalWeekMatches] = useState(0);
  const [profileViewCount, setProfileViewCount] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) navigate('/');
  }, [user, navigate]);

  // User profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedUsername, setEditedUsername] = useState(user?.username || '');
  const [editedAvatar, setEditedAvatar] = useState(
    AVATAR_OPTIONS.find(a => a.emoji === user?.avatar)?.id || 'avatar1'
  );
  const [avatarMode, setAvatarMode] = useState<'emoji' | 'photo'>(
    user?.avatar && isUrl(user.avatar) ? 'photo' : 'emoji'
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(
    user?.avatar && isUrl(user.avatar) ? user.avatar : ''
  );
  const [savingPhoto, setSavingPhoto] = useState(false);

  // Background customization state
  const [selectedBackground, setSelectedBackground] = useState<BackgroundKey>(
    (user?.profileBackground as BackgroundKey) || 'default'
  );

  // Activity management state
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  useEffect(() => {
    if (activeTab !== 'stats' || !supabaseUserId) return;
    const fetchStats = async () => {
      setStatsLoading(true);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [matchResult, viewResult] = await Promise.all([
        supabase
          .from('match_requests')
          .select('created_at')
          .or(`sender_id.eq.${supabaseUserId},receiver_id.eq.${supabaseUserId}`)
          .eq('status', 'accepted')
          .gte('created_at', weekAgo.toISOString()),
        supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('viewed_id', supabaseUserId),
      ]);

      // Build 7-day graph data
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
      });
      const rows = matchResult.data || [];
      const graphData = days.map(day => ({
        day: day.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        matches: rows.filter(r => new Date(r.created_at).toDateString() === day.toDateString()).length,
      }));

      setWeeklyMatchData(graphData);
      setTotalWeekMatches(rows.length);
      setProfileViewCount(viewResult.count ?? 0);
      setStatsLoading(false);
    };
    fetchStats();
  }, [activeTab, supabaseUserId]);

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
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const handleSaveProfile = async () => {
    setSavingPhoto(true);
    try {
      let avatarValue = user.avatar;

      if (avatarMode === 'photo' && photoFile) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('Not authenticated');
        const ext = photoFile.name.split('.').pop();
        const path = `${authUser.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarValue = urlData.publicUrl;
      } else if (avatarMode === 'emoji') {
        const avatar = AVATAR_OPTIONS.find(a => a.id === editedAvatar);
        avatarValue = avatar?.emoji || user.avatar;
      }

      updateUser({ username: editedUsername, avatar: avatarValue });
      setPhotoFile(null);
      setIsEditingProfile(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedUsername(user.username);
    setEditedAvatar(AVATAR_OPTIONS.find(a => a.emoji === user.avatar)?.id || 'avatar1');
    setAvatarMode(user.avatar && isUrl(user.avatar) ? 'photo' : 'emoji');
    setPhotoFile(null);
    setPhotoPreview(user.avatar && isUrl(user.avatar) ? user.avatar : '');
    setIsEditingProfile(false);
  };

  const handleSelectBackground = (key: BackgroundKey) => {
    setSelectedBackground(key);
    updateUser({ profileBackground: key });
    toast.success(`Background set to ${PROFILE_BACKGROUNDS[key].label}`);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
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
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none select-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full bg-purple-400/12 blur-[90px]" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-pink-400/8 blur-[70px]" />
        <div className="absolute -bottom-24 left-1/3 w-[380px] h-[380px] rounded-full bg-amber-300/8 blur-[80px]" />
      </div>
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
            <TabsTrigger value="stats" className="flex-1">
              <BarChart2 className="h-4 w-4 mr-2" />
              Stats
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
                {/* Avatar Section */}
                <div>
                  <Label className="mb-3 block">Profile Picture</Label>
                  {/* Current avatar preview */}
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-20 w-20 border-2 border-primary">
                      {isUrl(user.avatar) ? (
                        <>
                          <AvatarImage src={user.avatar} alt={user.username} />
                          <AvatarFallback className="text-3xl">{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </>
                      ) : (
                        <AvatarFallback className="text-4xl" style={{ backgroundColor: currentAvatar?.color + '20' }}>
                          {user.avatar}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </div>

                  {isEditingProfile && (
                    <>
                      {/* Mode toggle */}
                      <div className="flex gap-2 mb-4">
                        <Button
                          type="button"
                          size="sm"
                          variant={avatarMode === 'emoji' ? 'default' : 'outline'}
                          onClick={() => setAvatarMode('emoji')}
                        >
                          😀 Choose Avatar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={avatarMode === 'photo' ? 'default' : 'outline'}
                          onClick={() => setAvatarMode('photo')}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Upload Photo
                        </Button>
                      </div>

                      {avatarMode === 'emoji' && (
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
                                <AvatarFallback className="text-xl" style={{ backgroundColor: avatar.color + '20' }}>
                                  {avatar.emoji}
                                </AvatarFallback>
                              </Avatar>
                            </button>
                          ))}
                        </div>
                      )}

                      {avatarMode === 'photo' && (
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoSelect}
                          />
                          {photoPreview ? (
                            <div className="flex items-center gap-4">
                              <img src={photoPreview} alt="Preview" className="h-20 w-20 rounded-full object-cover border-2 border-primary" />
                              <div className="flex gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                  Change
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => { setPhotoFile(null); setPhotoPreview(''); }} className="text-destructive">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="flex flex-col items-center gap-2 w-full py-8 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors"
                            >
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Click to upload a photo</span>
                            </button>
                          )}
                        </div>
                      )}
                    </>
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
                    <Button onClick={handleSaveProfile} disabled={savingPhoto} className="flex-1">
                      {savingPhoto ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit} disabled={savingPhoto} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Profile Card Background */}
            <Card className="p-6 mt-4">
              <div className="flex items-center gap-2 mb-5">
                <Palette className="h-5 w-5 text-purple-500" />
                <h3>Profile Card Background</h3>
              </div>

              <div className="flex gap-6 items-start">
                {/* Swatches grid */}
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-3">Choose a background for your profile card</p>
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.keys(PROFILE_BACKGROUNDS) as BackgroundKey[]).map(key => {
                      const bg = PROFILE_BACKGROUNDS[key];
                      const isSelected = selectedBackground === key;
                      return (
                        <button
                          key={key}
                          onClick={() => handleSelectBackground(key)}
                          className={`relative aspect-square rounded-xl border-2 transition-all hover:scale-105 overflow-hidden ${isSelected ? 'border-primary shadow-lg scale-105' : 'border-border'}`}
                          title={bg.label}
                        >
                          <div
                            className="absolute inset-0"
                            style={key === 'default' ? { backgroundColor: 'hsl(var(--card))' } : bg.style}
                          />
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow">
                                <CheckCircle className="h-3.5 w-3.5 text-primary" />
                              </div>
                            </div>
                          )}
                          <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-medium drop-shadow"
                            style={{ color: key === 'default' ? 'hsl(var(--foreground))' : 'white' }}>
                            {bg.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live preview */}
                <div className="w-40 flex-shrink-0">
                  <p className="text-sm text-muted-foreground mb-3 text-center">Preview</p>
                  {(() => {
                    const bg = PROFILE_BACKGROUNDS[selectedBackground];
                    const isWhite = bg.textColor === 'white';
                    return (
                      <div
                        className="rounded-xl border-2 border-border p-4 flex flex-col items-center text-center gap-2 shadow-md"
                        style={selectedBackground === 'default' ? {} : bg.style}
                      >
                        <UserAvatar
                          avatar={user.avatar}
                          username={user.username}
                          className="w-14 h-14 border-2 border-white/40"
                          fallbackClassName="text-2xl"
                        />
                        <div>
                          <p className={`text-sm font-semibold truncate max-w-[110px] drop-shadow-sm ${isWhite ? 'text-white' : ''}`}>
                            {user.username}
                          </p>
                          <p className={`text-xs drop-shadow-sm ${isWhite ? 'text-white/70' : 'text-muted-foreground'}`}>
                            USC Student
                          </p>
                        </div>
                        <div className={`text-xs px-2 py-0.5 rounded-full border ${isWhite ? 'border-white/30 text-white/80' : 'border-border text-muted-foreground'}`}>
                          {bg.label}
                        </div>
                      </div>
                    );
                  })()}
                </div>
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

          {/* Stats Tab */}
          <TabsContent value="stats">
            <div className="space-y-4">
              {statsLoading ? (
                <Card className="p-8 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
                </Card>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-5">
                      <div className="flex items-center gap-3 mb-1">
                        <Heart className="h-5 w-5 text-purple-600" />
                        <span className="text-sm text-muted-foreground">Matches this week</span>
                      </div>
                      <p className="text-3xl font-semibold text-purple-700">{totalWeekMatches}</p>
                    </Card>
                    <Card className="p-5">
                      <div className="flex items-center gap-3 mb-1">
                        <Eye className="h-5 w-5 text-purple-600" />
                        <span className="text-sm text-muted-foreground">Profile views</span>
                      </div>
                      <p className="text-3xl font-semibold text-purple-700">
                        {profileViewCount === null ? '—' : profileViewCount}
                      </p>
                    </Card>
                  </div>

                  {/* Line graph */}
                  <Card className="p-6">
                    <h3 className="mb-4">Matches — Past 7 Days</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={weeklyMatchData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid rgba(124,58,237,0.2)' }}
                          formatter={(value: number) => [value, 'Matches']}
                        />
                        <Line
                          type="monotone"
                          dataKey="matches"
                          stroke="#7C3AED"
                          strokeWidth={2.5}
                          dot={{ fill: '#7C3AED', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </>
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
import { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Lock, Users, CheckCircle, Check } from 'lucide-react';
import { ACTIVITIES, CATEGORY_COLORS } from '../data/mockData';
import { getActivitiesInCategory } from '../data/activityHelpers';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';

type Category = keyof typeof ACTIVITIES;

export function Discovery() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const categories: { key: Category; name: string }[] = [
    { key: 'gaming', name: 'Gaming' },
    { key: 'sports', name: 'Sports' },
    { key: 'studying', name: 'Studying' },
    { key: 'campusEvents', name: 'Campus Events' }
  ];

  const getActiveUsersForActivity = (activity: string) => {
    return 0; // Real count comes from presence
  };

  const isActivityEnabled = (activity: string) => {
    return user?.enabledActivities.includes(activity);
  };

  const isActivitySelected = (activity: string) => {
    return selectedActivities.includes(activity);
  };

  const handleToggleActivity = (activity: string) => {
    if (isActivityEnabled(activity)) return; // Can't select already enabled activities
    
    setSelectedActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const handleAddAllActivities = () => {
    if (selectedActivities.length === 0) return;
    
    // Add selected activities to user's enabled activities
    const currentActivities = user?.enabledActivities || [];
    const updatedActivities = [...currentActivities, ...selectedActivities];
    
    updateUser({ enabledActivities: updatedActivities });
    
    // Redirect to activity profile manager to complete profiles for all selected activities
    navigate('/activity-profile');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="mb-2">Explore Activities</h1>
            <p className="text-muted-foreground">
              Browse all available activities and see who's participating
            </p>
            {selectedActivities.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {selectedActivities.length} {selectedActivities.length === 1 ? 'activity' : 'activities'} selected
              </p>
            )}
          </div>
          
          {selectedActivities.length > 0 && (
            <Button
              onClick={handleAddAllActivities}
              size="lg"
              className="px-6"
            >
              <Check className="h-4 w-4 mr-2" />
              Add {selectedActivities.length} {selectedActivities.length === 1 ? 'Activity' : 'Activities'}
            </Button>
          )}
        </div>

        <div className="space-y-8">
          {categories.map(({ key, name }) => {
            const color = CATEGORY_COLORS[key];
            // Use helper to get flattened activities (handles gaming's nested structure)
            const activities = getActivitiesInCategory(key);

            return (
              <div key={key}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: color }} />
                  <h2 style={{ color }}>{name}</h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activities.map(activity => {
                    const isEnabled = isActivityEnabled(activity);
                    const isSelected = isActivitySelected(activity);
                    const activeUsers = getActiveUsersForActivity(activity);

                    return (
                      <Card
                        key={activity}
                        className={`p-4 border-2 transition-all ${
                          isEnabled 
                            ? 'hover:scale-[1.02] cursor-pointer' 
                            : isSelected
                            ? 'hover:scale-[1.02] cursor-pointer'
                            : 'hover:scale-[1.02] cursor-pointer opacity-80'
                        }`}
                        style={{ 
                          borderColor: isEnabled || isSelected ? color : '#26262C',
                          backgroundColor: isSelected ? `${color}15` : undefined
                        }}
                        onClick={() => !isEnabled && handleToggleActivity(activity)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="flex-1">{activity}</h4>
                          {isEnabled ? (
                            <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color }} />
                          ) : isSelected ? (
                            <div 
                              className="h-5 w-5 flex-shrink-0 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: color }}
                            >
                              <Check className="h-3 w-3 text-black" />
                            </div>
                          ) : (
                            <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {activeUsers} {activeUsers === 1 ? 'person' : 'people'} available
                          </span>
                        </div>

                        {isEnabled ? (
                          <Badge 
                            variant="outline" 
                            className="bg-green-500/10 border-green-500 text-green-500"
                          >
                            Enabled
                          </Badge>
                        ) : isSelected ? (
                          <Badge 
                            variant="outline" 
                            style={{ 
                              backgroundColor: `${color}20`,
                              borderColor: color,
                              color: color
                            }}
                          >
                            Selected
                          </Badge>
                        ) : null}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-card rounded-lg border border-border text-center">
          <h3 className="mb-2">Want to participate in more activities?</h3>
          <p className="text-muted-foreground mb-4">
            Complete activity profiles to unlock matching for locked activities
          </p>
          <Button onClick={() => navigate('/activity-profile')}>
            Manage Activity Profiles
          </Button>
        </div>
      </div>
    </div>
  );
}
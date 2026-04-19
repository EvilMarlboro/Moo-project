import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { CheckCircle } from 'lucide-react';
import { ACTIVITIES, CATEGORY_COLORS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type Category = keyof typeof ACTIVITIES;

export function ActivitySelection() {
  const navigate = useNavigate();
  const { user, supabaseUserId, updateUser } = useAuth();
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  // Initialize with user's existing activities
  useEffect(() => {
    if (user?.enabledActivities && user.enabledActivities.length > 0) {
      setSelectedActivities(user.enabledActivities);
    }
  }, [user?.enabledActivities]);

  // Get the selected categories from user context
  const selectedCategories = (user?.selectedCategories || []) as Category[];

  const handleToggleActivity = (activity: string) => {
    setSelectedActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const handleContinue = async () => {
    // Update local state
    updateUser({ enabledActivities: selectedActivities });

    // Save to Supabase
    if (supabaseUserId) {
      await supabase.from('profiles').upsert({
        id: supabaseUserId,
        enabled_activities: selectedActivities,
      });
    }

    navigate('/activity-profile');
  };

  // Filter categories based on what was selected in category-selection
  const allCategories: { key: Category; name: string }[] = [
    { key: 'gaming', name: 'Gaming' },
    { key: 'sports', name: 'Sports' },
    { key: 'studying', name: 'Studying' },
    { key: 'campusEvents', name: 'Campus Events' }
  ];

  // Show categories that were selected, or all if none selected
  const categories = selectedCategories.length > 0
    ? allCategories.filter(cat => selectedCategories.includes(cat.key))
    : allCategories;

  const renderActivities = (categoryKey: Category) => {
    const activities = ACTIVITIES[categoryKey];

    // Gaming has subcategories
    if (categoryKey === 'gaming' && typeof activities === 'object' && !Array.isArray(activities)) {
      return (
        <div className="space-y-6">
          {Object.entries(activities).map(([gameType, games]) => (
            <div key={gameType}>
              {/* Non-clickable game type subtitle */}
              <h4 className="mb-3 text-muted-foreground font-medium">{gameType}</h4>
              
              {/* Individual games grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(games as string[]).map(game => {
                  const isSelected = selectedActivities.includes(game);
                  return (
                    <button
                      key={game}
                      onClick={() => handleToggleActivity(game)}
                      className={`
                        p-4 rounded-lg border-2 text-left transition-all
                        flex items-start gap-3 hover:scale-[1.02]
                        ${isSelected 
                          ? 'bg-secondary border-current' 
                          : 'border-border bg-secondary/30 hover:border-current/50'
                        }
                      `}
                      style={isSelected ? { borderColor: CATEGORY_COLORS[categoryKey] } : {}}
                    >
                      <div className="pt-0.5">
                        {isSelected ? (
                          <CheckCircle className="h-5 w-5" style={{ color: CATEGORY_COLORS[categoryKey] }} />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-border" />
                        )}
                      </div>
                      <span className="flex-1">{game}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Other categories have flat lists
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(activities as string[]).map(activity => {
          const isSelected = selectedActivities.includes(activity);
          return (
            <button
              key={activity}
              onClick={() => handleToggleActivity(activity)}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                flex items-start gap-3 hover:scale-[1.02]
                ${isSelected 
                  ? 'bg-secondary border-current' 
                  : 'border-border bg-secondary/30 hover:border-current/50'
                }
              `}
              style={isSelected ? { borderColor: CATEGORY_COLORS[categoryKey] } : {}}
            >
              <div className="pt-0.5">
                {isSelected ? (
                  <CheckCircle className="h-5 w-5" style={{ color: CATEGORY_COLORS[categoryKey] }} />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-border" />
                )}
              </div>
              <span className="flex-1">{activity}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 py-12">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="mb-2">Select Your Activities</h1>
          <p className="text-muted-foreground">
            Choose specific activities you're interested in. You can change these later.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Selected: {selectedActivities.length} activities
          </p>
        </div>

        <div className="space-y-6 mb-8">
          {categories.map(({ key, name }) => (
            <Card key={key} className="p-6 bg-card border-2" style={{ borderColor: CATEGORY_COLORS[key] }}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-1 h-8 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[key] }}
                />
                <h2 style={{ color: CATEGORY_COLORS[key] }}>{name}</h2>
              </div>

              {renderActivities(key)}
            </Card>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            size="lg"
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={selectedActivities.length === 0}
            size="lg"
            className="px-12"
          >
            Continue to Profile Setup
          </Button>
        </div>
      </div>
    </div>
  );
}
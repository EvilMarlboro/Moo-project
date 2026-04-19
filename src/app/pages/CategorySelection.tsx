import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { CheckCircle } from 'lucide-react';
import { CATEGORY_COLORS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

type MainCategory = 'gaming' | 'sports' | 'studying' | 'campusEvents';

const MAIN_CATEGORIES: { key: MainCategory; name: string; description: string }[] = [
  { 
    key: 'gaming', 
    name: 'Gaming', 
    description: 'Find teammates for competitive and casual gaming sessions'
  },
  { 
    key: 'sports', 
    name: 'Sports', 
    description: 'Connect with others for pickup games and athletic activities'
  },
  { 
    key: 'studying', 
    name: 'Studying', 
    description: 'Study with fellow students in libraries, cafes, or quiet spaces'
  },
  { 
    key: 'campusEvents', 
    name: 'Campus Events', 
    description: 'Join others for campus events, clubs, and social activities'
  }
];

export function CategorySelection() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<MainCategory[]>([]);

  const handleToggleCategory = (category: MainCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleContinue = () => {
    // Store selected categories in user context if needed
    updateUser({ selectedCategories });
    navigate('/activity-selection');
  };

  const handleVibing = () => {
    // Set user to vibing mode and skip to hub
    updateUser({ 
      selectedCategories: [],
      enabledActivities: [],
      vibingMode: true 
    });
    navigate('/activity-hub');
  };

  return (
    <div className="min-h-screen p-4 py-12">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="mb-3 text-5xl font-bold text-[#9333EA]" style={{ fontFamily: "'Lotus Bold', sans-serif" }}>
            What brings you here?
          </h1>
          <p className="text-muted-foreground text-lg">
            Select the main categories you're interested in
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Selected: {selectedCategories.length} categories
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {MAIN_CATEGORIES.map(({ key, name, description }) => {
            const isSelected = selectedCategories.includes(key);
            const color = CATEGORY_COLORS[key];
            
            return (
              <Card
                key={key}
                onClick={() => handleToggleCategory(key)}
                className={`
                  p-6 cursor-pointer transition-all hover:scale-[1.02] border-2
                  ${isSelected ? 'bg-secondary' : 'bg-secondary/90'}
                `}
                style={isSelected ? { borderColor: color } : {}}
              >
                <div className="flex items-start gap-4">
                  <div className="pt-1">
                    {isSelected ? (
                      <CheckCircle className="h-6 w-6" style={{ color }} />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-border" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-1 h-6 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <h3 style={{ color }}>{name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Vibing Mode Option */}
        <div className="mb-8">
          <Card className="p-6 bg-secondary/80 border-2 border-dashed border-border/50">
            <div className="text-center">
              <h3 className="mb-2">Not sure yet? Just Vibing? 🎵</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Skip activity selection and explore the hub freely. You'll be marked as "Vibing" and can browse all activities without committing to any specific ones.
              </p>
              <Button
                onClick={handleVibing}
                variant="outline"
                size="lg"
                className="px-8"
              >
                Start Vibing
              </Button>
            </div>
          </Card>
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
            disabled={selectedCategories.length === 0}
            size="lg"
            className="px-12"
          >
            Continue to Activity Selection
          </Button>
        </div>
      </div>
    </div>
  );
}
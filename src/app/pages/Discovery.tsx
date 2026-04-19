import { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Lock, CheckCircle, Check } from 'lucide-react';
import { ACTIVITIES, CATEGORY_COLORS } from '../data/mockData';
import { getActivitiesInCategory } from '../data/activityHelpers';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';

const CATEGORY_EMOJI: Record<string, string> = {
  gaming: '🎮', sports: '⚽', studying: '📚', campusEvents: '🎉',
};

const ACTIVITY_IMAGES: Record<string, string> = {
  // Sports
  'Basketball': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400',
  'Soccer': 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400',
  'Volleyball': 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400',
  'Tennis / Pickleball': 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400',
  'Gym Buddy': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
  'Running / Jogging': 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400',
  'Hiking / Outdoor Recreation': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400',
  // Studying
  'Study Together': 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400',
  'Library Buddy': 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400',
  'Coffee Shop Study': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400',
  'Silent Study': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400',
  'Late Night Study': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400',
  // Campus Events
  'Club Events': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400',
  'Movie Nights': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
  'Performances': 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
  'Social Mixers': 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400',
  'Trivia / Karaoke': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400',
  'Watch Parties': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
  // Gaming — FPS / Tactical Shooters
  'Valorant': 'https://media.rawg.io/media/games/b11/b11127b9ee3c3701bd15b9af3286d20e.jpg',
  'Apex Legends': 'https://media.rawg.io/media/games/737/737ea5662211d2e0bbd6f5989189e4f1.jpg',
  'Overwatch 2': 'https://media.rawg.io/media/games/95a/95a10817d1fc648cff1153f3fa8ef6c5.jpg',
  'Call of Duty: Warzone': 'https://media.rawg.io/media/games/7e3/7e327a055bedb9b6d1be86593bef473d.jpg',
  'Counter-Strike 2': 'https://media.rawg.io/media/games/ec4/ec4b02bdb3eb5c6212992c19bc05697e.jpg',
  'Rainbow Six Siege': 'https://media.rawg.io/media/games/b34/b3419c2706f8f8dbe40d08e23642ad06.jpg',
  'The Finals': 'https://media.rawg.io/media/games/fa2/fa28280bb6f7bec50b94bc821d412795.jpg',
  // Gaming — MOBA / Strategy
  'League of Legends': 'https://media.rawg.io/media/games/78b/78bc81e247fc7e77af700cbd632a9297.jpg',
  'Dota 2': 'https://media.rawg.io/media/games/6fc/6fcf4cd3b17c288821388e6085bb0fc9.jpg',
  'Smite': 'https://media.rawg.io/media/games/cc7/cc77035eb972f179f5090ee2a0fabd99.jpg',
  // Gaming — Auto Battler / Strategy Casual
  'Teamfight Tactics': 'https://media.rawg.io/media/games/f4f/f4fe38e8fc3948fe5c682554dee39248.jpg',
  'Hearthstone Battlegrounds': 'https://media.rawg.io/media/games/1db/1dbc3d0c9de2709e21326cdcb91468ae.jpg',
  'Auto Chess': 'https://media.rawg.io/media/games/86c/86c4cfd81576dba6f0d2ee2d7a8dd97f.jpg',
  // Gaming — Co-Op Survival / Sandbox
  'Minecraft': 'https://media.rawg.io/media/games/b4e/b4e4c73d5aa4ec66bbf75375c4847a2b.jpg',
  'Valheim': 'https://media.rawg.io/media/games/adb/adb59be81367b19c2544457424bcf086.jpg',
  'ARK: Survival Ascended': 'https://media.rawg.io/media/screenshots/c12/c122154db00ae6e3701c1520aec516f6.jpg',
  'Sons of the Forest': 'https://media.rawg.io/media/games/7a0/7a092fa63811a7f6ed90f456a8887e91.jpg',
  'Palworld': 'https://media.rawg.io/media/games/4e9/4e9c951414c732923fa72d5b1da49402.jpg',
  // Gaming — Party / Social Casual Multiplayer
  'Jackbox Party Packs': 'https://media.rawg.io/media/games/137/137544a823a3b16a226878a9e5506c0c.jpg',
  'Among Us': 'https://media.rawg.io/media/games/e74/e74458058b35e01c1ae3feeb39a3f724.jpg',
  'Fall Guys': 'https://media.rawg.io/media/games/5eb/5eb49eb2fa0738fdb5bacea557b1bc57.jpg',
  'Party Animals': 'https://media.rawg.io/media/games/b66/b6601abafd9fa58ff7453808ca3581c2.jpg',
  'Goose Goose Duck': 'https://media.rawg.io/media/screenshots/983/98330a21cccd92d900d7b97b81e6db9e.jpg',
  // Gaming — Sports / Simulation Multiplayer
  'EA Sports FC (FIFA)': 'https://media.rawg.io/media/games/104/10404407d458d90f4559a1f587c2650a.jpg',
  'NBA 2K': 'https://media.rawg.io/media/games/92c/92ce114f47867d4e6538df92bb9f5097.jpg',
  'Rocket League': 'https://media.rawg.io/media/games/8cc/8cce7c0e99dcc43d66c8efd42f9d03e3.jpg',
  'Madden NFL': 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400',
  // Gaming — MMO / Persistent World
  'World of Warcraft': 'https://media.rawg.io/media/games/0d9/0d930ea604ee240c5af30c58f73ddf48.jpg',
  'Final Fantasy XIV': 'https://media.rawg.io/media/screenshots/8f7/8f73b974f60a58362532440e9183188c.jpg',
  'Elder Scrolls Online': 'https://media.rawg.io/media/games/8fd/8fdc7843cffc863950cf5f859ea73aa4.jpg',
  'Destiny 2': 'https://media.rawg.io/media/games/34b/34b1f1850a1c06fd971bc6ab3ac0ce0e.jpg',
  // Gaming — Extraction / Tactical Survival
  'Escape from Tarkov': 'https://media.rawg.io/media/games/a9a/a9ab53644b92698b18957a362c99b4e2.jpg',
  'Dark and Darker': 'https://media.rawg.io/media/screenshots/e72/e722d462113f4e595426e92c322b5012.jpg',
  'Hunt: Showdown': 'https://media.rawg.io/media/games/929/929a78693f607a3332ecb89fe7ffaf06.jpg',
};

type Category = keyof typeof ACTIVITIES;

export function Discovery() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const getActivityImage = (activity: string) => ACTIVITY_IMAGES[activity] || '';

  const categories: { key: Category; name: string }[] = [
    { key: 'gaming', name: 'Gaming' },
    { key: 'sports', name: 'Sports' },
    { key: 'studying', name: 'Studying' },
    { key: 'campusEvents', name: 'Campus Events' }
  ];

  const isActivityEnabled = (activity: string) =>
    user?.enabledActivities.includes(activity);

  const isActivitySelected = (activity: string) =>
    selectedActivities.includes(activity);

  const handleToggleActivity = (activity: string) => {
    if (isActivityEnabled(activity)) return;
    setSelectedActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const handleAddAllActivities = () => {
    if (selectedActivities.length === 0) return;
    const currentActivities = user?.enabledActivities || [];
    updateUser({ enabledActivities: [...currentActivities, ...selectedActivities] });
    navigate('/activity-profile');
  };

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none select-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-purple-400/15 blur-[90px]" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-amber-300/12 blur-[80px]" />
        <div className="absolute -bottom-24 left-1/3 w-[380px] h-[380px] rounded-full bg-green-300/10 blur-[80px]" />
      </div>
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
            <Button onClick={handleAddAllActivities} size="lg" className="px-6">
              <Check className="h-4 w-4 mr-2" />
              Add {selectedActivities.length} {selectedActivities.length === 1 ? 'Activity' : 'Activities'}
            </Button>
          )}
        </div>

        <div className="space-y-8">
          {categories.map(({ key, name }) => {
            const color = CATEGORY_COLORS[key];
            const activities = getActivitiesInCategory(key);

            return (
              <div key={key}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{CATEGORY_EMOJI[key]}</span>
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: color }} />
                  <h2 style={{ color }}>{name}</h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activities.map(activity => {
                    const isEnabled = isActivityEnabled(activity);
                    const isSelected = isActivitySelected(activity);
                    const imageUrl = getActivityImage(activity);

                    return (
                      <Card
                        key={activity}
                        className="relative min-h-[140px] border-2 overflow-hidden transition-all hover:scale-[1.02] cursor-pointer"
                        style={{
                          borderColor: isEnabled || isSelected ? color : '#26262C',
                          backgroundImage: imageUrl
                            ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url(${imageUrl})`
                            : `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6))`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                        onClick={() => !isEnabled && handleToggleActivity(activity)}
                      >
                        <div className="absolute inset-0 p-4 flex flex-col justify-between">
                          {/* Top row: badge left, icon right */}
                          <div className="flex items-start justify-between">
                            <div>
                              {isEnabled && (
                                <Badge variant="outline" className="bg-green-500/20 border-green-400 text-green-400 text-xs">
                                  Enabled
                                </Badge>
                              )}
                              {isSelected && (
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    backgroundColor: `${color}30`,
                                    borderColor: color,
                                    color,
                                  }}
                                >
                                  Selected
                                </Badge>
                              )}
                            </div>
                            {isEnabled ? (
                              <CheckCircle className="h-5 w-5 flex-shrink-0 drop-shadow" style={{ color }} />
                            ) : isSelected ? (
                              <div
                                className="h-5 w-5 flex-shrink-0 rounded-full flex items-center justify-center drop-shadow"
                                style={{ backgroundColor: color }}
                              >
                                <Check className="h-3 w-3 text-black" />
                              </div>
                            ) : (
                              <Lock className="h-5 w-5 text-white/60 flex-shrink-0 drop-shadow" />
                            )}
                          </div>

                          {/* Bottom: activity name */}
                          <h4 className="text-white font-bold drop-shadow leading-tight">{activity}</h4>
                        </div>
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

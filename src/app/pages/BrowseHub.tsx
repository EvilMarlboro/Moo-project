import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Users, Shield, MessageCircle, UserPlus } from 'lucide-react';
import { CATEGORY_COLORS } from '../data/mockData';
import { useNavigate } from 'react-router';
import { Category, getCategoryForActivity } from '../data/activityHelpers';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface OnlineUser {
  user_id: string;
  email: string;
  username: string;
  avatar: string;
  genderSymbol?: string;
  activities: string[];
  statusMessage?: string;
  vibingMode?: boolean;
  categories: string[];
  online_at: string;
}

export function BrowseHub() {
  const { user, supabaseUserId } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users to activity hub
  useEffect(() => {
    if (user && supabaseUserId) {
      navigate('/activity-hub', { replace: true });
    }
  }, [user, supabaseUserId, navigate]);

  const [activeCategory, setActiveCategory] = useState<Category>('sports');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loadingPresence, setLoadingPresence] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const allCategories: Category[] = ['sports', 'gaming', 'studying', 'campusEvents'];

  // Subscribe to Supabase Realtime Presence (view only for unauthenticated users)
  useEffect(() => {
    const channel = supabase.channel('online-users');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as unknown as OnlineUser[];
        setOnlineUsers(users);
        setLoadingPresence(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter out self and filter by category
  const otherUsers = onlineUsers.filter((u) => u.user_id !== supabaseUserId);
  const filteredUsers = otherUsers.filter((u) => {
    if (u.vibingMode) return true; // vibing users show in all categories
    return (u.categories || []).includes(activeCategory);
  });

  const onlineCount = otherUsers.length;

  return (
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeIn' }}
    >
      <Navbar />

      <motion.div
        className="container mx-auto px-4 py-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
      >
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="mb-3">Browse Active Students</h1>
          <p className="text-muted-foreground text-lg mb-4">
            See who's looking to connect right now
          </p>
          <div className="flex items-center justify-center gap-2 mb-6">
            {onlineCount > 0 ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  {onlineCount} {onlineCount === 1 ? 'student' : 'students'} online
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">0 students online</span>
            )}
          </div>
          {!user && (
            <Button
              onClick={() => navigate('/login')}
              size="lg"
              className="bg-[#990000] hover:bg-[#7a0000] text-white px-12"
            >
              Sign In with USC to Connect
            </Button>
          )}
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as Category)}>
          <div className="flex justify-center mb-6">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              {allCategories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="capitalize transition-all duration-300"
                  style={
                    activeCategory === category
                      ? {
                          backgroundColor: CATEGORY_COLORS[category],
                          color: 'white',
                        }
                      : {}
                  }
                >
                  {category === 'campusEvents' ? 'Campus Events' : category}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Users Grid */}
          {allCategories.map((category) => (
            <TabsContent key={category} value={category} className="mt-6">
              <AnimatePresence mode="wait">
                {activeCategory === category && (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {filteredUsers.length}{' '}
                          {filteredUsers.length === 1 ? 'person' : 'people'} in{' '}
                          {category === 'campusEvents' ? 'Campus Events' : category}
                        </span>
                      </div>
                    </div>

                    {filteredUsers.length > 0 ? (
                      <motion.div
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                      >
                        {filteredUsers.map((presenceUser, index) => {
                          const categoryColor = CATEGORY_COLORS[activeCategory];
                          // Filter activities to only those in the current category
                          const categoryActivities = (presenceUser.activities || []).filter(
                            (a) => getCategoryForActivity(a) === activeCategory
                          );
                          const displayActivities = presenceUser.vibingMode
                            ? []
                            : categoryActivities.length > 0
                            ? categoryActivities
                            : presenceUser.activities || [];

                          return (
                            <motion.div
                              key={presenceUser.user_id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                              <Card
                                className="p-4 bg-gradient-to-br from-white to-purple-50 border-2 hover:scale-[1.02] transition-all hover:shadow-xl"
                                style={{
                                  borderColor: categoryColor,
                                  boxShadow: `0 4px 20px ${categoryColor}20`,
                                }}
                              >
                                <div className="flex items-start gap-4">
                                  {/* Avatar */}
                                  <div className="relative">
                                    <Avatar
                                      className="w-16 h-16 border-2"
                                      style={{ borderColor: categoryColor }}
                                    >
                                      <AvatarFallback
                                        className="text-3xl"
                                        style={{ backgroundColor: categoryColor + '20' }}
                                      >
                                        {presenceUser.avatar || '👤'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-card" />
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="truncate">
                                        {presenceUser.username}
                                      </h3>
                                      {presenceUser.genderSymbol && (
                                        <span
                                          className="text-lg flex-shrink-0"
                                          style={{
                                            color:
                                              presenceUser.genderSymbol === '♂'
                                                ? '#3B82F6'
                                                : presenceUser.genderSymbol === '♀'
                                                ? '#EC4899'
                                                : categoryColor,
                                          }}
                                        >
                                          {presenceUser.genderSymbol}
                                        </span>
                                      )}
                                      <Shield className="h-4 w-4 text-[#990000] flex-shrink-0" />
                                    </div>

                                    {/* Activities */}
                                    <div className="mb-2">
                                      <div className="flex flex-wrap gap-1 items-center">
                                        {presenceUser.vibingMode ? (
                                          <span className="flex items-center gap-1.5">
                                            <span
                                              className="text-sm font-medium"
                                              style={{ color: categoryColor }}
                                            >
                                              🎵 Vibing
                                            </span>
                                            <span className="text-xs text-muted-foreground italic">
                                              (looking for something to do)
                                            </span>
                                          </span>
                                        ) : (
                                          displayActivities.slice(0, 2).map((activity, i) => (
                                            <span key={i}>
                                              <span
                                                className="font-medium text-sm"
                                                style={{ color: categoryColor }}
                                              >
                                                {activity}
                                              </span>
                                              {i <
                                                Math.min(displayActivities.length - 1, 1) && (
                                                <span className="text-muted-foreground mx-1">
                                                  •
                                                </span>
                                              )}
                                            </span>
                                          ))
                                        )}
                                        {!presenceUser.vibingMode &&
                                          displayActivities.length > 2 && (
                                            <Badge variant="secondary" className="text-xs">
                                              +{displayActivities.length - 2}
                                            </Badge>
                                          )}
                                      </div>
                                    </div>

                                    {/* Status Message */}
                                    {presenceUser.statusMessage && (
                                      <p className="text-sm text-muted-foreground mb-3 italic line-clamp-2">
                                        "{presenceUser.statusMessage}"
                                      </p>
                                    )}

                                    {/* Action Button */}
                                    {user ? (
                                      <Button
                                        onClick={async () => {
                                          const { data: { user: authUser } } = await supabase.auth.getUser();
                                          if (!authUser) return;

                                          // Check if request already exists
                                          const { data: existing } = await supabase
                                            .from('match_requests')
                                            .select('id, status')
                                            .eq('sender_id', authUser.id)
                                            .eq('receiver_id', presenceUser.user_id)
                                            .maybeSingle();

                                          if (existing) {
                                            if (existing.status === 'pending') {
                                              toast.info('Request already sent!');
                                            } else if (existing.status === 'accepted') {
                                              toast.success('You are already connected!');
                                            }
                                            setSentRequests(prev => new Set(prev).add(presenceUser.user_id));
                                            return;
                                          }

                                          const { error } = await supabase
                                            .from('match_requests')
                                            .insert({
                                              sender_id: authUser.id,
                                              receiver_id: presenceUser.user_id,
                                              activity: presenceUser.activities?.[0] || activeCategory,
                                              status: 'pending'
                                            });
                                          if (error) {
                                            toast.error('Error: ' + error.message);
                                          } else {
                                            setSentRequests(prev => new Set(prev).add(presenceUser.user_id));
                                            toast.success('Request sent! ✓');
                                          }
                                        }}
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                        style={{
                                          borderColor: categoryColor,
                                          color: categoryColor,
                                        }}
                                        disabled={sentRequests.has(presenceUser.user_id)}
                                      >
                                        <MessageCircle className="h-4 w-4 mr-1" />
                                        {sentRequests.has(presenceUser.user_id) ? 'Request Sent ✓' : 'Connect'}
                                      </Button>
                                    ) : (
                                      <Button
                                        onClick={() => navigate('/login')}
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                        style={{
                                          borderColor: categoryColor,
                                          color: categoryColor,
                                        }}
                                      >
                                        Log in to Connect
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    ) : (
                      <motion.div
                        className="text-center py-16"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="mb-2">No students online right now</h3>
                        <p className="text-muted-foreground mb-6">
                          Be the first to connect! Sign in and start an activity.
                        </p>
                        {!user && (
                          <Button
                            onClick={() => navigate('/login')}
                            className="bg-[#990000] hover:bg-[#7a0000] text-white"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Sign In with USC to Connect
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
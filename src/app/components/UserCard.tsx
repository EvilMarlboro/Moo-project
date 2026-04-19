import { Shield, MessageCircle, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ActiveUser, CATEGORY_COLORS } from '../data/mockData';
import { useNavigate } from 'react-router';
import { useMatches } from '../context/MatchContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useState } from 'react';

interface UserCardProps {
  user: ActiveUser;
  onUnauthenticatedAction?: () => void;
}

// Helper function to extract displayable tags from activity profiles
function getProfileTags(user: ActiveUser): Array<{ activity: string; tags: string[] }> {
  const activityTags: Array<{ activity: string; tags: string[] }> = [];
  
  if (!user.activityProfiles) return activityTags;
  
  // Get profile data for each user's activity
  user.activities.forEach(activity => {
    const profile = user.activityProfiles?.[activity];
    if (!profile) return;
    
    const tags: string[] = [];
    
    // Add relevant fields based on what exists in the profile
    if (profile.skillRank) tags.push(profile.skillRank);
    if (profile.skillLevel) tags.push(profile.skillLevel);
    if (profile.playStyle) tags.push(profile.playStyle);
    if (profile.micPreference) tags.push(`Mic: ${profile.micPreference}`);
    if (profile.vibe) tags.push(profile.vibe);
    if (profile.major) tags.push(profile.major);
    if (profile.environment) tags.push(profile.environment);
    
    // Only add if there are tags for this activity
    if (tags.length > 0) {
      activityTags.push({ activity, tags });
    }
  });
  
  return activityTags;
}

export function UserCard({ user, onUnauthenticatedAction }: UserCardProps) {
  const navigate = useNavigate();
  const { isMatched, addMatch } = useMatches();
  const { user: currentUser } = useAuth();
  const categoryColor = CATEGORY_COLORS[user.category];
  const matched = isMatched(user.id);
  const [requestSent, setRequestSent] = useState(false);

  const handleMatch = async () => {
    if (!currentUser) {
      // User is not authenticated, trigger login prompt
      onUnauthenticatedAction?.();
      return;
    }
    
    if (matched || requestSent) {
      return;
    }

    // Get authenticated user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      toast.error('Please log in to send a match request');
      return;
    }

    // Check if request already exists
    const { data: existing } = await supabase
      .from('match_requests')
      .select('id, status')
      .eq('sender_id', authUser.id)
      .eq('receiver_id', user.id)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') {
        toast.info('Request already sent to this user');
        setRequestSent(true);
      } else if (existing.status === 'accepted') {
        toast.info('You already matched with this user');
      }
      return;
    }

    // Create match request in Supabase
    const { error } = await supabase
      .from('match_requests')
      .insert({
        sender_id: authUser.id,
        receiver_id: user.id,
        activity: user.activities[0] || '',
        status: 'pending'
      });

    if (error) {
      console.error('Error creating match request:', error);
      toast.error('Failed to send match request');
      return;
    }

    setRequestSent(true);
    toast.success('Match request sent! ✓');
  };

  const handleChat = async () => {
    if (!currentUser) {
      onUnauthenticatedAction?.();
      return;
    }
    
    if (!matched) {
      return;
    }

    // Get authenticated user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    // Find the chat with this user
    const { data: chat } = await supabase
      .from('chats')
      .select('id')
      .or(`and(user1_id.eq.${authUser.id},user2_id.eq.${user.id}),and(user1_id.eq.${user.id},user2_id.eq.${authUser.id})`)
      .maybeSingle();

    if (chat) {
      navigate(`/chat/${chat.id}`);
    } else {
      toast.error('Chat not found');
    }
  };

  return (
    <Card 
      className="p-4 bg-gradient-to-br from-white to-purple-50 border-2 hover:scale-[1.02] transition-all hover:shadow-xl"
      style={{ borderColor: categoryColor, boxShadow: `0 4px 20px ${categoryColor}20` }}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="w-16 h-16 border-2" style={{ borderColor: categoryColor }}>
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <AvatarFallback className="text-3xl" style={{ backgroundColor: categoryColor + '20' }}>
                {user.avatar}
              </AvatarFallback>
            )}
          </Avatar>
          {user.online && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-card" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="truncate">{user.username}</h3>
            {user.genderSymbol && (
              <span 
                className="text-lg flex-shrink-0" 
                style={{ 
                  color: user.genderSymbol === '♂' ? '#3B82F6' : user.genderSymbol === '♀' ? '#EC4899' : categoryColor 
                }}
              >
                {user.genderSymbol}
              </span>
            )}
            {user.verified && (
              <Shield className="h-4 w-4 text-[#990000] flex-shrink-0" />
            )}
          </div>

          {/* Activities */}
          <div className="mb-2">
            <div className="flex flex-wrap gap-1 items-center">
              {user.vibingMode ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-medium" style={{ color: categoryColor }}>
                    🎵 Vibing
                  </span>
                  <span className="text-xs text-muted-foreground italic">
                    (looking for something to do)
                  </span>
                </span>
              ) : (
                user.activities.map((activity, index) => (
                  <span key={index}>
                    <span className="font-medium text-sm" style={{ color: categoryColor }}>
                      {activity}
                    </span>
                    {index < user.activities.length - 1 && (
                      <span className="text-muted-foreground mx-1">•</span>
                    )}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Profile Tags */}
          {getProfileTags(user).length > 0 && (
            <div className="mb-2 space-y-1.5">
              {getProfileTags(user).map(({ activity, tags }, index) => (
                <div key={index} className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs font-medium" style={{ color: categoryColor }}>
                    {activity}:
                  </span>
                  {tags.map((tag, tagIndex) => (
                    <Badge 
                      key={tagIndex} 
                      variant="secondary"
                      className="text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Status Message */}
          {user.customDetail && (
            <p className="text-sm text-muted-foreground mb-3 italic">
              "{user.customDetail}"
            </p>
          )}

          {/* Action Button */}
          {matched ? (
            <Button
              onClick={handleChat}
              size="sm"
              className="w-full"
              style={{ backgroundColor: categoryColor }}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Open Chat
            </Button>
          ) : (
            <Button
              onClick={handleMatch}
              size="sm"
              variant="outline"
              className="w-full"
              style={{ borderColor: categoryColor, color: categoryColor }}
              disabled={requestSent}
            >
              <Heart className="h-4 w-4 mr-2" />
              {requestSent ? 'Request Sent ✓' : 'Send Match Request'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
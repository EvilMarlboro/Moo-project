import { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { LoginPrompt } from '../components/LoginPrompt';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Users, Volume2, Heart, MessageCircle, X, Check } from 'lucide-react';
import { Shield, MoreVertical } from 'lucide-react';
import { CATEGORY_COLORS } from '../data/mockData';
import { PROFILE_BACKGROUNDS, type BackgroundKey } from '../data/profileBackgrounds';
import { useAuth, type OnlineUser } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { getCategoryForActivity, getRequiredFieldsForActivity } from '../data/activityHelpers';
import { useMatches } from '../context/MatchContext';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { UserAvatar } from '../components/UserAvatar';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';


interface ChatItem {
  id: string;
  partner_id: string;
  partner_username: string;
  partner_avatar: string;
  activity: string;
  updated_at: string;
}

interface RecentMatch {
  chat_id: string;
  partner_id: string;
  partner_username: string;
  partner_avatar: string;
  activity: string;
  created_at: string;
}

function formatFieldName(field: string): string {
  return field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function StarRating({
  rating,
  onChange,
  size = 'md',
}: {
  rating: number;
  onChange?: (r: number) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          className={`leading-none transition-transform ${onChange ? 'cursor-pointer hover:scale-125' : 'cursor-default'} ${size === 'sm' ? 'text-base' : 'text-xl'} ${star <= rating ? 'text-yellow-400' : 'text-muted-foreground/25'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ActivityHub() {
  const { user, supabaseUserId, updateUser, onlineUsers } = useAuth();
  const navigate = useNavigate();
  const { matches, addMatch } = useMatches();

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) navigate('/');
    if (user && user.username === '') navigate('/profile-setup', { replace: true });
  }, [user, navigate]);

  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [matchRequests, setMatchRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [acceptedConnections, setAcceptedConnections] = useState<Set<string>>(new Set());
  const [chats, setChats] = useState<ChatItem[]>([]);

  // Modal state
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [selectedUserMatchCount, setSelectedUserMatchCount] = useState<number | null>(null);
  const [selectedUserReviews, setSelectedUserReviews] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  // Recent matches + reviews sidebar state
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [existingReviews, setExistingReviews] = useState<Record<string, { rating: number; comment: string }>>({});
  const [pendingRatings, setPendingRatings] = useState<Record<string, number>>({});
  const [pendingComments, setPendingComments] = useState<Record<string, string>>({});
  const [submittingReview, setSubmittingReview] = useState<Set<string>>(new Set());

  const fetchAcceptedConnections = async () => {
    if (!supabaseUserId) return;
    const { data } = await supabase
      .from('match_requests')
      .select('sender_id, receiver_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${supabaseUserId},receiver_id.eq.${supabaseUserId}`);
    if (data) {
      setAcceptedConnections(new Set(
        data.map(r => r.sender_id === supabaseUserId ? r.receiver_id : r.sender_id)
      ));
    }
  };

  const fetchMatchRequests = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data, error } = await supabase
      .from('match_requests')
      .select('*')
      .or(`receiver_id.eq.${authUser.id},sender_id.eq.${authUser.id}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    console.log('[fetchMatchRequests] error:', error, '| raw data:', data);

    if (error) return;

    if (!data || data.length === 0) {
      setMatchRequests([]);
      return;
    }

    const enriched = await Promise.all(
      data.map(async (req: any) => {
        const isIncoming = req.receiver_id === authUser.id;
        const profileId = isIncoming ? req.sender_id : req.receiver_id;
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name, avatar, gender')
            .eq('id', profileId)
            .single();

          const category = getCategoryForActivity(req.activity || '') || 'sports';
          if (profile && !profileError) {
            return {
              ...req,
              direction: isIncoming ? 'incoming' : 'outgoing',
              username: profile.display_name || 'User',
              avatar: profile.avatar || '👤',
              genderSymbol: profile.gender || '',
              activities: [req.activity].filter(Boolean),
              statusMessage: '',
              category,
            };
          }
          return {
            ...req,
            direction: isIncoming ? 'incoming' : 'outgoing',
            username: 'User',
            avatar: '👤',
            genderSymbol: '',
            activities: [req.activity].filter(Boolean),
            statusMessage: '',
            category,
          };
        } catch {
          return {
            ...req,
            direction: isIncoming ? 'incoming' : 'outgoing',
            username: 'User',
            avatar: '👤',
            genderSymbol: '',
            activities: [req.activity].filter(Boolean),
            statusMessage: '',
            category: getCategoryForActivity(req.activity || '') || 'sports',
          };
        }
      })
    );

    setMatchRequests(enriched);
  };

  useEffect(() => {
    if (!supabaseUserId) return;

    fetchMatchRequests();
    fetchAcceptedConnections();

    const channel = supabase
      .channel('match-requests-' + supabaseUserId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_requests', filter: `receiver_id=eq.${supabaseUserId}` },
        (payload) => { console.log('[realtime] INSERT receiver_id match:', payload); fetchMatchRequests(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_requests', filter: `sender_id=eq.${supabaseUserId}` },
        () => fetchMatchRequests())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'match_requests', filter: `receiver_id=eq.${supabaseUserId}` },
        () => fetchMatchRequests())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'match_requests', filter: `receiver_id=eq.${supabaseUserId}` },
        () => fetchMatchRequests())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'match_requests', filter: `sender_id=eq.${supabaseUserId}` },
        async (payload: any) => {
          if (payload.new.status === 'accepted') {
            fetchAcceptedConnections();
            const { data: chat } = await supabase
              .from('chats')
              .select('id')
              .or(`and(user1_id.eq.${supabaseUserId},user2_id.eq.${payload.new.receiver_id}),and(user1_id.eq.${payload.new.receiver_id},user2_id.eq.${supabaseUserId})`)
              .maybeSingle();
            if (chat) {
              toast.success('Your request was accepted! Starting chat...');
              navigate('/chat/' + chat.id);
            }
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabaseUserId, navigate]);

  const fetchChats = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .or(`user1_id.eq.${authUser.id},user2_id.eq.${authUser.id}`)
      .order('created_at', { ascending: false });

    if (error) return;
    if (!data || data.length === 0) { setChats([]); return; }

    const enriched = await Promise.all(
      data.map(async (chat: any) => {
        const partnerId = chat.user1_id === authUser.id ? chat.user2_id : chat.user1_id;
        let partnerName = 'USC Student';
        let partnerAvatar = '👤';
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name, avatar')
            .eq('id', partnerId)
            .single();
          if (profile && !profileError) {
            partnerName = profile.display_name || 'USC Student';
            partnerAvatar = profile.avatar || '👤';
          }
        } catch {
          // partner profile fetch failed, use defaults
        }
        return {
          id: chat.id,
          partner_id: partnerId,
          partner_username: partnerName,
          partner_avatar: partnerAvatar,
          activity: chat.activity || '',
          updated_at: chat.updated_at || chat.created_at,
        };
      })
    );

    setChats(enriched);
    enriched.forEach(chat => addMatch(chat.partner_id, chat.activity));
  };

  useEffect(() => { fetchChats(); }, [supabaseUserId]);

  const fetchRecentMatches = async () => {
    if (!supabaseUserId) return;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: chatsData } = await supabase
      .from('chats')
      .select('id, user1_id, user2_id, activity, created_at')
      .or(`user1_id.eq.${supabaseUserId},user2_id.eq.${supabaseUserId}`)
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!chatsData || chatsData.length === 0) {
      setRecentMatches([]);
      return;
    }

    const chatIds = chatsData.map(c => c.id);
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('chat_id, rating, comment')
      .eq('reviewer_id', supabaseUserId)
      .in('chat_id', chatIds);

    const reviewsMap: Record<string, { rating: number; comment: string }> = {};
    reviewsData?.forEach(r => {
      reviewsMap[r.chat_id] = { rating: r.rating, comment: r.comment || '' };
    });
    setExistingReviews(reviewsMap);

    const enriched = await Promise.all(
      chatsData.map(async (chat: any) => {
        const partnerId = chat.user1_id === supabaseUserId ? chat.user2_id : chat.user1_id;
        let partnerName = 'USC Student';
        let partnerAvatar = '👤';
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar')
            .eq('id', partnerId)
            .single();
          if (profile) {
            partnerName = profile.display_name || 'USC Student';
            partnerAvatar = profile.avatar || '👤';
          }
        } catch {}
        return {
          chat_id: chat.id,
          partner_id: partnerId,
          partner_username: partnerName,
          partner_avatar: partnerAvatar,
          activity: chat.activity || '',
          created_at: chat.created_at,
        };
      })
    );

    setRecentMatches(enriched);
  };

  useEffect(() => {
    if (!supabaseUserId) return;
    fetchRecentMatches();
  }, [supabaseUserId]);

  const handleSubmitReview = async (chatId: string, partnerId: string) => {
    const rating = pendingRatings[chatId];
    if (!rating || !supabaseUserId) return;

    setSubmittingReview(prev => new Set(prev).add(chatId));
    const comment = pendingComments[chatId] || '';

    const { error } = await supabase
      .from('reviews')
      .upsert({
        reviewer_id: supabaseUserId,
        reviewed_id: partnerId,
        chat_id: chatId,
        rating,
        comment,
      }, { onConflict: 'reviewer_id,reviewed_id,chat_id' });

    if (error) {
      toast.error(`Failed to save review: ${error.message}`);
    } else {
      toast.success('Review saved!');
      setExistingReviews(prev => ({ ...prev, [chatId]: { rating, comment } }));
      setPendingRatings(prev => { const n = { ...prev }; delete n[chatId]; return n; });
      setPendingComments(prev => { const n = { ...prev }; delete n[chatId]; return n; });
      if (user) {
        await supabase.from('notifications').insert({
          user_id: partnerId,
          type: 'new_review',
          message: `${user.username} left you a review`,
          data: { reviewer_id: supabaseUserId, rating, chat_id: chatId },
        });
      }
    }

    setSubmittingReview(prev => { const n = new Set(prev); n.delete(chatId); return n; });
  };

  const fetchSentRequests = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data, error } = await supabase
      .from('match_requests')
      .select('receiver_id')
      .eq('sender_id', authUser.id)
      .eq('status', 'pending');
    if (error) return;
    setSentRequests(data && data.length > 0
      ? new Set(data.map((req: any) => req.receiver_id))
      : new Set());
  };

  useEffect(() => {
    if (!supabaseUserId) return;
    fetchSentRequests();
    const channel = supabase
      .channel('sent-requests-' + supabaseUserId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_requests', filter: `sender_id=eq.${supabaseUserId}` },
        () => fetchSentRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabaseUserId]);

  useEffect(() => {
    if (!supabaseUserId) return;
    const channel = supabase
      .channel('chats-panel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, () => fetchChats())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chats' },
        (payload) => {
          setChats(prev => prev.filter(c => c.id !== payload.old.id));
          toast.info('A chat has been removed');
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabaseUserId]);


  // Exclude self and any users with incomplete profiles
  const allOtherUsers = onlineUsers.filter(
    u => u.user_id !== supabaseUserId && !!u.username && !!u.avatar
  );

  const openUserModal = async (presenceUser: OnlineUser) => {
    setSelectedUser(presenceUser);
    setSelectedUserProfile(null);
    setSelectedUserMatchCount(null);
    setSelectedUserReviews([]);
    setProfileLoading(true);

    // Log view (fire-and-forget, ignore if table doesn't exist yet)
    if (supabaseUserId && supabaseUserId !== presenceUser.user_id) {
      supabase.from('profile_views').insert({
        viewer_id: supabaseUserId,
        viewed_id: presenceUser.user_id,
      }).then(() => {});
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [profileResult, matchResult, reviewResult] = await Promise.all([
      supabase.from('profiles').select('activity_profiles').eq('id', presenceUser.user_id).single(),
      supabase.from('match_requests')
        .select('id', { count: 'exact', head: true })
        .or(`sender_id.eq.${presenceUser.user_id},receiver_id.eq.${presenceUser.user_id}`)
        .eq('status', 'accepted')
        .gte('created_at', weekAgo.toISOString()),
      supabase.from('reviews')
        .select('rating, comment, created_at, reviewer_id')
        .eq('reviewed_id', presenceUser.user_id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    setSelectedUserProfile(profileResult.data?.activity_profiles || {});
    setSelectedUserMatchCount(matchResult.count ?? 0);

    const reviews = reviewResult.data || [];
    if (reviews.length > 0) {
      const reviewerIds = reviews.map((r: any) => r.reviewer_id);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar')
        .in('id', reviewerIds);
      const profileMap = Object.fromEntries(
        (profileData || []).map((p: any) => [p.id, { name: p.display_name || 'USC Student', avatar: p.avatar || '👤' }])
      );
      setSelectedUserReviews(reviews.map((r: any) => ({
        ...r,
        reviewer_name: profileMap[r.reviewer_id]?.name || 'USC Student',
        reviewer_avatar: profileMap[r.reviewer_id]?.avatar || '👤',
      })));
    } else {
      setSelectedUserReviews([]);
    }

    setProfileLoading(false);
  };

  const handleConnect = async (presenceUser: OnlineUser) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    console.log('[handleConnect] supabaseUserId:', supabaseUserId, '| authUser.id:', authUser.id);

    const { data: existing } = await supabase
      .from('match_requests')
      .select('id, status')
      .eq('sender_id', authUser.id)
      .eq('receiver_id', presenceUser.user_id)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') toast.info('Request already sent!');
      else if (existing.status === 'accepted') toast.success('You are already connected!');
      setSentRequests(prev => new Set(prev).add(presenceUser.user_id));
      return;
    }

    const insertPayload = {
      sender_id: authUser.id,
      receiver_id: presenceUser.user_id,
      activity: presenceUser.activities?.[0] || 'General',
      status: 'pending',
      sender_email: authUser.email,
    };
    console.log('[handleConnect] inserting:', insertPayload);

    const { error } = await supabase
      .from('match_requests')
      .insert(insertPayload);
    if (error) {
      console.error('[handleConnect] insert error:', error);
      toast.error('Error: ' + error.message);
    } else {
      setSentRequests(prev => new Set(prev).add(presenceUser.user_id));
      toast.success('Request sent! ✓');
      fetchMatchRequests();
    }
  };

  const handleSaveStatusMessage = () => {
    updateUser({ statusMessage });
    setIsDialogOpen(false);
  };

  const handleAcceptMatch = async (requestId: string) => {
    if (!user) { setIsLoginPromptOpen(true); return; }
    const request = matchRequests.find(req => req.id === requestId);
    if (!request) return;

    const { error } = await supabase
      .from('match_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) { toast.error(error.message); return; }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const senderId = request.sender_id;
    const activity = request.activities?.[0] || request.activity || '';

    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .or(`and(user1_id.eq.${authUser.id},user2_id.eq.${senderId}),and(user1_id.eq.${senderId},user2_id.eq.${authUser.id})`)
      .maybeSingle();

    let chatId: string;
    if (existingChat) {
      chatId = existingChat.id;
    } else {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({ user1_id: authUser.id, user2_id: senderId, activity })
        .select()
        .single();
      if (chatError || !newChat) { toast.error('Failed to create chat room'); return; }
      chatId = newChat.id;
    }

    addMatch(senderId, activity);
    setMatchRequests(prev => prev.filter(req => req.id !== requestId));
    toast.success('Match accepted! Opening chat...');
    navigate(`/chat/${chatId}`);
  };

  const handleDeclineMatch = async (requestId: string) => {
    if (!user) { setIsLoginPromptOpen(true); return; }
    const { error } = await supabase
      .from('match_requests')
      .update({ status: 'declined' })
      .eq('id', requestId);
    if (error) { toast.error(error.message); return; }
    setMatchRequests(prev => prev.filter(req => req.id !== requestId));
  };

  const toggleRequestDetails = (requestId: string) => {
    setExpandedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) newSet.delete(requestId);
      else newSet.add(requestId);
      return newSet;
    });
  };

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Group activities by category for modal display
  const groupActivitiesByCategory = (activities: string[]) => {
    const groups: Record<string, string[]> = {};
    for (const activity of activities) {
      const cat = getCategoryForActivity(activity) || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(activity);
    }
    return groups;
  };

  // Compute average rating for profile modal
  const avgRating = selectedUserReviews.length > 0
    ? selectedUserReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / selectedUserReviews.length
    : null;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none select-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-32 w-[500px] h-[500px] rounded-full bg-purple-400/12 blur-[100px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-pink-400/10 blur-[80px]" />
        <div className="absolute -bottom-32 left-1/4 w-[450px] h-[450px] rounded-full bg-amber-300/10 blur-[100px]" />
      </div>
      <Navbar />
      <LoginPrompt open={isLoginPromptOpen} onOpenChange={setIsLoginPromptOpen} />

      {/* User profile modal */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) { setSelectedUser(null); setSelectedUserProfile(null); setSelectedUserReviews([]); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedUser && (() => {
            const modalBgKey = (selectedUser.profileBackground || 'default') as BackgroundKey;
            const modalBg = PROFILE_BACKGROUNDS[modalBgKey] ?? PROFILE_BACKGROUNDS.default;
            const modalHasBg = modalBgKey !== 'default';
            return (
            <>
              <DialogHeader>
                <div
                  className="flex flex-col items-center text-center gap-3 mb-2 -mx-6 -mt-6 pt-8 pb-6 px-6 rounded-t-lg"
                  style={modalHasBg ? modalBg.style : {}}
                >
                  <div className="relative">
                    <UserAvatar
                      avatar={selectedUser.avatar || '👤'}
                      username={selectedUser.username}
                      className={`w-36 h-36 border-[3px] ${modalHasBg ? 'border-white/50' : 'border-purple-300'}`}
                      fallbackClassName={`text-7xl ${modalHasBg ? '' : 'bg-purple-50'}`}
                    />
                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      <DialogTitle className={`text-2xl ${modalHasBg ? 'text-white drop-shadow' : ''}`}>{selectedUser.username}</DialogTitle>
                      {selectedUser.genderSymbol && (
                        <span
                          className="text-2xl"
                          style={{
                            color: modalHasBg ? 'rgba(255,255,255,0.9)'
                              : selectedUser.genderSymbol === '♂' ? '#3B82F6'
                              : selectedUser.genderSymbol === '♀' ? '#EC4899'
                              : '#9333EA',
                          }}
                        >
                          {selectedUser.genderSymbol}
                        </span>
                      )}
                      <Shield className={`h-4 w-4 ${modalHasBg ? 'text-white/80' : 'text-[#990000]'}`} />
                    </div>
                    <p className={`text-sm ${modalHasBg ? 'text-white/70' : 'text-muted-foreground'}`}>USC Student</p>
                    {selectedUser.statusMessage && (
                      <DialogDescription className={`italic mt-1 ${modalHasBg ? 'text-white/80' : ''}`}>
                        "{selectedUser.statusMessage}"
                      </DialogDescription>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Weekly match count */}
              <div className="flex justify-center py-1 mb-1">
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-full px-4 py-2">
                  <Heart className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Matches this week:</span>
                  <span className="text-sm font-semibold text-purple-700">
                    {selectedUserMatchCount === null ? '—' : selectedUserMatchCount}
                  </span>
                </div>
              </div>

              <div className="py-2">
                {selectedUser.vibingMode ? (
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 mb-4">
                    <p className="text-sm font-medium text-purple-700">🎵 Vibing — open to anything!</p>
                  </div>
                ) : (
                  <>
                    {profileLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-300 border-t-transparent" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(groupActivitiesByCategory(selectedUser.activities || [])).map(([category, activities]) => {
                          const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#9333EA';
                          const categoryLabel = category === 'campusEvents' ? 'Campus Events'
                            : category.charAt(0).toUpperCase() + category.slice(1);
                          return (
                            <div key={category}>
                              <h4 className="text-sm font-semibold mb-2 uppercase tracking-wide" style={{ color }}>
                                {categoryLabel}
                              </h4>
                              <div className="space-y-3">
                                {activities.map(activity => {
                                  const profile = selectedUserProfile?.[activity];
                                  const fields = getRequiredFieldsForActivity(activity);
                                  return (
                                    <div key={activity} className="p-3 rounded-lg border" style={{ borderColor: color + '40', backgroundColor: color + '08' }}>
                                      <p className="font-medium text-sm mb-1" style={{ color }}>{activity}</p>
                                      {fields.length > 0 && profile ? (
                                        <div className="grid grid-cols-2 gap-1">
                                          {fields.map(field => profile[field] ? (
                                            <div key={field}>
                                              <span className="text-xs text-muted-foreground">{formatFieldName(field)}: </span>
                                              <span className="text-xs font-medium">{profile[field]}</span>
                                            </div>
                                          ) : null)}
                                        </div>
                                      ) : fields.length > 0 ? (
                                        <p className="text-xs text-muted-foreground">No profile details yet</p>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Reviews section */}
              {!profileLoading && (
                <div className="pt-2 pb-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Reviews</h4>
                    {avgRating !== null && (
                      <div className="flex items-center gap-1.5 ml-auto bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
                        <span className="text-yellow-500 text-sm">⭐</span>
                        <span className="text-sm font-bold text-yellow-700">{avgRating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">/ 5</span>
                        <span className="text-xs text-muted-foreground">({selectedUserReviews.length} {selectedUserReviews.length === 1 ? 'review' : 'reviews'})</span>
                      </div>
                    )}
                  </div>
                  {selectedUserReviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">No reviews yet</p>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedUserReviews.map((review: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-secondary/40 border border-border">
                          <div className="flex items-start gap-2.5 mb-1.5">
                            <UserAvatar
                              avatar={review.reviewer_avatar}
                              username={review.reviewer_name}
                              className="w-7 h-7 flex-shrink-0"
                              fallbackClassName="text-sm"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold truncate">{review.reviewer_name}</span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(review.created_at)}</span>
                              </div>
                              <StarRating rating={review.rating} size="sm" />
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-xs text-muted-foreground italic pl-9">"{review.comment}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="mt-2">
                <Button
                  className="w-full"
                  style={
                    acceptedConnections.has(selectedUser.user_id)
                      ? {}
                      : { backgroundColor: '#9333EA', color: 'white' }
                  }
                  disabled={sentRequests.has(selectedUser.user_id) || acceptedConnections.has(selectedUser.user_id)}
                  onClick={() => handleConnect(selectedUser)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {acceptedConnections.has(selectedUser.user_id)
                    ? 'Already Connected'
                    : sentRequests.has(selectedUser.user_id)
                    ? 'Request Sent ✓'
                    : 'Connect'}
                </Button>
              </DialogFooter>
            </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="mb-2">Activity Hub</h1>
          <p className="text-muted-foreground">
            Find USC students available right now for your favorite activities
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Left Sidebar */}
          <div className="w-full lg:w-64 lg:flex-shrink-0 space-y-4 order-2 lg:order-1">
            {/* Match Requests */}
            <Card className="p-4 border-2 border-border">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-pink-500" />
                <h3 className="text-lg">Match Requests</h3>
                {matchRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-auto">{matchRequests.length}</Badge>
                )}
              </div>
              <div className="space-y-3">
                {matchRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No match requests yet</p>
                ) : (
                  matchRequests.map(request => {
                    const categoryColor = CATEGORY_COLORS[request.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                    const isExpanded = expandedRequests.has(request.id);
                    return (
                      <Card key={request.id} className="p-3 bg-secondary/30 border-2" style={{ borderColor: categoryColor }}>
                        <div className="flex items-start gap-3 mb-2">
                          <UserAvatar
                            avatar={request.avatar}
                            username={request.username}
                            className="w-12 h-12 border-2"
                            fallbackClassName="text-2xl"
                            fallbackStyle={{ backgroundColor: categoryColor + '20', borderColor: categoryColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <h4 className="text-sm font-medium truncate">{request.username}</h4>
                              {request.genderSymbol && (
                                <span className="text-sm flex-shrink-0" style={{ color: request.genderSymbol === '♂' ? '#3B82F6' : request.genderSymbol === '♀' ? '#EC4899' : categoryColor }}>
                                  {request.genderSymbol}
                                </span>
                              )}
                              <Shield className="h-3 w-3 text-[#990000] flex-shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground">{request.activities?.[0]}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => toggleRequestDetails(request.id)}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                        {isExpanded && (
                          <>
                            {request.activities?.length > 1 && (
                              <div className="mb-2 flex flex-wrap gap-1">
                                {request.activities.map((activity: string, index: number) => (
                                  <span key={index}>
                                    <span className="font-medium text-xs" style={{ color: categoryColor }}>{activity}</span>
                                    {index < request.activities.length - 1 && <span className="text-muted-foreground mx-1 text-xs">•</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                            {request.statusMessage && (
                              <p className="text-xs text-muted-foreground mb-2 italic">"{request.statusMessage}"</p>
                            )}
                          </>
                        )}
                        {request.direction === 'outgoing' ? (
                          <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-secondary/60 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-green-500" />
                            Request Sent — Awaiting response
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600 h-8" onClick={() => handleAcceptMatch(request.id)}>
                              <Check className="h-3 w-3 mr-1" />Accept
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => handleDeclineMatch(request.id)}>
                              <X className="h-3 w-3 mr-1" />Decline
                            </Button>
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Chats */}
            <Card className="p-4 border-2 border-border">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg">Chats</h3>
              </div>
              <div className="space-y-2">
                {chats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No active chats</p>
                ) : (
                  chats.map(chat => {
                    const categoryColor = CATEGORY_COLORS[getCategoryForActivity(chat.activity) as keyof typeof CATEGORY_COLORS] || '#6B7280';
                    return (
                      <Card key={chat.id} className="p-3 bg-secondary/30 border-2 cursor-pointer hover:bg-secondary/50 transition-colors" style={{ borderColor: categoryColor }} onClick={() => navigate(`/chat/${chat.id}`)}>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            avatar={chat.partner_avatar}
                            username={chat.partner_username}
                            className="w-10 h-10 border-2"
                            fallbackClassName="text-xl"
                            fallbackStyle={{ backgroundColor: categoryColor + '20' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <h4 className="text-sm font-medium truncate">{chat.partner_username}</h4>
                              <Shield className="h-3 w-3 text-[#990000] flex-shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{chat.activity}</p>
                          </div>
                          <MessageCircle className="h-4 w-4 flex-shrink-0" style={{ color: categoryColor }} />
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 order-1 lg:order-2">
            {/* Greeting banner */}
            <div className="relative overflow-hidden rounded-2xl mb-6 p-5"
              style={{ background: 'linear-gradient(135deg, #7C3AED22 0%, #EC489922 50%, #FBBF2422 100%)' }}>
              <div aria-hidden className="absolute -right-4 -top-4 text-[80px] opacity-10 select-none pointer-events-none rotate-[15deg] leading-none">🐮</div>
              <div className="flex items-center gap-3">
                <div className="text-3xl">👋</div>
                <div>
                  <p className="font-semibold text-lg leading-tight">
                    Hey, <span className="text-purple-600">{user?.username}</span>!
                  </p>
                  <p className="text-sm text-muted-foreground">Who's online and ready to connect?</p>
                </div>
              </div>
            </div>

            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium">
                  {allOtherUsers.length} {allOtherUsers.length === 1 ? 'person' : 'people'} online now
                </span>
              </div>

              {/* Status message dialog */}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Volume2 className="h-4 w-4" />
                    {user?.statusMessage ? 'Edit Status' : 'Set Status'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Your Status Message</DialogTitle>
                    <DialogDescription>
                      This message will be visible to other users on your profile card.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Textarea
                      value={statusMessage}
                      onChange={(e) => setStatusMessage(e.target.value)}
                      placeholder="e.g., Looking for a study buddy for CSCI 104!"
                      maxLength={150}
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-2">{statusMessage.length}/150 characters</p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveStatusMessage}>Save Status</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Users Grid */}
            {allOtherUsers.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {allOtherUsers.map(presenceUser => {
                  const primaryCategory = presenceUser.categories?.[0];
                  const cardColor = CATEGORY_COLORS[primaryCategory as keyof typeof CATEGORY_COLORS] || '#9333EA';
                  const categoryLabels = (presenceUser.categories || []).map(c =>
                    c === 'campusEvents' ? 'Campus Events' : c.charAt(0).toUpperCase() + c.slice(1)
                  );
                  const bgKey = (presenceUser.profileBackground || 'default') as BackgroundKey;
                  const cardBg = PROFILE_BACKGROUNDS[bgKey] ?? PROFILE_BACKGROUNDS.default;
                  const hasBg = bgKey !== 'default';

                  return (
                    <Card
                      key={presenceUser.user_id}
                      className="p-5 border-2 hover:scale-[1.02] transition-all hover:shadow-xl cursor-pointer flex flex-col items-center text-center"
                      style={{
                        borderColor: cardColor,
                        boxShadow: `0 4px 20px ${cardColor}20`,
                        ...(hasBg ? cardBg.style : { background: 'linear-gradient(to bottom right, white, #f5f3ff)' }),
                      }}
                      onClick={() => openUserModal(presenceUser)}
                    >
                      {/* Avatar — large, centred */}
                      <div className="relative mb-4">
                        <UserAvatar
                          avatar={presenceUser.avatar || '👤'}
                          username={presenceUser.username}
                          className="w-28 h-28 border-[3px]"
                          fallbackClassName="text-5xl"
                          fallbackStyle={{ backgroundColor: cardColor + '20', borderColor: cardColor }}
                        />
                        <div className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-green-500 rounded-full border-2 border-card" />
                      </div>

                      {/* Name + gender + badge */}
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <h3 className={`font-semibold truncate max-w-[120px] ${hasBg ? 'text-white drop-shadow' : ''}`}>{presenceUser.username}</h3>
                        {presenceUser.genderSymbol && (
                          <span
                            className="flex-shrink-0"
                            style={{
                              color: hasBg ? 'rgba(255,255,255,0.9)'
                                : presenceUser.genderSymbol === '♂' ? '#3B82F6'
                                : presenceUser.genderSymbol === '♀' ? '#EC4899'
                                : cardColor,
                            }}
                          >
                            {presenceUser.genderSymbol}
                          </span>
                        )}
                        <Shield className={`h-3.5 w-3.5 flex-shrink-0 ${hasBg ? 'text-white/80' : 'text-[#990000]'}`} />
                      </div>

                      {/* Category / vibing */}
                      <div className="mb-2 min-h-[1.25rem]">
                        {presenceUser.vibingMode ? (
                          <span className={`text-xs font-medium ${hasBg ? 'text-white/90' : 'text-purple-600'}`}>🎵 Vibing</span>
                        ) : categoryLabels.length > 0 ? (
                          <span className={`text-xs ${hasBg ? 'text-white/70' : 'text-muted-foreground'}`}>{categoryLabels.join(' • ')}</span>
                        ) : null}
                      </div>

                      {/* Status message */}
                      {presenceUser.statusMessage && (
                        <p className={`text-xs italic line-clamp-2 mb-3 px-1 ${hasBg ? 'text-white/70' : 'text-muted-foreground'}`}>
                          "{presenceUser.statusMessage}"
                        </p>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-auto"
                        style={
                          acceptedConnections.has(presenceUser.user_id)
                            ? {}
                            : { borderColor: cardColor, color: cardColor }
                        }
                        disabled={sentRequests.has(presenceUser.user_id) || acceptedConnections.has(presenceUser.user_id)}
                        onClick={(e) => { e.stopPropagation(); handleConnect(presenceUser); }}
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                        {acceptedConnections.has(presenceUser.user_id)
                          ? 'Already Connected'
                          : sentRequests.has(presenceUser.user_id)
                          ? 'Request Sent ✓'
                          : 'Connect'}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-card rounded-lg border border-border">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="mb-2">No one else online right now</h3>
                <p className="text-muted-foreground">Check back soon or invite a friend!</p>
              </div>
            )}

            <div className="mt-8 text-center">
              <Button variant="outline" size="lg" onClick={() => navigate('/discovery')}>
                Explore Other Activities
              </Button>
            </div>
          </div>

          {/* Right Sidebar — Recent Matches */}
          <div className="w-full lg:w-72 lg:flex-shrink-0 order-3">
            <Card className="p-4 border-2 border-border lg:sticky lg:top-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">⭐</span>
                <h3 className="text-lg">Recent Matches</h3>
              </div>

              {recentMatches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No matches in the past 7 days
                </p>
              ) : (
                <div className="space-y-4 max-h-[400px] lg:max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                  {recentMatches.map(match => {
                    const existing = existingReviews[match.chat_id];
                    const pendingRating = pendingRatings[match.chat_id] ?? 0;
                    const pendingComment = pendingComments[match.chat_id] ?? '';
                    const isSubmitting = submittingReview.has(match.chat_id);
                    const categoryColor = CATEGORY_COLORS[getCategoryForActivity(match.activity) as keyof typeof CATEGORY_COLORS] || '#6B7280';

                    return (
                      <div key={match.chat_id} className="p-3 rounded-lg border border-border bg-secondary/20 space-y-2">
                        {/* Partner info */}
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            avatar={match.partner_avatar}
                            username={match.partner_username}
                            className="w-9 h-9 border"
                            fallbackClassName="text-lg"
                            fallbackStyle={{ backgroundColor: categoryColor + '20' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{match.partner_username}</p>
                            <p className="text-xs text-muted-foreground truncate">{match.activity}</p>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {new Date(match.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>

                        {existing ? (
                          /* Already reviewed — read-only */
                          <div className="space-y-1">
                            <StarRating rating={existing.rating} size="sm" />
                            {existing.comment && (
                              <p className="text-xs text-muted-foreground italic">"{existing.comment}"</p>
                            )}
                            <p className="text-xs text-green-600 font-medium">✓ Reviewed</p>
                          </div>
                        ) : (
                          /* Pending review */
                          <div className="space-y-2">
                            <StarRating
                              rating={pendingRating}
                              size="sm"
                              onChange={r => setPendingRatings(prev => ({ ...prev, [match.chat_id]: r }))}
                            />
                            {pendingRating > 0 && (
                              <>
                                <Textarea
                                  placeholder="Add a comment (optional)"
                                  value={pendingComment}
                                  onChange={e => setPendingComments(prev => ({ ...prev, [match.chat_id]: e.target.value }))}
                                  rows={2}
                                  maxLength={200}
                                  className="text-xs resize-none"
                                />
                                <Button
                                  size="sm"
                                  className="w-full h-7 text-xs"
                                  disabled={isSubmitting}
                                  onClick={() => handleSubmitReview(match.chat_id, match.partner_id)}
                                >
                                  {isSubmitting ? 'Saving…' : 'Submit Review'}
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

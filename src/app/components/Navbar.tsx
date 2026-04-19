import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { Home, Search, Settings, Shield, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import { supabase } from '../lib/supabase';

export function Navbar() {
  const navigate = useNavigate();
  const { user, supabaseUserId } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notiOpen, setNotiOpen] = useState(false);
  const notiRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!supabaseUserId) return;

    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', supabaseUserId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setNotifications(data); });

    const channel = supabase
      .channel(`notifications:${supabaseUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${supabaseUserId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as any, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabaseUserId]);

  useEffect(() => {
    if (!notiOpen) return;
    const handler = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) {
        setNotiOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notiOpen]);

  const handleOpenNoti = async () => {
    const opening = !notiOpen;
    setNotiOpen(opening);
    if (opening && unreadCount > 0 && supabaseUserId) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', supabaseUserId)
        .eq('read', false);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b-2 border-purple-200 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user ? "/activity-hub" : "/browse-hub"} className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              MOO 🐮
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {user !== null && user !== undefined ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/activity-hub')}>
                  <Home className="h-4 w-4 mr-2" />
                  Hub
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/discovery')}>
                  <Search className="h-4 w-4 mr-2" />
                  Explore
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>

                {/* Notification Bell */}
                <div ref={notiRef} className="relative">
                  <Button variant="ghost" size="sm" onClick={handleOpenNoti} className="relative px-2">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>

                  {notiOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-border shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-border">
                        <h4 className="font-semibold text-sm">Notifications</h4>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">No notifications yet</p>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              className={`px-4 py-3 border-b border-border/50 last:border-0 ${!n.read ? 'bg-purple-50/60' : ''}`}
                            >
                              <p className="text-sm">{n.message}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
                  <UserAvatar avatar={user.avatar} username={user.username} className="h-9 w-9" fallbackClassName="text-xl" />
                  <div className="hidden md:flex items-center gap-1">
                    <span className="text-sm">{user.username}</span>
                    {user.genderSymbol && (
                      <span className="text-sm text-primary">
                        {user.genderSymbol}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : user === null ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/browse-hub')}>
                  <Home className="h-4 w-4 mr-2" />
                  Browse
                </Button>
                <Button onClick={() => navigate('/login')} size="sm" className="bg-[#990000] hover:bg-[#7a0000] text-white ml-2">
                  <Shield className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}

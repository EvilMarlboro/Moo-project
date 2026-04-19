import { Link, useNavigate } from 'react-router';
import { Home, Search, User, Settings, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-white/5 backdrop-blur-2xl border-b border-white/10 shadow-2xl shadow-black/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user ? "/activity-hub" : "/browse-hub"} className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              MOO 🐮
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {user !== null && user !== undefined ? (
              <>
                {/* Authenticated Navigation */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/activity-hub')}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Hub
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/discovery')}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Explore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>

                {/* User Avatar */}
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
                  <div className="text-2xl">{user.avatar}</div>
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
                {/* Unauthenticated Navigation */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/browse-hub')}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Browse
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold ml-2 shadow-lg shadow-amber-500/20"
                >
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
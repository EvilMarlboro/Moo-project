import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { AVATAR_OPTIONS } from '../data/avatarImages';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export function ProfileSetup() {
  const navigate = useNavigate();
  const { user, login, supabaseUserId } = useAuth();
  const [step, setStep] = useState<'avatar' | 'username'>('avatar');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [username, setUsername] = useState('');
  const [genderSymbol, setGenderSymbol] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!supabaseUserId) {
      navigate('/login');
    }
  }, [supabaseUserId, navigate]);

  if (!supabaseUserId) {
    return null;
  }

  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
  };

  const handleAvatarNext = () => {
    if (selectedAvatar) {
      setStep('username');
    }
  };

  const handleComplete = async () => {
    if (username.trim() && genderSymbol) {
      const avatar = AVATAR_OPTIONS.find(a => a.id === selectedAvatar);
      const avatarEmoji = avatar?.emoji || '👤';

      // Get authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        console.error('No authenticated user found');
        return;
      }

      // Save profile to Supabase profiles table
      const { data, error } = await supabase.from('profiles').upsert({
        id: authUser.id,
        display_name: username.trim(),
        avatar: avatarEmoji,
        gender: genderSymbol,
      });

      if (error) {
        console.error('Error saving profile to Supabase:', error);
        toast.error('Error saving profile to Supabase');
      } else {
        console.log('Profile saved successfully:', { display_name: username.trim(), avatar: avatarEmoji, gender: genderSymbol });
        toast.success('Profile saved successfully');
      }

      login({
        id: authUser.id,
        username: username.trim(),
        email: authUser.email || '',
        avatar: avatarEmoji,
        genderSymbol: genderSymbol,
        enabledActivities: [],
        activityProfiles: {}
      });
      navigate('/category-selection');
    }
  };

  if (step === 'avatar') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-3xl w-full p-8 bg-card border-border">
          <div className="text-center mb-8">
            <h1 className="mb-2">Choose Your Avatar</h1>
            <p className="text-muted-foreground">
              Select an avatar to represent you on the platform
            </p>
            {user?.email && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <User className="h-3 w-3" />
                Signed in as {user.email}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 md:grid-cols-6 gap-4 mb-8">
            {AVATAR_OPTIONS.map(avatar => (
              <button
                key={avatar.id}
                onClick={() => handleAvatarSelect(avatar.id)}
                className={`
                  aspect-square rounded-lg border-2 p-2 transition-all
                  hover:scale-105 flex flex-col items-center justify-center gap-2
                  ${selectedAvatar === avatar.id 
                    ? 'border-primary bg-primary/10 shadow-lg' 
                    : 'border-border bg-secondary/50 hover:border-primary/50'
                  }
                `}
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback 
                    className="text-2xl"
                    style={{ backgroundColor: avatar.color + '20' }}
                  >
                    {avatar.emoji}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground text-center">{avatar.name}</span>
              </button>
            ))}
          </div>

          <Button
            onClick={handleAvatarNext}
            disabled={!selectedAvatar}
            className="w-full"
            size="lg"
          >
            Continue
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 bg-card border-border">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-5xl" style={{ 
                backgroundColor: AVATAR_OPTIONS.find(a => a.id === selectedAvatar)?.color + '20' 
              }}>
                {AVATAR_OPTIONS.find(a => a.id === selectedAvatar)?.emoji}
              </AvatarFallback>
            </Avatar>
          </div>
          <h1 className="mb-2">Create Your Username</h1>
          <p className="text-muted-foreground">
            Choose a username that other USC students will see
          </p>
        </div>

        <div className="mb-6">
          <Input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="text-center text-lg"
            maxLength={20}
          />
          <p className="text-xs text-muted-foreground text-center mt-2">
            {username.length}/20 characters
          </p>
        </div>

        <div className="mb-6">
          <RadioGroup
            value={genderSymbol}
            onValueChange={setGenderSymbol}
            className="flex flex-row gap-4 justify-center"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="♂" id="male" />
              <Label
                htmlFor="male"
                className="text-4xl font-normal cursor-pointer text-blue-500"
              >
                ♂
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="♀" id="female" />
              <Label
                htmlFor="female"
                className="text-4xl font-normal cursor-pointer text-pink-500"
              >
                ♀
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="⚥" id="non-binary" />
              <Label
                htmlFor="non-binary"
                className="text-4xl font-normal cursor-pointer"
              >
                ♂♀
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button
          onClick={handleComplete}
          disabled={!username.trim() || !genderSymbol}
          className="w-full"
          size="lg"
        >
          Complete Profile Setup
        </Button>
      </Card>
    </div>
  );
}
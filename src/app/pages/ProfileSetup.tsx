import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { User, Upload, ImageIcon, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { AVATAR_OPTIONS } from '../data/avatarImages';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

type Step = 'choose' | 'avatar' | 'upload' | 'username';

export function ProfileSetup() {
  const navigate = useNavigate();
  const { user, login, supabaseUserId } = useAuth();
  const [step, setStep] = useState<Step>('choose');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [username, setUsername] = useState('');
  const [genderSymbol, setGenderSymbol] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabaseUserId) navigate('/login');
  }, [supabaseUserId, navigate]);

  if (!supabaseUserId) return null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleComplete = async () => {
    if (!username.trim() || !genderSymbol) return;

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    setUploading(true);
    let avatarValue = '';

    try {
      if (step === 'username' && photoFile) {
        const ext = photoFile.name.split('.').pop();
        const path = `${authUser.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarValue = urlData.publicUrl;
      } else {
        const avatar = AVATAR_OPTIONS.find(a => a.id === selectedAvatar);
        avatarValue = avatar?.emoji || '👤';
      }

      const { error } = await supabase.from('profiles').upsert({
        id: authUser.id,
        display_name: username.trim(),
        avatar: avatarValue,
        gender: genderSymbol,
      });

      if (error) {
        toast.error('Error saving profile');
        return;
      }

      login({
        id: authUser.id,
        username: username.trim(),
        email: authUser.email || '',
        avatar: avatarValue,
        genderSymbol,
        enabledActivities: [],
        activityProfiles: {}
      });
      navigate('/category-selection');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setUploading(false);
    }
  };

  // Step: choose avatar type
  if (step === 'choose') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 bg-card border-border">
          <div className="text-center mb-8">
            <h1 className="mb-2">Set Your Profile Picture</h1>
            <p className="text-muted-foreground">How would you like to represent yourself?</p>
            {user?.email && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <User className="h-3 w-3" />
                Signed in as {user.email}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setStep('avatar')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="text-5xl">😀</div>
              <span className="font-medium">Choose Avatar</span>
              <span className="text-xs text-muted-foreground text-center">Pick from emoji avatars</span>
            </button>

            <button
              onClick={() => setStep('upload')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Upload className="h-12 w-12 text-muted-foreground" />
              <span className="font-medium">Upload Photo</span>
              <span className="text-xs text-muted-foreground text-center">Use your own picture</span>
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Step: pick emoji avatar
  if (step === 'avatar') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-3xl w-full p-8 bg-card border-border">
          <div className="text-center mb-8">
            <h1 className="mb-2">Choose Your Avatar</h1>
            <p className="text-muted-foreground">Select an avatar to represent you on the platform</p>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-6 gap-4 mb-8">
            {AVATAR_OPTIONS.map(avatar => (
              <button
                key={avatar.id}
                onClick={() => setSelectedAvatar(avatar.id)}
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
                  <AvatarFallback className="text-2xl" style={{ backgroundColor: avatar.color + '20' }}>
                    {avatar.emoji}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground text-center">{avatar.name}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('choose')} className="flex-1">
              Back
            </Button>
            <Button onClick={() => selectedAvatar && setStep('username')} disabled={!selectedAvatar} className="flex-1" size="lg">
              Continue
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Step: upload photo
  if (step === 'upload') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8 bg-card border-border">
          <div className="text-center mb-8">
            <h1 className="mb-2">Upload Your Photo</h1>
            <p className="text-muted-foreground">Choose a profile photo others will see</p>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !photoPreview && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl transition-all mb-6 ${
              photoPreview ? 'border-primary' : 'border-border hover:border-primary/50 cursor-pointer'
            }`}
          >
            {photoPreview ? (
              <div className="relative flex items-center justify-center p-4">
                <img src={photoPreview} alt="Preview" className="h-48 w-48 rounded-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); setPhotoFile(null); setPhotoPreview(''); }}
                  className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full hover:bg-destructive/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 px-6">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium">Click or drag & drop to upload</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />

          {photoPreview && (
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="w-full mb-4">
              Change Photo
            </Button>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('choose')} className="flex-1">
              Back
            </Button>
            <Button onClick={() => photoFile && setStep('username')} disabled={!photoFile} className="flex-1" size="lg">
              Continue
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Step: username + gender
  const previewAvatar = photoPreview || AVATAR_OPTIONS.find(a => a.id === selectedAvatar);
  const previewAvatarColor = typeof previewAvatar === 'object' ? previewAvatar.color + '20' : undefined;
  const previewAvatarEmoji = typeof previewAvatar === 'object' ? previewAvatar.emoji : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 bg-card border-border">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <Avatar className="h-24 w-24">
              {photoPreview ? (
                <>
                  <AvatarImage src={photoPreview} alt="Your photo" />
                  <AvatarFallback className="text-3xl">?</AvatarFallback>
                </>
              ) : (
                <AvatarFallback className="text-5xl" style={{ backgroundColor: previewAvatarColor }}>
                  {previewAvatarEmoji}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          <h1 className="mb-2">Create Your Username</h1>
          <p className="text-muted-foreground">Choose a username that other USC students will see</p>
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
          <p className="text-xs text-muted-foreground text-center mt-2">{username.length}/20 characters</p>
        </div>

        <div className="mb-6">
          <RadioGroup value={genderSymbol} onValueChange={setGenderSymbol} className="flex flex-row gap-4 justify-center">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="♂" id="male" />
              <Label htmlFor="male" className="text-4xl font-normal cursor-pointer text-blue-500">♂</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="♀" id="female" />
              <Label htmlFor="female" className="text-4xl font-normal cursor-pointer text-pink-500">♀</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="⚥" id="non-binary" />
              <Label htmlFor="non-binary" className="text-4xl font-normal cursor-pointer">♂♀</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(photoFile ? 'upload' : 'avatar')} className="flex-1">
            Back
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!username.trim() || !genderSymbol || uploading}
            className="flex-1"
            size="lg"
          >
            {uploading ? 'Saving...' : 'Complete Profile Setup'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

import { Shield } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useNavigate } from 'react-router';

interface LoginPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginPrompt({ open, onOpenChange }: LoginPromptProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    onOpenChange(false);
    navigate('/login');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#990000]" />
            USC Sign-In Required
          </DialogTitle>
          <DialogDescription className="pt-2">
            To interact with other students and send match requests, you need to sign in with your USC credentials.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">What you'll get:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Send and receive match requests</li>
              <li>✓ Chat with verified USC students</li>
              <li>✓ Create your activity profile</li>
              <li>✓ Set your status and preferences</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleLogin}
            className="w-full bg-[#990000] hover:bg-[#7a0000] text-white"
          >
            <Shield className="h-4 w-4 mr-2" />
            Sign in with USC Account
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Continue Browsing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
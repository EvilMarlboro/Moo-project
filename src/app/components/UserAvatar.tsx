import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { cn } from './ui/utils';

interface UserAvatarProps {
  avatar: string;
  username?: string;
  className?: string;
  fallbackClassName?: string;
  fallbackStyle?: React.CSSProperties;
}

const isUrl = (s: string) => s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:');

export function UserAvatar({ avatar, username, className, fallbackClassName, fallbackStyle }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      {isUrl(avatar) ? (
        <>
          <AvatarImage src={avatar} alt={username || 'avatar'} />
          <AvatarFallback className={fallbackClassName} style={fallbackStyle}>
            {username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </>
      ) : (
        <AvatarFallback className={cn('text-2xl', fallbackClassName)} style={fallbackStyle}>
          {avatar}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

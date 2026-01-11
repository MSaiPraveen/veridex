'use client';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Vibrant gradient color pairs for avatars - much better for dark mode
const avatarGradients = [
  'bg-gradient-to-br from-violet-500 to-purple-600',
  'bg-gradient-to-br from-cyan-500 to-blue-600',
  'bg-gradient-to-br from-emerald-500 to-teal-600',
  'bg-gradient-to-br from-rose-500 to-pink-600',
  'bg-gradient-to-br from-amber-500 to-orange-600',
  'bg-gradient-to-br from-indigo-500 to-blue-600',
  'bg-gradient-to-br from-fuchsia-500 to-purple-600',
  'bg-gradient-to-br from-lime-500 to-green-600',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarGradients[Math.abs(hash) % avatarGradients.length];
}

export function Avatar({ src, name = '', size = 'md', className = '' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ring-2 ring-white/20 dark:ring-slate-700 ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`
        rounded-full flex items-center justify-center font-semibold text-white shadow-lg
        ${sizeClasses[size]} ${getAvatarColor(name)} ${className}
      `}
    >
      {getInitials(name || '?')}
    </div>
  );
}

// Avatar Group for showing multiple users
interface AvatarGroupProps {
  users: Array<{ name?: string; src?: string }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visibleUsers = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex -space-x-2">
      {visibleUsers.map((user, i) => (
        <Avatar
          key={i}
          src={user.src}
          name={user.name}
          size={size}
          className="ring-2 ring-slate-800"
        />
      ))}
      {remaining > 0 && (
        <div
          className={`
            rounded-full flex items-center justify-center font-medium
            bg-slate-700 text-slate-300 ring-2 ring-slate-800
            ${sizeClasses[size]}
          `}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

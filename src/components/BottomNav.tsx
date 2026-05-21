import { Home, Sprout, Users, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TabType } from '@/types';

interface BottomNavProps {
  activeTab: TabType;
}

const navItems: { id: TabType; label: string; icon: typeof Home; path: string }[] = [
  { id: 'home', label: '首页', icon: Home, path: '/' },
  { id: 'plants', label: '植物', icon: Sprout, path: '/my-plants' },
  { id: 'community', label: '社区', icon: Users, path: '/community' },
  { id: 'profile', label: '我的', icon: User, path: '/profile' },
];

export function BottomNav({ activeTab }: BottomNavProps) {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[56px] bg-card border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.35)] z-50 flex items-center justify-around safe-area-bottom transition-colors duration-200">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center w-[60px] h-full transition-all duration-200 ${
              isActive ? 'scale-110' : ''
            }`}
          >
            <Icon
              size={24}
              className={`transition-colors duration-200 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span
              className={`text-[12px] mt-1 transition-colors duration-200 ${
                isActive ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

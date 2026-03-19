'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Timer,
  CheckSquare,
  FolderOpen,
  LogIn,
  User,
} from 'lucide-react';

interface SidebarProps {
  onSettingsClick: () => void;
  onSignIn?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSettingsClick, onSignIn }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navigationItems = [
    {
      name: 'Timer',
      href: '/',
      icon: Timer,
      description: 'Pomodoro Timer',
    },
    {
      name: 'Tasks',
      href: '/tasks',
      icon: CheckSquare,
      description: 'Task Management',
    },
    {
      name: 'Projects',
      href: '/projects',
      icon: FolderOpen,
      description: 'Project Organization',
    },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo/Brand */}
      <div className="border-b border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900">Pomofly</h1>
        <p className="text-sm text-gray-500">Productive Focus</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border border-blue-200 bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs text-gray-500">
                      {item.description}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-200 p-4">
        {user ? (
          <>
            <div className="mb-4 flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3">
                <p className="truncate text-sm font-medium text-gray-900">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettingsClick}
                className="w-full justify-start"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-500">
                <User className="h-4 w-4" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Guest</p>
                <p className="text-xs text-gray-500">Local storage only</p>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettingsClick}
                className="w-full justify-start"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              {onSignIn && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSignIn}
                  className="w-full justify-start"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in to sync
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;

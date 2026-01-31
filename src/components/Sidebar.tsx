'use client'
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Settings, Timer, CheckSquare, FolderOpen, LogIn, User } from 'lucide-react';

interface SidebarProps {
  onSettingsClick: () => void;
  isGuest?: boolean;
  onSignIn?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSettingsClick, isGuest, onSignIn }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navigationItems = [
    {
      name: 'Timer',
      href: '/',
      icon: Timer,
      description: 'Pomodoro Timer'
    },
    {
      name: 'Tasks',
      href: '/tasks',
      icon: CheckSquare,
      description: 'Task Management'
    },
    {
      name: 'Projects',
      href: '/projects',
      icon: FolderOpen,
      description: 'Project Organization'
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200">
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
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        {user ? (
          <>
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 truncate">
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
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-medium">
                <User className="w-4 h-4" />
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
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              {onSignIn && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSignIn}
                  className="w-full justify-start"
                >
                  <LogIn className="w-4 h-4 mr-2" />
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

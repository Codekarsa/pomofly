import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  MapPin,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import {
  TimezoneAwareSessionManager,
  type DailySessionSummary
} from '@/lib/timezoneAwareTracking';
import {
  UserTimezoneManager,
  formatInUserTimezone,
} from '@/lib/timezone';

interface TimezoneAwareStatsProps {
  className?: string;
}

export const TimezoneAwareStats: React.FC<TimezoneAwareStatsProps> = ({ 
  className = '' 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState<'today' | 'week'>('today');
  const [dailySummary, setDailySummary] = useState<DailySessionSummary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<DailySessionSummary[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const timezone = UserTimezoneManager.getEffectiveTimezone();

  // Update stats when date or view changes
  useEffect(() => {
    if (selectedView === 'today') {
      const summary = TimezoneAwareSessionManager.getDailySummary(currentDate, timezone);
      setDailySummary(summary);
    } else {
      const weekly = TimezoneAwareSessionManager.getWeeklySummary(currentDate, timezone);
      setWeeklySummary(weekly);
    }
    
    // Update streak
    const streak = TimezoneAwareSessionManager.getCurrentStreak(timezone);
    setCurrentStreak(streak);
  }, [currentDate, selectedView, timezone]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (selectedView === 'today') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const resetToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    const todayStr = formatInUserTimezone(today.getTime(), 'yyyy-MM-dd', timezone);
    const dateStr = formatInUserTimezone(date.getTime(), 'yyyy-MM-dd', timezone);
    return todayStr === dateStr;
  };

  const renderTodayView = () => {
    if (!dailySummary) return null;

    const sessionsByType = {
      pomodoro: dailySummary.sessions.filter(s => s.phase === 'pomodoro'),
      shortBreak: dailySummary.sessions.filter(s => s.phase === 'shortBreak'),
      longBreak: dailySummary.sessions.filter(s => s.phase === 'longBreak'),
    };

    return (
      <div className="space-y-4">
        {/* Date Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {formatInUserTimezone(currentDate.getTime(), 'EEEE, MMMM d, yyyy', timezone)}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {timezone}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetToToday}
              className={isToday(currentDate) ? 'bg-muted' : ''}
            >
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Daily Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{sessionsByType.pomodoro.length}</div>
            <div className="text-sm text-muted-foreground">Pomodoros</div>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{formatDuration(dailySummary.totalTime)}</div>
            <div className="text-sm text-muted-foreground">Total Time</div>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{sessionsByType.shortBreak.length}</div>
            <div className="text-sm text-muted-foreground">Short Breaks</div>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{sessionsByType.longBreak.length}</div>
            <div className="text-sm text-muted-foreground">Long Breaks</div>
          </div>
        </div>

        {/* Session Timeline */}
        {dailySummary.sessions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Session Timeline</h4>
            <div className="space-y-1">
              {dailySummary.sessions
                .sort((a, b) => a.completedAtUTC - b.completedAtUTC)
                .map((session) => (
                <div 
                  key={session.id} 
                  className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded"
                >
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={session.phase === 'pomodoro' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {session.phase}
                    </Badge>
                    <span>
                      {formatInUserTimezone(session.completedAtUTC, 'HH:mm', timezone)}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {formatDuration(session.duration)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    if (!weeklySummary.length) return null;

    const weekTotal = weeklySummary.reduce((sum, day) => sum + day.totalPomodoros, 0);
    const weekTotalTime = weeklySummary.reduce((sum, day) => sum + day.totalTime, 0);

    return (
      <div className="space-y-4">
        {/* Week Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              Week of {formatInUserTimezone(weeklySummary[0].dayStartUTC, 'MMMM d', timezone)}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {timezone}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={resetToToday}>
              This Week
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Week Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{weekTotal}</div>
            <div className="text-sm text-muted-foreground">Total Pomodoros</div>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{formatDuration(weekTotalTime)}</div>
            <div className="text-sm text-muted-foreground">Total Time</div>
          </div>
        </div>

        {/* Daily Breakdown */}
        <div>
          <h4 className="text-sm font-medium mb-2">Daily Breakdown</h4>
          <div className="space-y-2">
            {weeklySummary.map((day) => {
              const dayDate = new Date(day.dayStartUTC);
              const dayIsToday = isToday(dayDate);
              
              return (
                <div 
                  key={day.date} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    dayIsToday ? 'bg-muted border-border' : 'bg-background'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatInUserTimezone(day.dayStartUTC, 'EEEE', timezone)}
                      </span>
                      {dayIsToday && <Badge variant="outline" className="text-xs">Today</Badge>}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatInUserTimezone(day.dayStartUTC, 'MMM d', timezone)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">{day.totalPomodoros}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDuration(day.totalTime)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Productivity Stats
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant={selectedView === 'today' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedView('today')}
            >
              Today
            </Button>
            <Button
              variant={selectedView === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedView('week')}
            >
              Week
            </Button>
          </div>
        </div>
        
        {/* Current Streak */}
        {currentStreak > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span>
              Current streak: <strong className="text-green-600">{currentStreak} day{currentStreak !== 1 ? 's' : ''}</strong>
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {selectedView === 'today' ? renderTodayView() : renderWeekView()}
      </CardContent>
    </Card>
  );
};

export default TimezoneAwareStats;
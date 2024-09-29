/* eslint-disable react/no-unescaped-entities */
'use client'

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useTasks } from '@/hooks/useTasks';

interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

interface PomodoroTimerProps {
  settings: PomodoroSettings;
}

export default function PomodoroTimer({ settings }: PomodoroTimerProps) {
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const { tasks, loading, error, incrementPomodoroSession } = useTasks();
  
  const [completedSessions, setCompletedSessions] = useState<{ date: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState(''); // State for search term
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for dropdown visibility

  const handlePomodoroComplete = useCallback(() => {
    if (user && selectedTaskId) {
      incrementPomodoroSession(selectedTaskId, settings.pomodoro);
      setCompletedSessions(prev => [...prev, { date: new Date().toISOString() }]);
    }
    console.log('Pomodoro phase completed!');
  }, [user, selectedTaskId, incrementPomodoroSession, settings.pomodoro]);

  const { 
    phase,
    minutes, 
    seconds, 
    isActive, 
    toggleTimer, 
    resetTimer,
    switchPhase
  } = usePomodoro(settings, handlePomodoroComplete);

  const timerKey = `${settings.pomodoro}-${settings.shortBreak}-${settings.longBreak}-${settings.longBreakInterval}`;

  const countTodaysSessions = () => {
    const today = new Date();
    return completedSessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate.toLocaleDateString() === today.toLocaleDateString();
    }).length;
  };

  const handleDoneNext = () => {
    if (user && selectedTaskId) {
      incrementPomodoroSession(selectedTaskId, settings.pomodoro);
      setCompletedSessions(prev => [...prev, { date: new Date().toISOString() }]);
    }
    switchPhase(phase === 'pomodoro' ? 'shortBreak' : 'pomodoro');
    resetTimer();
  };

  const filteredTasks = tasks.filter(task => 
    !task.completed && 
    (searchTerm === '' || task.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div key={timerKey} className="bg-[#f2f2f2] shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-2xl font-bold mb-4 text-[#1A1A1A]">Pomodoro Timer</h2>
      <div className="mb-4 text-lg text-[#1A1A1A]">
        <span className="font-semibold">Today's Pomodoro Sessions: </span>
        <span className="text-[#333333]">{countTodaysSessions()}</span>
      </div>
      {user && !loading && !error && (
        <div className="mb-1 relative"> {/* Added relative positioning for the icon */}
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)} // Open dropdown on focus
            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 100)} // Close dropdown after a short delay
            className="shadow-sm bg-white border-gray-300 rounded-md w-full py-2 px-3 text-[#1A1A1A] leading-tight focus:outline-none focus:ring-2 focus:ring-[#333333] focus:border-[#333333] transition duration-150 ease-in-out"
          />
          <span className="absolute right-3 top-2.5 text-[#1A1A1A]"> {/* Positioning the icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      )}
      {user && !loading && !error && (
        <div className="relative mb-4">
          <div>
            {isDropdownOpen && (
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setSearchTerm(task.title); // Set search term to selected task title
                        setIsDropdownOpen(false); // Close dropdown
                      }}
                      className="cursor-pointer hover:bg-gray-100 px-3 py-2 text-[#1A1A1A]"
                    >
                      {task.title}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-[#666666]">No tasks found</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="mb-4 flex justify-center">
        <button 
          onClick={() => switchPhase('pomodoro')} 
          className={`mr-2 ${phase === 'pomodoro' ? 'bg-[#333333] text-white' : 'bg-[#CCCCCC]'} px-4 py-2 rounded`}
        >
          Pomodoro
        </button>
        <button 
          onClick={() => switchPhase('shortBreak')} 
          className={`mr-2 ${phase === 'shortBreak' ? 'bg-[#333333] text-white' : 'bg-[#CCCCCC]'} px-4 py-2 rounded`}
        >
          Short Break
        </button>
        <button 
          onClick={() => switchPhase('longBreak')} 
          className={`${phase === 'longBreak' ? 'bg-[#333333] text-white' : 'bg-[#CCCCCC]'} px-4 py-2 rounded`}
        >
          Long Break
        </button>
      </div>
      <div className="text-8xl font-bold mb-4 text-[#1A1A1A] text-center py-6">
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
      <div className="flex justify-center mb-4">
        <button
          onClick={toggleTimer}
          className={`${
            isActive ? 'bg-[#666666] hover:bg-[#333333]' : 'bg-[#333333] hover:bg-[#1A1A1A]'
          } text-white font-bold py-2 px-4 rounded mr-2`}
        >
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={resetTimer}
          className="bg-[#666666] hover:bg-[#333333] text-white font-bold py-2 px-4 rounded"
        >
          Reset
        </button>
        {isActive && (
          <button
            onClick={handleDoneNext}
            className="bg-[#333333] hover:bg-[#1A1A1A] text-white font-bold py-2 px-4 rounded ml-2"
          >
            Done/Next
          </button>
        )}
      </div>
    </div>
  );
}
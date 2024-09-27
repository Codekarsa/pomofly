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
  
  const [completedSessions, setCompletedSessions] = useState<{ date: string }[]>([]); // State to track completed sessions

  const handlePomodoroComplete = useCallback(() => {
    if (user && selectedTaskId) {
      incrementPomodoroSession(selectedTaskId, settings.pomodoro);
      setCompletedSessions(prev => [...prev, { date: new Date().toISOString() }]); // Increment completed sessions
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

  // Use a key that changes when settings change
  const timerKey = `${settings.pomodoro}-${settings.shortBreak}-${settings.longBreak}-${settings.longBreakInterval}`;

  // Function to count today's completed sessions
  const countTodaysSessions = () => {
    const today = new Date();
    return completedSessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate.toLocaleDateString() === today.toLocaleDateString();
    }).length;
  };

  // Function to handle the Done/Next button click
  const handleDoneNext = () => {
    if (user && selectedTaskId) {
      incrementPomodoroSession(selectedTaskId, settings.pomodoro);
      setCompletedSessions(prev => [...prev, { date: new Date().toISOString() }]); // Increment completed sessions
    }
    switchPhase(phase === 'pomodoro' ? 'shortBreak' : 'pomodoro'); // Switch to the next phase
    resetTimer(); // Reset the timer for the next phase
  };

  return (
    <div key={timerKey} className="bg-[#f2f2f2] shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-2xl font-bold mb-4 text-[#1A1A1A]">Pomodoro Timer</h2>
      <div className="mb-4 text-lg text-[#1A1A1A]">
        <span className="font-semibold">Today's Pomodoro Sessions: </span>
        <span className="text-[#333333]">{countTodaysSessions()}</span>
      </div>
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
      {user && !loading && !error && (
        <div className="mb-4">
          <select
            id="taskSelect"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="shadow-sm bg-white border-gray-300 rounded-md w-full py-2 px-3 text-[#1A1A1A] leading-tight focus:outline-none focus:ring-2 focus:ring-[#333333] focus:border-[#333333] bg-[#f2f2f2] transition duration-150 ease-in-out"
          >
            <option value="">Select a task (optional)</option>
            {tasks.filter(task => !task.completed).map((task) => (
              <option key={task.id} value={task.id}>{task.title}</option>
            ))}
          </select>
        </div>
      )}
      <div className="text-6xl font-bold mb-4 text-[#1A1A1A] text-center py-6">
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
        {isActive && ( // Show Done/Next button only if the timer is active
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
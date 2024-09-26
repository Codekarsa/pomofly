'use client'

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useTasks } from '@/hooks/useTasks';

export default function PomodoroTimer() {
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const { tasks, loading, error, incrementPomodoroSession } = useTasks();
  
  const handlePomodoroComplete = useCallback(() => {
    if (user && selectedTaskId) {
      incrementPomodoroSession(selectedTaskId, 25);
    }
    // You could add some notification or sound here for timer completion
    console.log('Pomodoro completed!');
  }, [user, selectedTaskId, incrementPomodoroSession]);

  const { 
    minutes, 
    seconds, 
    isActive, 
    toggleTimer, 
    resetTimer 
  } = usePomodoro(25, handlePomodoroComplete);

  return (
    <div className="bg-[#f2f2f2] shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-2xl font-bold mb-4 text-[#1A1A1A]">Pomodoro Timer</h2>
      {user && !loading && !error && (
        <div className="mb-4">
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-[#1A1A1A] leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="">Select a task (optional)</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>{task.title}</option>
            ))}
          </select>
          <p className="mt-2 text-sm text-[#333333]">
            {selectedTaskId 
              ? "Timer will be saved to the selected task." 
              : "Timer will run without saving to any task."}
          </p>
        </div>
      )}
      <div className="text-6xl font-bold mb-4 text-[#1A1A1A]">
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
      <div className="flex justify-center">
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
      </div>
    </div>
  );
}
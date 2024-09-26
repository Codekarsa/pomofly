'use client'

import { signOut } from "firebase/auth";
import { auth } from '../lib/firebase';
import ProjectList from './ProjectList';
import TaskList from './TaskList';
import PomodoroTimer from './PomodoroTimer';

export default function Dashboard() {
  const handleSignOut = () => {
    signOut(auth).catch((error) => {
      console.error("Error signing out", error);
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Pomodoro Dashboard</h1>
        <button
          onClick={handleSignOut}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Sign Out
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <ProjectList />
          <TaskList />
        </div>
        <div>
          <PomodoroTimer />
        </div>
      </div>
    </div>
  );
}
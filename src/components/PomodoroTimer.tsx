'use client'

import { useState, useEffect } from 'react';
import { addDoc, collection } from "firebase/firestore";
import { db, auth } from '../lib/firebase';

export default function PomodoroTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        }
        if (seconds === 0) {
          if (minutes === 0) {
            clearInterval(interval!);
            setIsActive(false);
            onPomodoroComplete();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        }
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval!);
    }
    return () => clearInterval(interval!);
  }, [isActive, minutes, seconds]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(25);
    setSeconds(0);
  };

  const onPomodoroComplete = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        await addDoc(collection(db, "pomodoros"), {
          userId: user.uid,
          completedAt: new Date(),
          duration: 25, // assuming 25-minute pomodoros
        });
      } catch (error) {
        console.error("Error saving pomodoro", error);
      }
    }
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-2xl font-bold mb-4">Pomodoro Timer</h2>
      <div className="text-6xl font-bold mb-4">
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
      <div className="flex justify-center">
        <button
          onClick={toggleTimer}
          className={`${
            isActive ? 'bg-red-500 hover:bg-red-700' : 'bg-green-500 hover:bg-green-700'
          } text-white font-bold py-2 px-4 rounded mr-2`}
        >
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={resetTimer}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
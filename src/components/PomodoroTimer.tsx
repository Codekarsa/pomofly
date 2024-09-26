'use client'

import { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc, increment, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from '../lib/firebase';

interface Task {
  id: string;
  title: string;
}

export default function PomodoroTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const unsubscribe = onSnapshot(
        query(collection(db, "tasks"), where("userId", "==", user.uid), where("completed", "==", false)),
        (querySnapshot) => {
          const taskList: Task[] = [];
          querySnapshot.forEach((doc) => {
            taskList.push({ id: doc.id, ...doc.data() } as Task);
          });
          setTasks(taskList);
        }
      );
      return () => unsubscribe();
    }
  }, []);

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
    if (!isActive && selectedTaskId) {
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(25);
    setSeconds(0);
  };

  const onPomodoroComplete = async () => {
    const user = auth.currentUser;
    if (user && selectedTaskId) {
      try {
        // Add pomodoro session
        await addDoc(collection(db, "pomodoroSessions"), {
          userId: user.uid,
          taskId: selectedTaskId,
          duration: 25,
          startTime: new Date(Date.now() - 25 * 60 * 1000),
          endTime: new Date(),
        });

        // Update task
        await updateDoc(doc(db, "tasks", selectedTaskId), {
          totalPomodoroSessions: increment(1),
          totalTimeSpent: increment(25),
        });
      } catch (error) {
        console.error("Error saving pomodoro session", error);
      }
    }
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-2xl font-bold mb-4">Pomodoro Timer</h2>
      <select
        value={selectedTaskId}
        onChange={(e) => setSelectedTaskId(e.target.value)}
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-4"
      >
        <option value="">Select a task</option>
        {tasks.map((task) => (
          <option key={task.id} value={task.id}>{task.title}</option>
        ))}
      </select>
      <div className="text-6xl font-bold mb-4">
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
      <div className="flex justify-center">
        <button
          onClick={toggleTimer}
          className={`${
            isActive ? 'bg-red-500 hover:bg-red-700' : 'bg-green-500 hover:bg-green-700'
          } text-white font-bold py-2 px-4 rounded mr-2`}
          disabled={!selectedTaskId}
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
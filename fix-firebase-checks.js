const fs = require('fs');

// Read the file
const filePath = 'src/hooks/useTasks.ts';
let content = fs.readFileSync(filePath, 'utf8');

// List of function names that need Firebase checks and their guest mode implementations
const functions = [
  {
    name: 'deleteTask',
    guestCode: `      deleteGuestTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      return;`,
  },
  {
    name: 'toggleTaskCompletion',
    guestCode: `      updateGuestTask(id, { completed: !currentCompletionState });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !currentCompletionState } : t));
      return;`,
  },
  {
    name: 'incrementPomodoroSession',
    guestCode: `      updateGuestTask(id, { 
        totalPomodoroSessions: (tasks.find(t => t.id === id)?.totalPomodoroSessions || 0) + 1,
        totalTimeSpent: (tasks.find(t => t.id === id)?.totalTimeSpent || 0) + duration
      });
      setTasks(prev => prev.map(t => t.id === id ? { 
        ...t, 
        totalPomodoroSessions: t.totalPomodoroSessions + 1,
        totalTimeSpent: t.totalTimeSpent + duration
      } : t));
      return;`,
  },
  {
    name: 'archiveTask',
    guestCode: `      updateGuestTask(id, { archived: true });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, archived: true } : t));
      return;`,
  },
  {
    name: 'toggleTaskFocus',
    guestCode: `      updateGuestTask(id, { focus: !currentFocusState });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, focus: !currentFocusState } : t));
      return;`,
  },
  {
    name: 'setTaskDeadline',
    guestCode: `      updateGuestTask(id, { deadline });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, deadline } : t));
      return;`,
  },
  {
    name: 'startTimeTracking',
    guestCode: `      const now = new Date();
      updateGuestTask(taskId, { trackingStartedAt: now });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, trackingStartedAt: now } : t));
      return;`,
  },
  {
    name: 'stopTimeTracking',
    guestCode: `      updateGuestTask(taskId, { 
        trackingStartedAt: null,
        manualTimeSpent: (tasks.find(t => t.id === taskId)?.manualTimeSpent || 0) + elapsedSeconds
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { 
        ...t, 
        trackingStartedAt: null,
        manualTimeSpent: t.manualTimeSpent + elapsedSeconds
      } : t));
      return;`,
  },
  {
    name: 'startAllTimeTracking',
    guestCode: `      const now = new Date().toISOString();
      taskIds.forEach(taskId => {
        updateGuestTask(taskId, { trackingStartedAt: now });
      });
      setTasks(prev => prev.map(t => 
        taskIds.includes(t.id) ? { ...t, trackingStartedAt: now } : t
      ));
      return;`,
  },
  {
    name: 'stopAllTimeTracking',
    guestCode: `      tasksToStop.forEach(({ taskId, elapsedSeconds }) => {
        updateGuestTask(taskId, { 
          trackingStartedAt: null,
          manualTimeSpent: (tasks.find(t => t.id === taskId)?.manualTimeSpent || 0) + elapsedSeconds
        });
      });
      setTasks(prev => prev.map(t => {
        const taskToStop = tasksToStop.find(ts => ts.taskId === t.id);
        return taskToStop ? { ...t, trackingStartedAt: null, manualTimeSpent: t.manualTimeSpent + taskToStop.elapsedSeconds } : t;
      }));
      return;`,
  },
];

// Process each function
functions.forEach(({ name, guestCode }) => {
  const regex = new RegExp(
    `(const ${name} = useCallback\\(async \\([^)]+\\) => \\{)`,
    'g'
  );

  content = content.replace(regex, (match) => {
    return (
      match +
      `
    if (!isFirebaseConfigured() || !auth || !db) {
      // Firebase not configured - use guest mode
${guestCode}
    }
`
    );
  });
});

// Write the fixed file
fs.writeFileSync(filePath, content);
console.log('Fixed Firebase configuration checks for all functions');

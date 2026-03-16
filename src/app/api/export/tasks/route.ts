import { NextRequest, NextResponse } from 'next/server';
import { validateAuth, checkRateLimit } from '@/lib/auth-middleware';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { transformFirebaseTask, transformFirebaseProject, transformFirebaseEstimationRecord } from '@/lib/validation';
import type { Task, Project, EstimationRecord } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const authResult = await validateAuth(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', details: authResult.error },
        { status: 401 }
      );
    }

    // Rate limiting check - 10 exports per hour
    const rateLimitResult = checkRateLimit(authResult.uid!, 10, 3600000); // 10 requests per hour
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          details: 'Too many export requests. Please try again later.',
          resetTime: rateLimitResult.resetTime
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const includeCompleted = searchParams.get('includeCompleted') !== 'false';
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const projectId = searchParams.get('projectId');

    // Validate format
    const validFormats = ['json', 'csv', 'ical'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format', details: `Format must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate date range
    let dateFilter: { start?: Date; end?: Date } = {};
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start date', details: 'Start date must be in YYYY-MM-DD format' },
          { status: 400 }
        );
      }
      dateFilter.start = start;
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59.999Z'); // End of day
      if (isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Invalid end date', details: 'End date must be in YYYY-MM-DD format' },
          { status: 400 }
        );
      }
      dateFilter.end = end;
    }

    const userId = authResult.uid!;

    // Build tasks query
    let tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    // Fetch tasks
    const tasksSnapshot = await getDocs(tasksQuery);
    let tasks: Task[] = [];
    
    for (const docSnap of tasksSnapshot.docs) {
      try {
        const task = transformFirebaseTask({ id: docSnap.id, ...docSnap.data() });
        
        // Apply filters
        if (!includeCompleted && task.completed) continue;
        if (!includeArchived && task.archived) continue;
        if (projectId && task.projectId !== projectId) continue;
        if (dateFilter.start && task.createdAt < dateFilter.start) continue;
        if (dateFilter.end && task.createdAt > dateFilter.end) continue;
        
        tasks.push(task);
      } catch (error) {
        console.warn('Skipping invalid task document:', docSnap.id, error);
      }
    }

    // Fetch projects
    const projectsQuery = query(
      collection(db, 'projects'),
      where('userId', '==', userId)
    );
    const projectsSnapshot = await getDocs(projectsQuery);
    const projects: Record<string, Project> = {};
    
    for (const docSnap of projectsSnapshot.docs) {
      try {
        const project = transformFirebaseProject({ id: docSnap.id, ...docSnap.data() });
        projects[project.id] = project;
      } catch (error) {
        console.warn('Skipping invalid project document:', docSnap.id, error);
      }
    }

    // Fetch estimation records for included tasks
    const taskIds = tasks.map(t => t.id);
    let estimationRecords: EstimationRecord[] = [];
    
    if (taskIds.length > 0) {
      // Firestore 'in' queries are limited to 10 items, so we need to batch if more tasks
      const batches = [];
      for (let i = 0; i < taskIds.length; i += 10) {
        const batch = taskIds.slice(i, i + 10);
        batches.push(batch);
      }

      for (const batch of batches) {
        const estimationQuery = query(
          collection(db, 'estimationRecords'),
          where('userId', '==', userId),
          where('taskId', 'in', batch)
        );
        const estimationSnapshot = await getDocs(estimationQuery);
        
        for (const docSnap of estimationSnapshot.docs) {
          try {
            const record = transformFirebaseEstimationRecord({ id: docSnap.id, ...docSnap.data() });
            estimationRecords.push(record);
          } catch (error) {
            console.warn('Skipping invalid estimation record:', docSnap.id, error);
          }
        }
      }
    }

    // Generate export based on format
    switch (format) {
      case 'json':
        return handleJsonExport(tasks, projects, estimationRecords);
      
      case 'csv':
        return handleCsvExport(tasks, projects, estimationRecords);
      
      case 'ical':
        return handleIcalExport(tasks, projects);
      
      default:
        return NextResponse.json(
          { error: 'Unsupported format', details: `Format ${format} is not supported` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error exporting tasks:', error);
    
    return NextResponse.json(
      { 
        error: 'Export failed', 
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

function handleJsonExport(tasks: Task[], projects: Record<string, Project>, estimationRecords: EstimationRecord[]) {
  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      totalTasks: tasks.length,
      totalProjects: Object.keys(projects).length,
      totalEstimationRecords: estimationRecords.length,
    },
    tasks: tasks.map(task => ({
      ...task,
      projectName: projects[task.projectId]?.name || 'Unknown Project',
      createdAt: task.createdAt.toISOString(),
      trackingStartedAt: task.trackingStartedAt?.toISOString() || null,
      completedAt: task.completedAt?.toISOString() || null,
    })),
    projects: Object.values(projects).map(project => ({
      ...project,
      createdAt: project.createdAt.toISOString(),
    })),
    estimationRecords: estimationRecords.map(record => ({
      ...record,
      createdAt: record.createdAt.toISOString(),
      completedAt: record.completedAt.toISOString(),
    })),
  };

  const filename = `pomofly-export-${new Date().toISOString().split('T')[0]}.json`;
  
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    },
  });
}

function handleCsvExport(tasks: Task[], projects: Record<string, Project>, estimationRecords: EstimationRecord[]) {
  // CSV headers
  const headers = [
    'Task ID',
    'Title',
    'Project',
    'Completed',
    'Archived',
    'Focus',
    'Deadline',
    'Created At',
    'Completed At',
    'Total Pomodoro Sessions',
    'Total Time Spent (minutes)',
    'Manual Time Spent (minutes)',
    'Estimated Pomodoros',
    'Completed Pomodoros',
    'Estimation Source',
    'AI Suggested Estimate',
    'Tracking Started At',
    'Label IDs'
  ];

  // Convert tasks to CSV rows
  const csvRows = [headers.join(',')];
  
  tasks.forEach(task => {
    const projectName = projects[task.projectId]?.name || 'Unknown Project';
    const row = [
      task.id,
      `"${task.title.replace(/"/g, '""')}"`, // Escape quotes in title
      `"${projectName.replace(/"/g, '""')}"`,
      task.completed,
      task.archived || false,
      task.focus,
      task.deadline || '',
      task.createdAt.toISOString(),
      task.completedAt?.toISOString() || '',
      task.totalPomodoroSessions,
      Math.round(task.totalTimeSpent / 60), // Convert seconds to minutes
      Math.round(task.manualTimeSpent / 60), // Convert seconds to minutes
      task.estimatedPomodoros || '',
      task.completedPomodoros || '',
      task.estimationSource || '',
      task.aiSuggestedEstimate || '',
      task.trackingStartedAt?.toISOString() || '',
      `"${(task.labelIds || []).join(';')}"` // Semicolon-separated labels
    ];
    csvRows.push(row.join(','));
  });

  const csvContent = csvRows.join('\n');
  const filename = `pomofly-tasks-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    },
  });
}

function handleIcalExport(tasks: Task[], projects: Record<string, Project>) {
  // Filter tasks with deadlines
  const tasksWithDeadlines = tasks.filter(task => task.deadline);

  // Generate iCal content
  const icalLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pomofly//Task Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  tasksWithDeadlines.forEach((task, index) => {
    if (!task.deadline) return;

    const projectName = projects[task.projectId]?.name || 'Unknown Project';
    const uid = `task-${task.id}-${Date.now()}@pomofly.com`;
    const deadlineDate = new Date(task.deadline);
    
    // Format date for iCal (YYYYMMDD)
    const dateStr = deadlineDate.toISOString().split('T')[0].replace(/-/g, '');
    
    icalLines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${dateStr}`,
      `SUMMARY:${task.title}`,
      `DESCRIPTION:Project: ${projectName}\\nEstimated Pomodoros: ${task.estimatedPomodoros || 'Not set'}\\nCompleted: ${task.completed ? 'Yes' : 'No'}`,
      `CATEGORIES:${projectName}`,
      `STATUS:${task.completed ? 'COMPLETED' : 'CONFIRMED'}`,
      'END:VEVENT'
    );
  });

  icalLines.push('END:VCALENDAR');

  const icalContent = icalLines.join('\r\n');
  const filename = `pomofly-calendar-${new Date().toISOString().split('T')[0]}.ics`;

  return new NextResponse(icalContent, {
    headers: {
      'Content-Type': 'text/calendar',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    },
  });
}
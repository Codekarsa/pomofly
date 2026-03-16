import { NextRequest, NextResponse } from 'next/server';
import { validateAuth, checkRateLimit } from '@/lib/auth-middleware';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { transformFirebaseTask, transformFirebaseProject, transformFirebaseEstimationRecord } from '@/lib/validation';
import type { Task, Project, EstimationRecord } from '@/lib/validation';

interface ProductivityMetrics {
  totalTasks: number;
  completedTasks: number;
  totalPomodoroSessions: number;
  totalTimeSpentHours: number;
  averageTaskCompletionTime: number;
  estimationAccuracy: number;
  productivityByProject: Record<string, ProjectMetrics>;
  dailyProductivity: DailyMetrics[];
  weeklyProductivity: WeeklyMetrics[];
  monthlyProductivity: MonthlyMetrics[];
}

interface ProjectMetrics {
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  totalPomodoros: number;
  totalTimeHours: number;
  averageEstimationAccuracy: number;
}

interface DailyMetrics {
  date: string;
  tasksCompleted: number;
  pomodorosCompleted: number;
  timeSpentHours: number;
  focusScore: number;
}

interface WeeklyMetrics {
  weekStart: string;
  weekEnd: string;
  tasksCompleted: number;
  pomodorosCompleted: number;
  timeSpentHours: number;
  averageFocusScore: number;
  topProject: string;
}

interface MonthlyMetrics {
  month: string;
  year: number;
  tasksCompleted: number;
  pomodorosCompleted: number;
  timeSpentHours: number;
  averageFocusScore: number;
  topProjects: string[];
}

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

    // Rate limiting check - 5 analytics exports per hour
    const rateLimitResult = checkRateLimit(authResult.uid!, 5, 3600000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          details: 'Too many analytics export requests. Please try again later.',
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
    const period = searchParams.get('period') || 'all'; // all, 30d, 90d, 1y
    const includeRawData = searchParams.get('includeRawData') === 'true';

    // Validate format
    const validFormats = ['json', 'csv', 'pdf'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format', details: `Format must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Calculate date range based on period
    let startDate: Date | undefined;
    const endDate = new Date();
    
    switch (period) {
      case '30d':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default: // 'all'
        startDate = undefined;
    }

    const userId = authResult.uid!;

    // Fetch all user data
    const [tasks, projects, estimationRecords] = await Promise.all([
      fetchUserTasks(userId, startDate, endDate),
      fetchUserProjects(userId),
      fetchUserEstimationRecords(userId, startDate, endDate)
    ]);

    // Calculate analytics
    const analytics = calculateProductivityMetrics(tasks, projects, estimationRecords);

    // Generate export based on format
    switch (format) {
      case 'json':
        return handleJsonAnalyticsExport(analytics, tasks, projects, estimationRecords, includeRawData);
      
      case 'csv':
        return handleCsvAnalyticsExport(analytics);
      
      case 'pdf':
        return handlePdfAnalyticsExport(analytics);
      
      default:
        return NextResponse.json(
          { error: 'Unsupported format', details: `Format ${format} is not supported` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error exporting analytics:', error);
    
    return NextResponse.json(
      { 
        error: 'Analytics export failed', 
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

async function fetchUserTasks(userId: string, startDate?: Date, endDate?: Date): Promise<Task[]> {
  const tasksQuery = query(
    collection(db, 'tasks'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(tasksQuery);
  const tasks: Task[] = [];

  for (const docSnap of snapshot.docs) {
    try {
      const task = transformFirebaseTask({ id: docSnap.id, ...docSnap.data() });
      
      // Apply date filter if specified
      if (startDate && task.createdAt < startDate) continue;
      if (endDate && task.createdAt > endDate) continue;
      
      tasks.push(task);
    } catch (error) {
      console.warn('Skipping invalid task document:', docSnap.id, error);
    }
  }

  return tasks;
}

async function fetchUserProjects(userId: string): Promise<Record<string, Project>> {
  const projectsQuery = query(
    collection(db, 'projects'),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(projectsQuery);
  const projects: Record<string, Project> = {};

  for (const docSnap of snapshot.docs) {
    try {
      const project = transformFirebaseProject({ id: docSnap.id, ...docSnap.data() });
      projects[project.id] = project;
    } catch (error) {
      console.warn('Skipping invalid project document:', docSnap.id, error);
    }
  }

  return projects;
}

async function fetchUserEstimationRecords(userId: string, startDate?: Date, endDate?: Date): Promise<EstimationRecord[]> {
  const recordsQuery = query(
    collection(db, 'estimationRecords'),
    where('userId', '==', userId),
    orderBy('completedAt', 'desc')
  );

  const snapshot = await getDocs(recordsQuery);
  const records: EstimationRecord[] = [];

  for (const docSnap of snapshot.docs) {
    try {
      const record = transformFirebaseEstimationRecord({ id: docSnap.id, ...docSnap.data() });
      
      // Apply date filter if specified
      if (startDate && record.completedAt < startDate) continue;
      if (endDate && record.completedAt > endDate) continue;
      
      records.push(record);
    } catch (error) {
      console.warn('Skipping invalid estimation record:', docSnap.id, error);
    }
  }

  return records;
}

function calculateProductivityMetrics(tasks: Task[], projects: Record<string, Project>, estimationRecords: EstimationRecord[]): ProductivityMetrics {
  const completedTasks = tasks.filter(t => t.completed);
  const totalPomodoros = tasks.reduce((sum, t) => sum + t.totalPomodoroSessions, 0);
  const totalTimeSeconds = tasks.reduce((sum, t) => sum + t.totalTimeSpent + t.manualTimeSpent, 0);
  const totalTimeHours = totalTimeSeconds / 3600;

  // Calculate average task completion time
  const completedTasksWithTime = completedTasks.filter(t => t.completedAt);
  const avgCompletionTime = completedTasksWithTime.length > 0
    ? completedTasksWithTime.reduce((sum, t) => {
        const createdAt = t.createdAt.getTime();
        const completedAt = t.completedAt!.getTime();
        return sum + (completedAt - createdAt);
      }, 0) / completedTasksWithTime.length / (1000 * 60 * 60 * 24) // Convert to days
    : 0;

  // Calculate estimation accuracy
  const validRecords = estimationRecords.filter(r => r.estimatedPomodoros > 0 && r.actualPomodoros > 0);
  const avgEstimationAccuracy = validRecords.length > 0
    ? validRecords.reduce((sum, r) => sum + r.accuracy, 0) / validRecords.length * 100
    : 0;

  // Calculate project metrics
  const projectMetrics: Record<string, ProjectMetrics> = {};
  Object.values(projects).forEach(project => {
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const projectCompleted = projectTasks.filter(t => t.completed);
    const projectPomodoros = projectTasks.reduce((sum, t) => sum + t.totalPomodoroSessions, 0);
    const projectTimeSeconds = projectTasks.reduce((sum, t) => sum + t.totalTimeSpent + t.manualTimeSpent, 0);
    const projectEstimationRecords = estimationRecords.filter(r => r.projectId === project.id);
    const projectEstimationAccuracy = projectEstimationRecords.length > 0
      ? projectEstimationRecords.reduce((sum, r) => sum + r.accuracy, 0) / projectEstimationRecords.length * 100
      : 0;

    projectMetrics[project.id] = {
      projectName: project.name,
      totalTasks: projectTasks.length,
      completedTasks: projectCompleted.length,
      totalPomodoros: projectPomodoros,
      totalTimeHours: projectTimeSeconds / 3600,
      averageEstimationAccuracy: projectEstimationAccuracy,
    };
  });

  // Calculate daily productivity
  const dailyMetrics = calculateDailyMetrics(tasks, projects);
  const weeklyMetrics = calculateWeeklyMetrics(dailyMetrics);
  const monthlyMetrics = calculateMonthlyMetrics(dailyMetrics);

  return {
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    totalPomodoroSessions: totalPomodoros,
    totalTimeSpentHours: totalTimeHours,
    averageTaskCompletionTime: avgCompletionTime,
    estimationAccuracy: avgEstimationAccuracy,
    productivityByProject: projectMetrics,
    dailyProductivity: dailyMetrics,
    weeklyProductivity: weeklyMetrics,
    monthlyProductivity: monthlyMetrics,
  };
}

function calculateDailyMetrics(tasks: Task[], projects: Record<string, Project>): DailyMetrics[] {
  const dailyData: Record<string, DailyMetrics> = {};

  tasks.forEach(task => {
    const dateStr = task.createdAt.toISOString().split('T')[0];
    
    if (!dailyData[dateStr]) {
      dailyData[dateStr] = {
        date: dateStr,
        tasksCompleted: 0,
        pomodorosCompleted: 0,
        timeSpentHours: 0,
        focusScore: 0,
      };
    }

    if (task.completed) {
      dailyData[dateStr].tasksCompleted++;
    }
    dailyData[dateStr].pomodorosCompleted += task.totalPomodoroSessions;
    dailyData[dateStr].timeSpentHours += (task.totalTimeSpent + task.manualTimeSpent) / 3600;
    dailyData[dateStr].focusScore += task.focus ? 1 : 0;
  });

  // Calculate focus score as percentage
  Object.values(dailyData).forEach(day => {
    const tasksOnDay = tasks.filter(t => t.createdAt.toISOString().split('T')[0] === day.date);
    day.focusScore = tasksOnDay.length > 0 ? (day.focusScore / tasksOnDay.length) * 100 : 0;
  });

  return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateWeeklyMetrics(dailyMetrics: DailyMetrics[]): WeeklyMetrics[] {
  // Group daily metrics by week
  const weeklyData: Record<string, DailyMetrics[]> = {};
  
  dailyMetrics.forEach(day => {
    const date = new Date(day.date);
    const weekStart = getWeekStart(date);
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = [];
    }
    weeklyData[weekKey].push(day);
  });

  return Object.entries(weeklyData).map(([weekStart, days]) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const totalTasks = days.reduce((sum, d) => sum + d.tasksCompleted, 0);
    const totalPomodoros = days.reduce((sum, d) => sum + d.pomodorosCompleted, 0);
    const totalTime = days.reduce((sum, d) => sum + d.timeSpentHours, 0);
    const avgFocus = days.reduce((sum, d) => sum + d.focusScore, 0) / days.length;

    return {
      weekStart: start.toISOString().split('T')[0],
      weekEnd: end.toISOString().split('T')[0],
      tasksCompleted: totalTasks,
      pomodorosCompleted: totalPomodoros,
      timeSpentHours: totalTime,
      averageFocusScore: avgFocus,
      topProject: 'N/A', // Would need additional data to calculate
    };
  }).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

function calculateMonthlyMetrics(dailyMetrics: DailyMetrics[]): MonthlyMetrics[] {
  const monthlyData: Record<string, DailyMetrics[]> = {};
  
  dailyMetrics.forEach(day => {
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = [];
    }
    monthlyData[monthKey].push(day);
  });

  return Object.entries(monthlyData).map(([monthKey, days]) => {
    const [year, month] = monthKey.split('-');
    const totalTasks = days.reduce((sum, d) => sum + d.tasksCompleted, 0);
    const totalPomodoros = days.reduce((sum, d) => sum + d.pomodorosCompleted, 0);
    const totalTime = days.reduce((sum, d) => sum + d.timeSpentHours, 0);
    const avgFocus = days.reduce((sum, d) => sum + d.focusScore, 0) / days.length;

    return {
      month: new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' }),
      year: parseInt(year),
      tasksCompleted: totalTasks,
      pomodorosCompleted: totalPomodoros,
      timeSpentHours: totalTime,
      averageFocusScore: avgFocus,
      topProjects: [], // Would need additional data to calculate
    };
  }).sort((a, b) => a.year - b.year || a.month.localeCompare(b.month));
}

function getWeekStart(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
}

function handleJsonAnalyticsExport(
  analytics: ProductivityMetrics, 
  tasks: Task[], 
  projects: Record<string, Project>, 
  estimationRecords: EstimationRecord[],
  includeRawData: boolean
) {
  const exportData: any = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      type: 'analytics',
    },
    summary: {
      totalTasks: analytics.totalTasks,
      completedTasks: analytics.completedTasks,
      completionRate: analytics.totalTasks > 0 ? (analytics.completedTasks / analytics.totalTasks * 100) : 0,
      totalPomodoroSessions: analytics.totalPomodoroSessions,
      totalTimeSpentHours: Math.round(analytics.totalTimeSpentHours * 100) / 100,
      averageTaskCompletionDays: Math.round(analytics.averageTaskCompletionTime * 100) / 100,
      estimationAccuracy: Math.round(analytics.estimationAccuracy * 100) / 100,
    },
    productivity: {
      byProject: analytics.productivityByProject,
      daily: analytics.dailyProductivity,
      weekly: analytics.weeklyProductivity,
      monthly: analytics.monthlyProductivity,
    },
  };

  if (includeRawData) {
    exportData.rawData = {
      tasks: tasks.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        completedAt: t.completedAt?.toISOString(),
        trackingStartedAt: t.trackingStartedAt?.toISOString(),
      })),
      projects: Object.values(projects).map(p => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
      estimationRecords: estimationRecords.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        completedAt: r.completedAt.toISOString(),
      })),
    };
  }

  const filename = `pomofly-analytics-${new Date().toISOString().split('T')[0]}.json`;
  
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    },
  });
}

function handleCsvAnalyticsExport(analytics: ProductivityMetrics) {
  // Create CSV with multiple sheets worth of data
  const sections = [
    '=== PRODUCTIVITY SUMMARY ===',
    `Total Tasks,${analytics.totalTasks}`,
    `Completed Tasks,${analytics.completedTasks}`,
    `Completion Rate,${analytics.totalTasks > 0 ? Math.round(analytics.completedTasks / analytics.totalTasks * 10000) / 100 : 0}%`,
    `Total Pomodoro Sessions,${analytics.totalPomodoroSessions}`,
    `Total Time Spent (hours),${Math.round(analytics.totalTimeSpentHours * 100) / 100}`,
    `Average Task Completion (days),${Math.round(analytics.averageTaskCompletionTime * 100) / 100}`,
    `Estimation Accuracy,${Math.round(analytics.estimationAccuracy * 100) / 100}%`,
    '',
    '=== PROJECT BREAKDOWN ===',
    'Project Name,Total Tasks,Completed Tasks,Total Pomodoros,Total Hours,Estimation Accuracy',
  ];

  Object.values(analytics.productivityByProject).forEach(project => {
    sections.push(
      `"${project.projectName}",${project.totalTasks},${project.completedTasks},${project.totalPomodoros},${Math.round(project.totalTimeHours * 100) / 100},${Math.round(project.averageEstimationAccuracy * 100) / 100}%`
    );
  });

  sections.push('', '=== DAILY PRODUCTIVITY ===', 'Date,Tasks Completed,Pomodoros,Hours Spent,Focus Score');
  
  analytics.dailyProductivity.forEach(day => {
    sections.push(
      `${day.date},${day.tasksCompleted},${day.pomodorosCompleted},${Math.round(day.timeSpentHours * 100) / 100},${Math.round(day.focusScore * 100) / 100}%`
    );
  });

  const csvContent = sections.join('\n');
  const filename = `pomofly-analytics-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    },
  });
}

function handlePdfAnalyticsExport(analytics: ProductivityMetrics) {
  // For now, return a simple text-based report that could be converted to PDF
  // In a full implementation, you'd use a library like puppeteer or PDFKit
  
  const report = `
POMOFLY PRODUCTIVITY REPORT
Generated: ${new Date().toISOString()}

=== SUMMARY ===
Total Tasks: ${analytics.totalTasks}
Completed Tasks: ${analytics.completedTasks} (${analytics.totalTasks > 0 ? Math.round(analytics.completedTasks / analytics.totalTasks * 10000) / 100 : 0}%)
Total Pomodoro Sessions: ${analytics.totalPomodoroSessions}
Total Time Spent: ${Math.round(analytics.totalTimeSpentHours * 100) / 100} hours
Average Task Completion: ${Math.round(analytics.averageTaskCompletionTime * 100) / 100} days
Estimation Accuracy: ${Math.round(analytics.estimationAccuracy * 100) / 100}%

=== PROJECT BREAKDOWN ===
${Object.values(analytics.productivityByProject).map(p => 
  `${p.projectName}: ${p.completedTasks}/${p.totalTasks} tasks (${p.totalPomodoros} pomodoros, ${Math.round(p.totalTimeHours * 100) / 100}h)`
).join('\n')}

=== RECENT DAILY PRODUCTIVITY ===
${analytics.dailyProductivity.slice(-7).map(d => 
  `${d.date}: ${d.tasksCompleted} tasks, ${d.pomodorosCompleted} pomodoros, ${Math.round(d.timeSpentHours * 100) / 100}h`
).join('\n')}
  `.trim();

  const filename = `pomofly-analytics-report-${new Date().toISOString().split('T')[0]}.txt`;

  return new NextResponse(report, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    },
  });
}
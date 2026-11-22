// Calendar dates stay in local time; UTC conversion shifts work to the wrong day.
export function taskDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function shiftTaskDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return taskDateKey(new Date(year, month - 1, day + days, 12));
}

export function formatTaskDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Plans start weeks on Monday.
export function startOfTaskWeek(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return shiftTaskDate(date, -((new Date(year, month - 1, day, 12).getDay() + 6) % 7));
}

export function shiftTaskMonth(date: string, months: number): string {
  const [year, month] = date.split('-').map(Number);
  return taskDateKey(new Date(year, month - 1 + months, 1, 12));
}

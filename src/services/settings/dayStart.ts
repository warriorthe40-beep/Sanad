const KEY = 'sanad:dayStartHour';

export type DayStartHour = 0 | 6;

export function getDayStart(): DayStartHour {
  return localStorage.getItem(KEY) === '6' ? 6 : 0;
}

export function setDayStart(hour: DayStartHour): void {
  localStorage.setItem(KEY, String(hour));
}

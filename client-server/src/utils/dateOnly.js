import { DateTime } from 'luxon';

export const dateOnly = (value) => value ? String(value).slice(0, 10) : '';

export const formatDateOnly = (value, options) => {
  const date = DateTime.fromISO(dateOnly(value), { zone: 'UTC' });
  return date.isValid ? date.toJSDate().toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' }) : '';
};

export const todayDateOnly = (timezone = 'UTC') => DateTime.now().setZone(timezone).toISODate();

export const daysFromToday = (value, timezone = 'UTC') => {
  const due = DateTime.fromISO(dateOnly(value), { zone: 'UTC' });
  const today = DateTime.fromISO(todayDateOnly(timezone), { zone: 'UTC' });
  return Math.round(due.diff(today, 'days').days);
};

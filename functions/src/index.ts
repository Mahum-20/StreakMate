import * as admin from 'firebase-admin';

admin.initializeApp();

export { submitCheckIn } from './streaks/checkIn';
export { deleteStreak } from './streaks/deleteStreak';
export { monitorStreakExpirations } from './scheduled/streakMonitor';

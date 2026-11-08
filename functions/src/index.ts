import * as admin from 'firebase-admin';

admin.initializeApp();

export { submitCheckIn } from './streaks/checkIn';
export { monitorStreakExpirations } from './scheduled/streakMonitor';

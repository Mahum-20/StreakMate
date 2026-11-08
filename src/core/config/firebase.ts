import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  // @ts-expect-error - React Native export condition defines getReactNativePersistence
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  Firestore,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe environment or default configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDjeA46OMX97fZ-Z955zhyjIGtU64GgqaU',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'streaksapp-9091a.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'streaksapp-9091a',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'streaksapp-9091a.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '311704121872',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:311704121872:web:4a22f5eca199e71a28d095',
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

// Enforce a strict 15MB local cache ceiling so the app never bloats disk space
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      cacheSizeBytes: 15 * 1024 * 1024, // 15 MB hard limit with automatic LRU garbage collection
    }),
  });
} catch {
  db = getFirestore(app);
}

export { app, auth, db };

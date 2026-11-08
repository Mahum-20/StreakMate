import { Platform } from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/core/config/firebase';

export interface RegisterParams {
  email: string;
  password: string;
  displayName: string;
  username: string;
}

export const getAuthErrorMessage = (errorCode: string, rawMessage?: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'The email address is invalid.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/operation-not-allowed':
      return 'Email/Password login is not enabled in Firebase Console. Go to Firebase Console > Authentication > Sign-in method and turn on Email/Password.';
    case 'permission-denied':
      return 'Firestore permissions denied. In Firebase Console > Firestore Database > Rules, update rules to allow read/write.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Google sign-in popup was blocked by browser. Please allow popups for this site.';
    default:
      if (rawMessage && !rawMessage.includes('Firebase:')) {
        return rawMessage;
      }
      return rawMessage
        ? `Error: ${rawMessage.replace(/^Firebase:\s*/, '')}`
        : 'An unexpected error occurred. Please try again.';
  }
};

export const authService = {
  async login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  },

  async register({ email, password, displayName, username }: RegisterParams) {
    const trimmedEmail = email.trim();
    const cleanUsername = username.trim().toLowerCase();

    // 1. Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
    const user = cred.user;

    // 2. Set Firebase Auth display name
    await updateProfile(user, { displayName: displayName.trim() });

    // 3. Create Firestore User profile
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: trimmedEmail,
        displayName: displayName.trim(),
        username: cleanUsername,
        avatarUrl: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        stats: {
          totalActiveStreaks: 0,
          totalSavedStreaks: 0,
          longestStreakEver: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 4. Register unique username lookup
      const usernameRef = doc(db, 'usernames', cleanUsername);
      await setDoc(usernameRef, {
        uid: user.uid,
        createdAt: serverTimestamp(),
      });
    } catch (firestoreErr) {
      console.warn('Firestore profile setup notice:', firestoreErr);
      // Even if Firestore doc write failed, auth succeeded
    }

    return user;
  },

  async loginWithGoogle() {
    if (Platform.OS !== 'web' || typeof signInWithPopup !== 'function') {
      throw new Error(
        'Google Sign-In on mobile requires an installable build (APK) with native Google Play Services. For instant testing in Expo Go, please use Email and Password, or test Google Sign-In directly in your PC browser at http://localhost:8081!'
      );
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user already exists in Firestore; if not, create initial profile!
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const cleanUsername =
          (user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '') +
          '_' +
          Math.floor(Math.random() * 1000);

        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'StreakMate User',
          username: cleanUsername,
          avatarUrl: user.photoURL || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          stats: {
            totalActiveStreaks: 0,
            totalSavedStreaks: 0,
            longestStreakEver: 0,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (firestoreErr) {
      console.warn('Google sign-in Firestore sync notice:', firestoreErr);
    }

    return user;
  },

  async resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email.trim());
  },

  async updateUserProfile(params: { displayName?: string; photoURL?: string }) {
    if (!auth.currentUser) throw new Error('Not authenticated');
    const user = auth.currentUser;
    const updates: { displayName?: string; photoURL?: string } = {};

    if (params.displayName !== undefined) {
      updates.displayName = params.displayName.trim();
    }
    if (params.photoURL !== undefined) {
      updates.photoURL = params.photoURL.trim();
    }

    if (Object.keys(updates).length > 0) {
      await updateProfile(user, updates);
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const firestoreUpdates: Record<string, any> = {
        updatedAt: serverTimestamp(),
      };
      if (params.displayName !== undefined) {
        firestoreUpdates.displayName = params.displayName.trim();
      }
      if (params.photoURL !== undefined) {
        firestoreUpdates.avatarUrl = params.photoURL.trim();
      }
      await updateDoc(userRef, firestoreUpdates);
    } catch (err) {
      console.warn('Firestore profile update notice:', err);
    }

    return user;
  },

  async logout() {
    await signOut(auth);
  },
};

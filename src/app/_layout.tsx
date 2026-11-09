import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/core/config/firebase';
import { ThemeProvider } from '@/core/theme';
import { SkyProvider, useSky } from '@/core/environment/SkyContext';
import { useAuthStore } from '@/store/useAuthStore';
import { widgetService } from '@/features/widget/widgetService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function RootNavigator() {
  const { skyConfig } = useSky();
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);

          let username = null;
          let displayName = firebaseUser.displayName || 'StreakMate User';
          let avatarUrl = firebaseUser.photoURL || null;
          let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

          if (userDoc.exists()) {
            const data = userDoc.data();
            displayName = data.displayName || displayName;
            username = data.username || null;
            avatarUrl = data.avatarUrl || avatarUrl;
            timezone = data.timezone || timezone;

            // If username was missing, self-heal
            if (!username) {
              const fallback = (firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.substring(0, 5)}`).toLowerCase().replace(/[^a-z0-9_]/g, '');
              username = fallback;
              await setDoc(userRef, { username: fallback, updatedAt: serverTimestamp() }, { merge: true });
              await setDoc(doc(db, 'usernames', fallback), { uid: firebaseUser.uid, createdAt: serverTimestamp() }, { merge: true });
            }
          } else {
            // Profile document missing (e.g. registered before rules were published) -> Self-heal
            const cleanUsername = (firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.substring(0, 5)}`).toLowerCase().replace(/[^a-z0-9_]/g, '');
            username = cleanUsername;

            await setDoc(userRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName,
              username: cleanUsername,
              avatarUrl,
              timezone,
              stats: {
                totalActiveStreaks: 0,
                totalSavedStreaks: 0,
                longestStreakEver: 0,
              },
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            await setDoc(doc(db, 'usernames', cleanUsername), {
              uid: firebaseUser.uid,
              createdAt: serverTimestamp(),
            });
          }

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName,
            username,
            photoURL: avatarUrl,
            timezone,
          });
        } catch (err) {
          console.warn('Profile sync/self-heal notice:', err);
          // Fallback if firestore document read fails or is offline
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'StreakMate User',
            username: (firebaseUser.email?.split('@')[0] || null)?.toLowerCase(),
            photoURL: firebaseUser.photoURL || null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  // Handle Interactive Widget Deep Links (streakmate://checkin/{streakId})
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (!url) return;

      const match = url.match(/checkin\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const streakId = match[1];
        const currentUid = auth.currentUser?.uid;
        if (!currentUid) {
          Alert.alert('StreakMate', 'Please sign in to complete your widget check-in.');
          return;
        }

        const res = await widgetService.quickCheckIn(streakId, currentUid);
        Alert.alert(res.success ? 'Widget Check-In Completed' : 'Notice', res.message);
      }
    };

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) handleDeepLink({ url: initialUrl });
    });

    const sub = Linking.addEventListener('url', handleDeepLink);
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style={skyConfig.isDarkContent ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="streak/[id]"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="streak/create"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="friends/add"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="widget"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SkyProvider>
            <RootNavigator />
          </SkyProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

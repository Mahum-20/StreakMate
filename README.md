# StreakMate — Production-Grade Android Application

StreakMate is an Android-first accountability and habit continuity platform. It connects close peers to maintain customized, independent daily streaks with server-authoritative verification and multi-tiered proactive notifications.

---

## 1. Quick Start & Development Workflow

### Prerequisites
* **Node.js**: v22 LTS
* **npm**: v11+
* **No Android Studio Required**: Run directly on your physical Android phone using **Expo Go** or build a standalone `.apk` using **EAS Build**.

### 1.1 Local Development (Instant Device Preview)
```bash
# 1. Install dependencies (if not already installed)
npm install

# 2. Start Expo development server
npx expo start
```
* **Scan the QR Code**: Open the **Expo Go** app on your physical Android device and scan the terminal QR code.
* Changes reflect immediately with hot reloading.

---

## 2. Cloud Builds (EAS Build)

### 2.1 Generate Installable Android APK (Preview Build)
Build an optimized standalone `.apk` directly downloadable onto any physical Android device without needing Android Studio installed locally:
```bash
npx eas build --platform android --profile preview
```

### 2.2 Generate Production Android App Bundle (AAB)
Build a signed, release-optimized `.aab` ready for upload to the Google Play Console:
```bash
npx eas build --platform android --profile production
```

### 2.3 Local Production Bundle Export
```bash
npx expo export --platform android
```
* Measured compiled Hermes bytecode footprint: **4.3 MB** (hitting our 4–5 MB lightweight application target).

---

## 3. Automated Testing & Verification

StreakMate enforces strict code quality and mathematical correctness:

```bash
# Run TypeScript strict type-check (0 errors)
npx tsc --noEmit

# Run Unit Test suite (14/14 tests passing)
npx jest
```

### Test Coverage Highlights
* **Authoritative Streak Calculations**: Increments only when all participants complete check-in.
* **Duplicate Check-In Prevention**: Rejects duplicate receipts within the same period cycle.
* **Smart Expiration Thresholds**:
  * Remaining > 3h $\rightarrow$ Active
  * Remaining $\le$ 3h $\rightarrow$ Lead Reminder
  * Remaining $\le$ 30m $\rightarrow$ Urgent Warning
  * Deadline passed $\rightarrow$ Marked Broken & Logged to History
* **Timezone Day Boundaries**: Formats consistent `YYYY-MM-DD` day anchors across client timezones.

---

## 4. Architecture & Directory Hierarchy

```text
Streaks App/
├── src/
│   ├── app/                           # File-based Typed Routing (Expo Router)
│   │   ├── _layout.tsx                # App Root (Auth Gate, Theme, React Query)
│   │   ├── index.tsx                  # Splash / Gatekeeper redirection
│   │   ├── (auth)/
│   │   │   ├── login.tsx              # Email / Password Sign In
│   │   │   ├── register.tsx           # Account Creation & Username reservation
│   │   │   └── forgot-password.tsx    # Password recovery dispatch
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx            # Bottom Tab Bar (Deep Midnight & Warm Coral)
│   │   │   ├── index.tsx              # Home Dashboard (Active, At-Risk, Stats)
│   │   │   ├── friends.tsx            # Friends Directory & Request Management
│   │   │   └── settings.tsx           # Dark/Light Theme, Reminders, Account
│   │   ├── streak/
│   │   │   ├── [id].tsx               # Detailed Streak View & 7-Day History
│   │   │   └── create.tsx             # Modal to start new custom streak
│   │   └── friends/
│   │       └── add.tsx                # Search by @username & send invite
│   ├── components/
│   │   ├── common/                    # Button, Input, Card, Badge, Avatar, Header, EmptyState
│   │   └── cards/                     # StreakCard, FriendCard, StatCard
│   ├── core/
│   │   ├── config/                    # Firebase Modular Client (Auth with AsyncStorage)
│   │   ├── theme/                     # Colors, Typography, Spacing, ThemeContext
│   │   └── utils/                     # streakLogic.ts & calculations engine
│   └── store/
│       └── useAuthStore.ts            # Reactive authentication session store
├── functions/                         # Firebase Cloud Functions (TypeScript Backend)
│   ├── src/
│   │   ├── streaks/checkIn.ts         # submitCheckIn atomic transaction
│   │   ├── scheduled/streakMonitor.ts # Cron monitor (every 15m) for expiration
│   │   ├── notifications/fcmDispatcher.ts # FCM multicast token dispatcher
│   │   └── index.ts
├── firestore.rules                    # Production RBAC & Participant Security Rules
├── firestore.indexes.json             # Composite query indexes
├── firebase.json                      # Firebase configuration & emulator suite
├── eas.json                           # EAS Build profiles (preview APK & production AAB)
├── app.json                           # Expo application manifest & Android package
└── package.json
```

---

## 5. Security & Authorization Guarantees

* **Zero Arbitrary Streak Updates**: Clients cannot manually modify `currentStreak`, `longestStreak`, or `currentPeriodEnd`.
* **Participant Ownership**: Security rules enforce that users can only submit check-in receipts containing their authenticated UID (`request.auth.uid == userId`).
* **Immutability**: Check-in receipts and history records cannot be modified or deleted once written.
* **Default-Deny Access**: All unmatched paths reject reads and writes (`allow read, write: if false;`).

---

## 6. Firebase Backend & Emulators

To run and test Cloud Functions and Security Rules locally using the Firebase Emulator Suite:
```bash
# Build Cloud Functions TypeScript
npm --prefix functions run build

# Start Emulators (Firestore, Auth, Functions)
firebase emulators:start
```

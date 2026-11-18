# 🌤️ StreakMate — Social Habit & Streak Tracker

> **Maintain momentum together.** StreakMate is a modern, gamified habit tracker built with **React Native** and **Expo**. Designed with an atmospheric **Living Sky day/night engine** and paired social accountability, StreakMate turns daily consistency into an engaging, shared journey.

---

## ✨ Key Features

- **🌤️ Living Sky Adaptive Theme**: The entire UI changes dynamically based on the local time of day (Sunrise, Midday, Golden Hour, Twilight, and Night) with glassmorphic cards and soft pastel accents.
- **🤝 Paired & Solo Habits**: Track habits independently or pair with an accountability partner where both participants must check in to extend the streak.
- **📱 Duolingo-Style 4x2 Android Widget**:
  - Live on your home screen with **Nimbus the 3D Cloud Buddy** and contextual speech bubbles.
  - Multi-habit support (1 Hero habit or 2 Duo habits).
  - One-tap check-in buttons directly from your home screen without opening the app.
- **🧊 Streak Freeze & Milestone System**:
  - Automatic streak freeze protection (preserves your streak if a day is missed).
  - Earn +1 Streak Freeze for every 20 continuous days of consistency.
- **🔔 Social Nudges**: Ping accountability partners with real-time in-app nudges when deadlines approach.
- **🎨 Themed Modals & UI**: Custom-built action menus, delete confirmations, and celebration modals matching the app's sky theme.

---

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) (v0.88) with [Expo SDK 58](https://expo.dev/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Auth, Cloud Firestore & Atomic Transactions)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) & [TanStack Query](https://tanstack.com/query)
- **Native Android Widget**: Custom Kotlin `AppWidgetProvider` & Expo Config Plugin (`withAndroidWidget.js`)
- **Language & Testing**: TypeScript & Jest (42 lifecycle, security & concurrency unit tests)

---

## 1. Quick Start & Development Workflow

### Prerequisites
* **Node.js**: v20+ LTS
* **npm**: v10+

### 1.1 Local Development
```bash
# 1. Install dependencies
npm install

# 2. Start Expo development server
npx expo start
```
* **Scan the QR Code**: Open the **Expo Go** app on your physical Android device and scan the terminal QR code.
* Changes reflect immediately with hot reloading.

---

## 2. Cloud Builds (EAS Build)

### 2.1 Generate Installable Android APK (Preview Build)
Build an optimized standalone `.apk` directly downloadable onto any physical Android device:
```bash
npx eas build --platform android --profile preview
```
Or run the provided Windows helper script:
```powershell
.\make-apk.bat
```

### 2.2 Generate Production Android App Bundle (AAB)
```bash
npx eas build --platform android --profile production
```

---

## 3. Automated Testing & Verification

StreakMate enforces strict code quality and mathematical correctness:

```bash
# Run TypeScript strict type-check (0 errors)
npx tsc --noEmit

# Run Unit Test suite (42/42 tests passing across 2 test suites)
npm test
```

### Test Coverage Highlights
* **Authoritative Streak Calculations**: Increments only when all participants complete check-in.
* **Duplicate Check-In Prevention**: Rejects duplicate receipts within the same period cycle.
* **Streak Freeze Lifecycle**: Automatically deducts freezes on rollover and awards milestone freezes (+1 every 20 days).
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
├── assets/                            # Mascot illustrations & icons
│   └── mascot/                        # Nimbus 3D Cloud Buddy emotions
├── plugins/
│   └── withAndroidWidget.js           # Expo config plugin for native Android 4x2 AppWidget
├── src/
│   ├── app/                           # File-based Typed Routing (Expo Router)
│   │   ├── _layout.tsx                # App Root (Auth Gate, Theme, React Query)
│   │   ├── index.tsx                  # Splash / Gatekeeper redirection
│   │   ├── widget.tsx                 # Interactive Widget Settings & Preview
│   │   ├── (auth)/                    # Login, Register, Forgot Password
│   │   ├── (tabs)/                    # Home Dashboard, Friends, Settings
│   │   ├── streak/                    # Detailed Streak View & Create
│   │   └── checkin/                   # Deep link handler for widget check-ins
│   ├── components/
│   │   ├── common/                    # Button, Input, Card, Badge, Avatar, Header, EmptyState
│   │   ├── cards/                     # StreakCard, FriendCard, StatCard
│   │   ├── modals/                    # StreakCelebration, StreakActionMenu, DeleteConfirm, StreakDeleted
│   │   └── motion/                    # LivingSkyBackground, ConfettiCelebration
│   ├── core/
│   │   ├── config/                    # Firebase Modular Client (Auth with AsyncStorage)
│   │   ├── environment/               # Living Sky Context & TimeOfDayEngine
│   │   ├── theme/                     # Colors, Typography, Spacing, ThemeContext
│   │   └── utils/                     # streakLogic.ts & calculations engine
│   └── features/
│       ├── streaks/                   # streakService, nudgeService
│       └── widget/                    # widgetService, mascotAssets, InteractiveWidgetCard
├── firestore.rules                    # Production RBAC & Participant Security Rules
├── firebase.json                      # Firebase configuration
├── eas.json                           # EAS Build profiles (preview APK & production AAB)
├── app.json                           # Expo application manifest & Android package
└── package.json
```

---

## 5. Security & Authorization Guarantees

* **Zero Arbitrary Streak Updates**: Clients cannot manually modify `currentStreak`, `longestStreak`, or `currentPeriodEnd`.
* **Participant Ownership**: Security rules enforce that users can only submit check-in receipts containing their authenticated UID (`request.auth.uid == userId`).
* **Atomic Transactions**: All rollover, freeze deduction, milestone reward, and check-in logic runs inside Firestore atomic transactions to prevent race conditions.
* **Default-Deny Access**: All unmatched paths reject reads and writes (`allow read, write: if false;`).

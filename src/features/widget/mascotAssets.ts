export const NIMBUS_MASCOT_ASSETS = {
  morning: require('../../../assets/mascot/nimbus_morning.png'),
  afternoon: require('../../../assets/mascot/nimbus_afternoon.png'),
  evening: require('../../../assets/mascot/nimbus_evening.png'),
  night: require('../../../assets/mascot/nimbus_night.png'),
  complete: require('../../../assets/mascot/nimbus_complete.png'),
} as const;

export type MascotState = 'morning' | 'afternoon' | 'evening' | 'night' | 'complete';

export interface MascotContext {
  state: MascotState;
  title: string;
  message: string;
  speechBubble: string;
  badgeText: string;
}

export function resolveMascotContext(allCompleted: boolean, date: Date = new Date()): MascotContext {
  if (allCompleted) {
    return {
      state: 'complete',
      title: 'ALL DONE TODAY!',
      message: 'You protected every streak today! Fantastic job ⭐',
      speechBubble: 'Woohoo! All done! ⭐',
      badgeText: '100% COMPLETE',
    };
  }

  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return {
      state: 'morning',
      title: 'GOOD MORNING',
      message: "Rise and shine! Let's build your habit momentum ☀️",
      speechBubble: 'Good morning! Ready? ✨',
      badgeText: 'MORNING RHYTHM',
    };
  }

  if (hour >= 12 && hour < 17) {
    return {
      state: 'afternoon',
      title: 'AFTERNOON FOCUS',
      message: 'Keep your consistency rolling strong today! 🌤️',
      speechBubble: 'Keep it going! 🌤️',
      badgeText: 'MIDDAY BOOST',
    };
  }

  if (hour >= 17 && hour < 21) {
    return {
      state: 'evening',
      title: 'EVENING REMINDER',
      message: "Don't let your streak slip before bedtime ⏰",
      speechBubble: 'Check in tonight! ⏰',
      badgeText: 'EVENING TIME',
    };
  }

  // Late night (21:00 to 04:59)
  return {
    state: 'night',
    title: 'STREAK AT RISK',
    message: 'Hurry! Midnight is coming. Save your flame now 🌙',
    speechBubble: 'Save our streak! 🌙',
    badgeText: 'FINAL HOURS',
  };
}

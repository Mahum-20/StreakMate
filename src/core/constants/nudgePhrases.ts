export interface NudgePhrase {
  id: string;
  category: 'unhinged_guilt' | 'fiery_urgency' | 'doom_scrolling' | 'playful_hype' | 'meme_chaos';
  categoryLabel: string;
  emoji: string;
  template: (friendName: string, streakName: string) => string;
}

export const NUDGE_PHRASES: NudgePhrase[] = [
  // 🦉 Authentic Duolingo Guilt & "I'm Carrying You"
  {
    id: 'real_friend',
    category: 'unhinged_guilt',
    categoryLabel: 'Duolingo Guilt',
    emoji: '🦉',
    template: (friend, streak) =>
      `A real friend honors their friend streak, ${friend}. Don't leave our ${streak} hanging!`,
  },
  {
    id: 'carrying_this_streak',
    category: 'unhinged_guilt',
    categoryLabel: 'Duolingo Guilt',
    emoji: '🎒',
    template: (friend, streak) =>
      `🎒 I'm carrying this ${streak} streak all on my back, ${friend}. Your turn!`,
  },
  {
    id: 'totally_fine_and_normal',
    category: 'unhinged_guilt',
    categoryLabel: 'Duolingo Guilt',
    emoji: '🙃',
    template: (friend, streak) =>
      `Totally FINE and NORMAL to ignore our ${streak} streak like this, ${friend}!!!`,
  },
  {
    id: 'cool_cool_cool',
    category: 'unhinged_guilt',
    categoryLabel: 'Duolingo Guilt',
    emoji: '🕶️',
    template: (friend, streak) =>
      `🕶️ cool cool cool cool, ${friend}, so you'd just let our ${streak} streak die???`,
  },
  {
    id: 'clown_worried',
    category: 'unhinged_guilt',
    categoryLabel: 'Duolingo Guilt',
    emoji: '🤡',
    template: (friend, streak) =>
      `🤡 Me??? Nooooo I'm not worried about our ${streak} streak at ALL, ${friend}.`,
  },
  {
    id: 'me_waiting',
    category: 'unhinged_guilt',
    categoryLabel: 'Duolingo Guilt',
    emoji: '🫠',
    template: (friend, streak) =>
      `me waiting for ${friend} to check in for ${streak} 🫠 Don't break the streak!`,
  },
  {
    id: 'lonely_in_this_streak',
    category: 'unhinged_guilt',
    categoryLabel: 'Duolingo Guilt',
    emoji: '🥹',
    template: (friend, streak) =>
      `🥹 It's lonely in this ${streak} streak without you, ${friend}. Check in today!`,
  },

  // 🧐 Calling Out Doom-Scrolling & Social Media
  {
    id: 'so_much_scrolling',
    category: 'doom_scrolling',
    categoryLabel: 'Calling You Out',
    emoji: '🧐',
    template: (friend, streak) =>
      `🧐 So much scrolling on your phone, ${friend}... but no ${streak}? Check in!`,
  },
  {
    id: 'what_are_you_doing',
    category: 'doom_scrolling',
    categoryLabel: 'Calling You Out',
    emoji: '☎️',
    template: (friend, streak) =>
      `Hey ${friend}, what are you doing and why is it not ${streak}? ☎️ our streak's callin' you gonna answer?`,
  },
  {
    id: 'leaving_on_read',
    category: 'doom_scrolling',
    categoryLabel: 'Calling You Out',
    emoji: '📱',
    template: (friend, streak) =>
      `Leaving me on read, ${friend}? Don't leave our ${streak} streak on dead! 💀`,
  },
  {
    id: 'yoooooooo',
    category: 'doom_scrolling',
    categoryLabel: 'Calling You Out',
    emoji: '🗣️',
    template: (friend, streak) =>
      `yoooooooo ${friend} do your ${streak}!! 📢`,
  },

  // ☠️ Meme Chaos & Owl Persona
  {
    id: 'i_am_the_owl',
    category: 'meme_chaos',
    categoryLabel: 'Meme Chaos',
    emoji: '🦉',
    template: (friend, streak) =>
      `🦉 I am the owl now, ${friend}. Check in to ${streak} or face the consequences!`,
  },
  {
    id: 'audacity',
    category: 'meme_chaos',
    categoryLabel: 'Meme Chaos',
    emoji: '☠️',
    template: (friend, streak) =>
      `☠️ The sheer audacity of letting our ${streak} streak die, ${friend}! Check in!`,
  },
  {
    id: 'end_my_nightmares',
    category: 'meme_chaos',
    categoryLabel: 'Meme Chaos',
    emoji: '😱',
    template: (friend, streak) =>
      `☠️ End my nightmares, ${friend}. Extend our ${streak} streak right now!`,
  },

  // 🔥 Fiery Urgency & Emergency
  {
    id: 'focus_countdown',
    category: 'fiery_urgency',
    categoryLabel: 'Fiery Urgency',
    emoji: '👏',
    template: (friend, streak) =>
      `👏 FOCUS, ${friend}! I need you to extend our ${streak} streak before midnight!`,
  },
  {
    id: 'streak_emergency',
    category: 'fiery_urgency',
    categoryLabel: 'Fiery Urgency',
    emoji: '🚨',
    template: (friend, streak) =>
      `🚨 STREAK EMERGENCY: The flame for ${streak} is in critical condition, ${friend}! Save us!`,
  },
  {
    id: 'cold_ashes',
    category: 'fiery_urgency',
    categoryLabel: 'Fiery Urgency',
    emoji: '🔥',
    template: (friend, streak) =>
      `Our ${streak} flame is turning to cold ashes, ${friend}! Only you can save it!`,
  },
  {
    id: 'clock_ticking',
    category: 'fiery_urgency',
    categoryLabel: 'Fiery Urgency',
    emoji: '⏰',
    template: (friend, streak) =>
      `Tick-tock, ${friend}! Midnight is coming for our ${streak} streak! ⏰`,
  },

  // ⭐ Wholesome Hype & High Fives
  {
    id: 'high_five_glory',
    category: 'playful_hype',
    categoryLabel: 'Hype & Support',
    emoji: '🙌',
    template: (friend, streak) =>
      `High five, ${friend}! 🙌 I finished my part for ${streak}, waiting on you partner!`,
  },
  {
    id: 'teamwork_makes_streak',
    category: 'playful_hype',
    categoryLabel: 'Hype & Support',
    emoji: '🤝',
    template: (friend, streak) =>
      `Teamwork makes the streak work, ${friend}! 2 minutes on ${streak} and we keep the fire burning! 🔥`,
  },
  {
    id: 'guess_what',
    category: 'playful_hype',
    categoryLabel: 'Hype & Support',
    emoji: '🥳',
    template: (friend, streak) =>
      `OMG guess what ${friend}?? it's time to check in for ${streak}! 🥳`,
  },
];

export const getRandomNudgePhrase = (friendName: string, streakName: string): { phrase: string; category: string; emoji: string } => {
  const randomIndex = Math.floor(Math.random() * NUDGE_PHRASES.length);
  const selected = NUDGE_PHRASES[randomIndex];
  return {
    phrase: selected.template(friendName, streakName),
    category: selected.categoryLabel,
    emoji: selected.emoji,
  };
};

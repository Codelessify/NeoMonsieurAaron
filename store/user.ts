import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile, CEFRLevel } from "@/types";

interface UserStore {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  updateXP: (xp: number) => void;
  updateStreak: () => void;
  updateLevel: (level: CEFRLevel) => void;
  clearProfile: () => void;
}

const DEFAULT_PROFILE: Omit<UserProfile, "id" | "email"> = {
  display_name: null,
  level: "A0",
  xp: 0,
  streak: 0,
  last_active: new Date().toISOString(),
  daily_goal_minutes: 10,
  context_language: "english",
  audio_autoplay: true,
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      profile: null,

      setProfile: (profile) => set({ profile }),

      updateXP: (gained) => {
        const { profile } = get();
        if (!profile) return;
        set({ profile: { ...profile, xp: profile.xp + gained } });
      },

      updateStreak: () => {
        const { profile } = get();
        if (!profile) return;
        const today = new Date().toDateString();
        const lastActive = new Date(profile.last_active).toDateString();
        if (today === lastActive) return; // already updated today
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const newStreak = lastActive === yesterday ? profile.streak + 1 : 1;
        set({ profile: { ...profile, streak: newStreak, last_active: new Date().toISOString() } });
      },

      updateLevel: (level) => {
        const { profile } = get();
        if (!profile) return;
        set({ profile: { ...profile, level } });
      },

      clearProfile: () => set({ profile: null }),
    }),
    { name: "monsieur-aaron-user" }
  )
);

export function buildGuestProfile(id: string, email: string): UserProfile {
  return { id, email, ...DEFAULT_PROFILE };
}

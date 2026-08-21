import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile, CEFRLevel } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface UserStore {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  updateXP: (xp: number) => void;
  updateStreak: () => void;
  updateLevel: (level: CEFRLevel) => void;
  updateContextLanguage: (lang: "english" | "french" | "mixed") => void;
  updateDailyGoal: (minutes: number) => void;
  updateAudioAutoplay: (enabled: boolean) => void;
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

async function persistProfileToSupabase(profile: UserProfile) {
  try {
    const supabase = createClient();
    await supabase.from("user_profiles").upsert({
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      level: profile.level,
      xp: profile.xp,
      streak: profile.streak,
      last_active: profile.last_active,
      daily_goal_minutes: profile.daily_goal_minutes,
      context_language: profile.context_language,
      audio_autoplay: profile.audio_autoplay,
    }, { onConflict: "id" });
  } catch (err) {
    console.error("[persist-profile]", err);
  }
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      profile: null,

      setProfile: (profile) => {
        set({ profile });
        persistProfileToSupabase(profile);
      },

      updateXP: (gained) => {
        const { profile } = get();
        if (!profile) return;
        const updated = { ...profile, xp: profile.xp + gained };
        set({ profile: updated });
        persistProfileToSupabase(updated);
      },

      updateStreak: () => {
        const { profile } = get();
        if (!profile) return;
        const today = new Date().toDateString();
        const lastActive = new Date(profile.last_active).toDateString();
        if (today === lastActive) return; // already updated today
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const newStreak = lastActive === yesterday ? profile.streak + 1 : 1;
        const updated = { ...profile, streak: newStreak, last_active: new Date().toISOString() };
        set({ profile: updated });
        persistProfileToSupabase(updated);
      },

      updateLevel: (level) => {
        const { profile } = get();
        if (!profile) return;
        const updated = { ...profile, level };
        set({ profile: updated });
        persistProfileToSupabase(updated);
      },

      updateContextLanguage: (context_language) => {
        const { profile } = get();
        if (!profile) return;
        const updated = { ...profile, context_language };
        set({ profile: updated });
        persistProfileToSupabase(updated);
      },

      updateDailyGoal: (daily_goal_minutes) => {
        const { profile } = get();
        if (!profile) return;
        const updated = { ...profile, daily_goal_minutes };
        set({ profile: updated });
        persistProfileToSupabase(updated);
      },

      updateAudioAutoplay: (audio_autoplay) => {
        const { profile } = get();
        if (!profile) return;
        const updated = { ...profile, audio_autoplay };
        set({ profile: updated });
        persistProfileToSupabase(updated);
      },

      clearProfile: () => set({ profile: null }),
    }),
    { name: "monsieur-aaron-user" }
  )
);

export function buildGuestProfile(id: string, email: string): UserProfile {
  return { id, email, ...DEFAULT_PROFILE };
}
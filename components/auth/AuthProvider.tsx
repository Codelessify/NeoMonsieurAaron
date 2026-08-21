"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/user";
import { useProgressStore } from "@/store/progress";
import type { UserProfile } from "@/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfile, clearProfile } = useUserStore();
  const { loadFromSupabase } = useProgressStore();

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { clearProfile(); return; }

      const { data: profileRow } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const profile: UserProfile = {
        id: user.id,
        email: user.email ?? "",
        display_name: profileRow?.display_name ?? null,
        level: profileRow?.level ?? "A0",
        xp: profileRow?.xp ?? 0,
        streak: profileRow?.streak ?? 0,
        last_active: profileRow?.last_active ?? new Date().toISOString(),
        daily_goal_minutes: profileRow?.daily_goal_minutes ?? 10,
        context_language: profileRow?.context_language ?? "english",
        audio_autoplay: profileRow?.audio_autoplay ?? true,
      };
      setProfile(profile);
      await loadFromSupabase(user.id);
      // Update streak on login
      useUserStore.getState().updateStreak();
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { clearProfile(); return; }
      init();
    });

    return () => subscription.unsubscribe();
  }, [setProfile, clearProfile, loadFromSupabase]);

  return <>{children}</>;
}

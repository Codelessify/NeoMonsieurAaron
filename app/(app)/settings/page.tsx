"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/user";
import { useProgressStore } from "@/store/progress";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const { profile, clearProfile, updateContextLanguage, updateDailyGoal, updateAudioAutoplay, updateLocation } = useUserStore();
  const { clearProgress } = useProgressStore();
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearProfile();
    clearProgress();
    router.push("/login");
    router.refresh();
  }

  async function handleDetectLocation() {
    if (!navigator.geolocation) return;
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Use the location name in a simple lookup — reverse geocode via OpenStreetMap Nominatim
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
          headers: { "User-Agent": "MonsieurAaron/1.0" },
        })
          .then((r) => r.json())
          .then((data) => {
            const city = data.address?.city || data.address?.town || data.address?.county || "Unknown";
            updateLocation(city);
            setIsDetectingLocation(false);
          })
          .catch(() => setIsDetectingLocation(false));
      },
      () => setIsDetectingLocation(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const contextLanguage = profile?.context_language ?? "english";
  const dailyGoal = profile?.daily_goal_minutes ?? 10;
  const audioAutoplay = profile?.audio_autoplay ?? true;
  const userLocation = profile?.location ?? "";

  return (
    <div className="px-4 pt-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">⚙️ Réglages</h1>

      {/* Account */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700">Compte</h3>
        {profile ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                {(profile.display_name ?? profile.email).charAt(0).toUpperCase()}
              </div>
              <div>
                {profile.display_name && (
                  <p className="text-sm font-semibold text-gray-800">{profile.display_name}</p>
                )}
                <p className="text-xs text-gray-500">{profile.email}</p>
              </div>
            </div>
            <Button variant="danger" size="sm" onClick={handleLogout}>
              Se déconnecter
            </Button>
          </>
        ) : (
          <p className="text-xs text-gray-400">Non connecté</p>
        )}
      </div>

      {/* Settings */}
      <div className="flex flex-col gap-3">
        {/* Context language */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Langue des situations</h3>
          <div className="flex gap-2">
            {(["english", "mixed", "french"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => updateContextLanguage(opt)}
                className={cn(
                  "flex-1 py-2 rounded-xl border-2 text-xs font-semibold capitalize transition-all",
                  contextLanguage === opt
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-blue-300"
                )}
              >
                {opt === "english" ? "Anglais" : opt === "french" ? "Français" : "Mixte"}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Les débutants commencent en anglais. Passez au français quand vous êtes prêt.
          </p>
        </div>

        {/* Daily goal */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Objectif quotidien</h3>
          <div className="flex gap-2">
            {[5, 10, 15, 30].map((mins) => (
              <button
                key={mins}
                onClick={() => updateDailyGoal(mins)}
                className={cn(
                  "flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all",
                  dailyGoal === mins
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-blue-300"
                )}
              >
                {mins} min
              </button>
            ))}
          </div>
        </div>

        {/* Audio */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Lecture auto</h3>
            <p className="text-xs text-gray-400">Jouer l'audio automatiquement à chaque scène</p>
          </div>
          <button
            onClick={() => updateAudioAutoplay(!audioAutoplay)}
            className={cn(
              "w-10 h-6 rounded-full relative transition-colors",
              audioAutoplay ? "bg-blue-500" : "bg-gray-300"
            )}
            aria-label="Toggle auto-play"
          >
            <div
              className={cn(
                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all",
                audioAutoplay ? "right-0.5" : "left-0.5"
              )}
            />
          </button>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Localisation</h3>
          <p className="text-xs text-gray-400 mb-2">
            Les scènes utiliseront des lieux proches de chez vous (ex: Tanke, Challenge à Ilorin).
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ville (ex: Ilorin, Paris, Yaoundé)"
              value={userLocation}
              onChange={(e) => updateLocation(e.target.value)}
              className="flex-1 text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDetectLocation}
              disabled={isDetectingLocation}
            >
              {isDetectingLocation ? "…" : "📍 Auto"}
            </Button>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">À propos</h3>
          <p className="text-xs text-gray-500">
            MonsieurAaron — Apprenez le français à travers des épisodes conversationnels générés par IA.
            Inspiré par Michel Thomas et Pimsleur.
          </p>
          <p className="text-xs text-gray-400 mt-2">Version 0.1.0 (MVP)</p>
        </div>
      </div>
    </div>
  );
}

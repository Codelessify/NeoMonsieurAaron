"use client";

export default function SettingsPage() {
  return (
    <div className="px-4 pt-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">⚙️ Réglages</h1>

      <div className="flex flex-col gap-3">
        {/* Context language */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Langue des situations</h3>
          <div className="flex gap-2">
            {["english", "mixed", "french"].map((opt) => (
              <button
                key={opt}
                className="flex-1 py-2 rounded-xl border-2 text-xs font-semibold capitalize transition-all border-gray-200 text-gray-500 hover:border-blue-300"
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
                className="flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all border-gray-200 text-gray-500 hover:border-blue-300"
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
            <p className="text-xs text-gray-400">Jouer l&apos;audio automatiquement à chaque scène</p>
          </div>
          <div className="w-10 h-6 bg-blue-500 rounded-full relative cursor-pointer">
            <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
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

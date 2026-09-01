"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { useUserStore } from "@/store/user";
import { useProgressStore } from "@/store/progress";
import { getInventoryFromLessons, getKnownWordList } from "@/lib/curriculum";
import { SCENARIOS, SCENARIO_LIST } from "@/lib/scenarios";
import type { ChambreMessage, MapPlace, ScenarioId } from "@/types";
import "leaflet/dist/leaflet.css";

type Phase = "map" | "session";

const PARIS = { lat: 48.8566, lon: 2.3522 };

// ─── Geocode the learner's city with Nominatim ───────────────────────────────
async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=fr&q=${encodeURIComponent(location)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (data?.length) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.error("[map] geocode failed", err);
  }
  return null;
}

// ─── Tag → scenario lookup (built from the catalog) ──────────────────────────
const TAG_TO_SCENARIO: Record<string, ScenarioId> = (() => {
  const map: Record<string, ScenarioId> = {};
  for (const s of SCENARIO_LIST) {
    for (const f of s.osmFilters) {
      map[`${f.key}=${f.value}`] = s.id;
    }
  }
  return map;
})();

// ─── Find real nearby places via the Overpass API (OpenStreetMap) ────────────
async function fetchRealPlaces(lat: number, lon: number): Promise<MapPlace[]> {
  const filters = SCENARIO_LIST.flatMap((s) =>
    s.osmFilters.map((f) => `node["${f.key}"="${f.value}"](around:3000,${lat},${lon});`)
  ).join("\n");
  const query = `[out:json][timeout:12];\n(\n${filters}\n);\nout center 60;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass error ${res.status}`);
  const data = (await res.json()) as {
    elements: Array<{
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  };

  const perScenario = new Map<ScenarioId, number>();
  const places: MapPlace[] = [];
  for (const el of data.elements ?? []) {
    const tags = el.tags ?? {};
    const lat_ = el.lat ?? el.center?.lat;
    const lon_ = el.lon ?? el.center?.lon;
    if (lat_ == null || lon_ == null) continue;

    const scenarioId =
      TAG_TO_SCENARIO[`amenity=${tags.amenity}`] ??
      TAG_TO_SCENARIO[`shop=${tags.shop}`] ??
      TAG_TO_SCENARIO[`railway=${tags.railway}`];
    if (!scenarioId) continue;

    // Max 2 real places per scenario to keep the map readable.
    const count = perScenario.get(scenarioId) ?? 0;
    if (count >= 2) continue;
    perScenario.set(scenarioId, count + 1);

    const scenario = SCENARIOS[scenarioId];
    const name =
      tags.name ??
      scenario.fallbackNames[count % scenario.fallbackNames.length];
    places.push({ scenario: scenarioId, name, lat: lat_, lon: lon_, isReal: true });
  }
  return places;
}

// ─── Synthetic fallback places spread around the centre ──────────────────────
function fallbackPlaces(lat: number, lon: number): MapPlace[] {
  return SCENARIO_LIST.map((s, i) => {
    const angle = (i / SCENARIO_LIST.length) * Math.PI * 2;
    return {
      scenario: s.id,
      name: s.fallbackNames[i % s.fallbackNames.length],
      lat: lat + Math.sin(angle) * 0.009,
      lon: lon + Math.cos(angle) * 0.014,
      isReal: false,
    };
  });
}

export default function MapPage() {
  const { profile, updateXP } = useUserStore();
  const { progress } = useProgressStore();

  const [phase, setPhase] = useState<Phase>("map");
  const [selected, setSelected] = useState<MapPlace | null>(null);
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [isLocating, setIsLocating] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChambreMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Learner's vocabulary = starter + words from completed lessons
  const completedLessonIds = Object.values(progress)
    .filter((p) => p.completed)
    .map((p) => p.lesson_id);
  const inventory = getInventoryFromLessons(completedLessonIds);
  const knownWordCount = getKnownWordList(inventory).length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // ─── Locate the user (profile location → geocode, else Paris) ──────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let coords = profile?.location ? await geocodeLocation(profile.location) : null;
      if (!coords) coords = PARIS;
      if (!cancelled) setCenter(coords);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.location]);

  // ─── Load real nearby places whenever the centre changes ───────────────────
  useEffect(() => {
    if (!center) return;
    let cancelled = false;
    (async () => {
      let found: MapPlace[] = [];
      try {
        found = await fetchRealPlaces(center.lat, center.lon);
      } catch (err) {
        console.error("[map] Overpass failed, using fallback places", err);
      }
      if (cancelled) return;
      setPlaces(found.length >= 5 ? found : fallbackPlaces(center.lat, center.lon));
      setIsLocating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [center]);

  // ─── Initialise the Leaflet map once ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapContainerRef.current || mapRef.current) return;
      const map = L.map(mapContainerRef.current, {
        center: [PARIS.lat, PARIS.lon],
        zoom: 15,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── Re-centre the map and draw markers when places change ─────────────────
  useEffect(() => {
    if (!center || !mapRef.current || !markerLayerRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current!;
      const layer = markerLayerRef.current!;
      map.setView([center.lat, center.lon], 15);
      layer.clearLayers();

      for (const place of places) {
        const scenario = SCENARIOS[place.scenario];
        const icon = L.divIcon({
          className: "",
          html: `<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;font-size:20px;background:#ffffff;border:2px solid #2563eb;border-radius:12px 12px 12px 2px;box-shadow:0 2px 6px rgba(0,0,0,.25);">${scenario.emoji}</div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 36],
          popupAnchor: [0, -32],
        });
        const marker = L.marker([place.lat, place.lon], { icon }).addTo(layer);
        marker.bindTooltip(
          `<b>${scenario.label}</b><br/>${place.name}`,
          { direction: "top", offset: [0, -30] }
        );
        marker.on("click", () => setSelected(place));
      }
    })();
  }, [places, center]);

  // ─── Enter a place: start the simulation ────────────────────────────────────
  const handleEnter = useCallback(
    async (place: MapPlace) => {
      setError(null);
      setIsStarting(true);
      try {
        const res = await fetch("/api/sim/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario: place.scenario,
            place_name: place.name,
            inventory,
            user_id: profile?.id,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to start simulation");
        }
        const data = await res.json() as { opening: string };
        setMessages([{ role: "ai", text: data.opening }]);
        setPhase("session");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsStarting(false);
      }
    },
    [inventory, profile?.id]
  );

  // ─── Send a reply inside the simulation ─────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking || !selected) return;

    const nextMessages: ChambreMessage[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setIsThinking(true);
    setError(null);

    try {
      const res = await fetch("/api/sim/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: selected.scenario,
          messages: nextMessages,
          inventory,
          user_id: profile?.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to get reply");
      }
      const data = await res.json() as { reply: string };
      setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsThinking(false);
    }
  }, [input, isThinking, messages, inventory, profile?.id, selected]);

  // ─── Leave the simulation: back to the map (with a small XP reward) ─────────
  const handleFinish = useCallback(() => {
    if (messages.some((m) => m.role === "user")) {
      updateXP(10);
    }
    setMessages([]);
    setSelected(null);
    setPhase("map");
  }, [messages, updateXP]);

  // ─── Simulation session screen ──────────────────────────────────────────────
  if (phase === "session" && selected) {
    const scenario = SCENARIOS[selected.scenario];
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur">
          <span className="text-xl">{scenario.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {scenario.label} — {selected.name}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {isThinking ? "…" : scenario.missionFr}
            </p>
          </div>
          <button
            onClick={handleFinish}
            disabled={isThinking}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            Quitter ✓
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                }`}
              >
                {m.role === "ai" && (
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                    {scenario.npcName}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestion phrases */}
        <div className="px-3 pt-2 pb-1 bg-white flex gap-2 overflow-x-auto">
          {scenario.suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              disabled={isThinking}
              className="whitespace-nowrap px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Écrivez en français…"
            disabled={isThinking}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors"
            aria-label="Envoyer"
          >
            ➤
          </button>
        </div>
      </div>
    );
  }

  // ─── Map screen ──────────────────────────────────────────────────────────────
  return (
    <div className="relative h-[calc(100vh-5rem)] overflow-hidden">
      {/* Map */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Top overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4 pointer-events-none">
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-gray-200 shadow-sm px-4 py-3 pointer-events-auto">
          <h1 className="text-base font-bold text-gray-900">🗺️ La Ville</h1>
          <p className="text-xs text-gray-500">
            {profile?.location
              ? `Bienvenue à ${profile.location} — touchez un lieu pour parler français.`
              : "Touchez un lieu sur la carte pour parler français."}
          </p>
        </div>
      </div>

      {/* Loading overlay */}
      {isLocating && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur rounded-full px-4 py-2 shadow-md text-xs text-gray-600">
          Recherche des lieux autour de vous…
        </div>
      )}

      {/* Place brief bottom sheet */}
      {selected && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-3">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{SCENARIOS[selected.scenario].emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">
                  {SCENARIOS[selected.scenario].label}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {selected.name}
                  {selected.isReal ? " · lieu réel 📍" : ""}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                Votre mission
              </p>
              <p className="text-sm text-blue-900">{SCENARIOS[selected.scenario].missionFr}</p>
              <p className="text-xs text-blue-400">{SCENARIOS[selected.scenario].missionEn}</p>
            </div>

            <button
              onClick={() => handleEnter(selected)}
              disabled={isStarting}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {isStarting
                ? "Ouverture…"
                : `Entrer chez ${SCENARIOS[selected.scenario].npcName} 🎬`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

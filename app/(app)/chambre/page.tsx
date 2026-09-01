"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/user";
import { useProgressStore } from "@/store/progress";
import { Button } from "@/components/ui/Button";
import { getInventoryFromLessons, getKnownWordList } from "@/lib/curriculum";
import type { ChambreMessage, ChambreReport } from "@/types";

type Phase = "intro" | "session" | "report";

export default function ChambrePage() {
  const router = useRouter();
  const { profile } = useUserStore();
  const { progress } = useProgressStore();

  const [phase, setPhase] = useState<Phase>("intro");
  const [messages, setMessages] = useState<ChambreMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [report, setReport] = useState<ChambreReport | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // ─── Enter the chambre: AI opens the conversation ──────────────────────────
  const handleEnter = useCallback(async () => {
    setError(null);
    setIsStarting(true);
    try {
      const res = await fetch("/api/chambre/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: profile?.id,
          inventory,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to start conversation");
      }
      const data = await res.json() as { opening: string };
      setMessages([{ role: "ai", text: data.opening }]);
      setPhase("session");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsStarting(false);
    }
  }, [profile?.id, inventory]);

  // ─── Send a reply: conversation continues, NO corrections shown ────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking) return;

    const nextMessages: ChambreMessage[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setIsThinking(true);
    setError(null);

    try {
      const res = await fetch("/api/chambre/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
  }, [input, isThinking, messages, inventory, profile?.id]);

  // ─── End the session: only NOW do corrections appear ───────────────────────
  const handleFinish = useCallback(async () => {
    setError(null);
    setIsEnding(true);
    try {
      const res = await fetch("/api/chambre/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          inventory,
          user_id: profile?.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to generate report");
      }
      const data = await res.json() as { report: ChambreReport };
      setReport(data.report);
      setPhase("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsEnding(false);
    }
  }, [messages, inventory, profile?.id]);

  const handleRestart = useCallback(() => {
    setMessages([]);
    setReport(null);
    setPhase("intro");
  }, []);

  // ─── Intro screen ───────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="px-4 pt-6 flex flex-col gap-6">
        <button
          onClick={() => router.push("/learn")}
          className="self-start text-sm text-gray-500 hover:text-gray-700"
        >
          ← Accueil
        </button>

        <div className="flex flex-col items-center text-center gap-3 pt-4">
          <span className="text-6xl">🚪</span>
          <h1 className="text-2xl font-bold text-gray-900">La Chambre</h1>
          <p className="text-sm text-gray-600 max-w-xs">
            Une conversation libre avec Monsieur Aaron. Il parle{" "}
            <span className="font-semibold">uniquement avec les mots de votre vocabulaire</span>{" "}
            — à vous de continuer la discussion.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🤫</span>
            <p className="text-sm text-gray-700">
              Pas de corrections pendant la conversation — gardez le flow.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl">📝</span>
            <p className="text-sm text-gray-700">
              Vos corrections arrivent à la fin, quand vous décidez de sortir.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl">💬</span>
            <p className="text-sm text-gray-700">
              Vous connaissez <span className="font-semibold text-blue-600">{knownWordCount}</span>{" "}
              mots — Monsieur Aaron n'utilisera qu'eux.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button size="lg" fullWidth onClick={handleEnter} disabled={isStarting}>
          {isStarting ? "Ouverture de la chambre…" : "Entrer dans la chambre ✨"}
        </Button>

        <p className="text-xs text-gray-400 text-center">
          La conversation est générée par l'IA — terminez quand vous voulez
        </p>
      </div>
    );
  }

  // ─── Report screen (corrections, shown only after the session) ─────────────
  if (phase === "report" && report) {
    return (
      <div className="px-4 pt-6 flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-5xl">📝</span>
          <h1 className="text-2xl font-bold text-gray-900">Votre rapport</h1>
          <p className="text-sm text-gray-500">La conversation est terminée — voici vos corrections.</p>
        </div>

        {report.overall_feedback && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
              Bilan
            </h3>
            <p className="text-sm text-blue-900">{report.overall_feedback}</p>
          </div>
        )}

        {report.corrections.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Corrections ({report.corrections.length})
            </h3>
            {report.corrections.map((c, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 text-sm mt-0.5">✗</span>
                  <p className="text-sm text-gray-500 line-through decoration-red-300">
                    {c.original}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 text-sm mt-0.5">✓</span>
                  <p className="text-sm font-semibold text-emerald-700">{c.corrected}</p>
                </div>
                {c.explanation && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                    💡 {c.explanation}
                  </p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-sm font-semibold text-emerald-700">
              Aucune erreur détectée — félicitations !
            </p>
          </div>
        )}

        {report.vocabulary_used.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Vocabulaire utilisé
            </h3>
            <div className="flex flex-wrap gap-2">
              {report.vocabulary_used.map((word) => (
                <span
                  key={word}
                  className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-medium text-indigo-700"
                >
                  {word}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-3 pb-4">
          <Button size="lg" fullWidth onClick={handleEnter} disabled={isStarting}>
            {isStarting ? "Ouverture…" : "Rejouer 🔄"}
          </Button>
          <Button variant="secondary" fullWidth onClick={handleRestart}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  // ─── Session screen (chat — no corrections here, ever) ─────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur">
        <span className="text-xl">🚪</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">La Chambre</p>
          <p className="text-xs text-gray-400">
            {isThinking ? "Monsieur Aaron réfléchit…" : "Conversation libre — pas de corrections"}
          </p>
        </div>
        <button
          onClick={handleFinish}
          disabled={isEnding || isThinking}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {isEnding ? "…" : "Terminer ✓"}
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
                  Monsieur Aaron
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
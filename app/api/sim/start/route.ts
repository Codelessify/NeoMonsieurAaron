import { NextRequest, NextResponse } from "next/server";
import { generateSimulationOpening } from "@/lib/simulation";
import { createClient } from "@/lib/supabase/server";
import { SCENARIOS } from "@/lib/scenarios";
import type { LearnerInventory, ScenarioId } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      scenario: ScenarioId;
      place_name?: string;
      user_id?: string;
      inventory: LearnerInventory;
    };

    if (!body.scenario || !SCENARIOS[body.scenario]) {
      return NextResponse.json({ error: "valid scenario is required" }, { status: 400 });
    }
    if (!body.inventory) {
      return NextResponse.json({ error: "inventory is required" }, { status: 400 });
    }

    // Get user's context language preference from Supabase
    let contextLanguage: "english" | "french" | "mixed" = "english";
    if (body.user_id) {
      try {
        const supabase = await createClient();
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("context_language")
          .eq("id", body.user_id)
          .single();
        if (profile?.context_language) {
          contextLanguage = profile.context_language;
        }
      } catch (err) {
        console.error("[sim-start] failed to load user context language", err);
      }
    }

    const opening = await generateSimulationOpening(
      body.scenario,
      body.inventory,
      contextLanguage,
      body.place_name
    );

    return NextResponse.json({ opening });
  } catch (err) {
    console.error("[sim-start]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { generateChambreOpening } from "@/lib/chambre";
import { createClient } from "@/lib/supabase/server";
import type { LearnerInventory } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      user_id?: string;
      inventory: LearnerInventory;
    };

    if (!body.inventory) {
      return NextResponse.json({ error: "inventory is required" }, { status: 400 });
    }

    // Get user's context language preference from Supabase
    let contextLanguage: "english" | "french" | "mixed" = "english";
    let location: string | null = null;
    if (body.user_id) {
      try {
        const supabase = await createClient();
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("context_language, location")
          .eq("id", body.user_id)
          .single();
        if (profile?.context_language) {
          contextLanguage = profile.context_language;
        }
        if (profile?.location) {
          location = profile.location;
        }
      } catch (err) {
        console.error("[chambre-start] failed to load user profile", err);
      }
    }

    const opening = await generateChambreOpening(
      body.inventory,
      contextLanguage,
      location
    );

    return NextResponse.json({ opening });
  } catch (err) {
    console.error("[chambre-start]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
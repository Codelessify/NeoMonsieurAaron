import { NextRequest, NextResponse } from "next/server";
import { generateChambreReply } from "@/lib/chambre";
import { createClient } from "@/lib/supabase/server";
import type { ChambreMessage, LearnerInventory } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      messages: ChambreMessage[];
      inventory: LearnerInventory;
      user_id?: string;
    };

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "messages are required" }, { status: 400 });
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
        console.error("[chambre-reply] failed to load user context language", err);
      }
    }

    const reply = await generateChambreReply(
      body.messages,
      body.inventory,
      contextLanguage
    );

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[chambre-reply]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
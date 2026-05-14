// Generate a randomized NPC using user-defined editable category templates
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Cat { key: string; label: string; options: string[]; allowMultiple?: boolean }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { categories = [] as Cat[], seed = "", project = {} as { genre?: string; toneNotes?: string; settingSummary?: string }, familyFriendly = false } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const contentNote = familyFriendly
      ? "Family-friendly mode: keep the NPC appropriate for general audiences."
      : "Adult literary fiction: NPCs may include morally complex traits, romance, dark themes. Be specific and grounded — not lurid.";

    const props: Record<string, any> = {
      name: { type: "string", description: "Full name appropriate to the story's setting" },
      shortBio: { type: "string", description: "2-4 sentence vivid character pitch" },
      appearance: { type: "string", description: "1-2 sentences of physical description" },
      personality: { type: "string", description: "1-2 sentences capturing voice and demeanor" },
      hook: { type: "string", description: "One sentence story hook — why this NPC matters" },
    };
    const required = ["name", "shortBio", "appearance", "personality", "hook"];
    for (const c of categories) {
      props[c.key] = c.allowMultiple
        ? { type: "array", items: { type: "string", enum: c.options }, description: c.label }
        : { type: "string", enum: c.options, description: c.label };
      required.push(c.key);
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `You are an NPC generator for a writer's canon studio. Generate ONE fully-realized NPC that fits the project's tone and setting. Choose values ONLY from the provided enums for each category. ${contentNote}` },
          { role: "user", content: `Project genre: ${project.genre || "(unspecified)"}\nTone: ${project.toneNotes || "(unspecified)"}\nSetting: ${(project.settingSummary || "").slice(0, 800)}\n\nUser seed/direction: ${seed || "(surprise me)"}\n\nCategories to fill: ${categories.map((c) => `${c.label} (${c.allowMultiple ? "multi" : "one"} of: ${c.options.join(", ")})`).join("; ")}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_npc",
            description: "Return a fully-populated NPC.",
            parameters: { type: "object", properties: props, required, additionalProperties: false },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_npc" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "Out of credits — add some in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("ai gateway", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await resp.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let npc: any = {};
    try { npc = JSON.parse(args || "{}"); } catch { npc = {}; }
    return new Response(JSON.stringify({ npc }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

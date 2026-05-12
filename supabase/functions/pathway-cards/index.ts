// Lovable AI: generate cinematic Pathway Cards (writer-focused, NOT node graphs)
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SourceCtx { name: string; order: number; excerpt: string }
interface PriorCard { title: string; summary: string; state: string }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const {
      sources = [] as SourceCtx[],
      canon = [] as { name: string; type: string }[],
      priorCards = [] as PriorCard[],
      continueFrom = null as PriorCard | null,
      filters = {} as Record<string, any>,
      endGoal = "",
      tone = "",
      pacing = "",
      relationships = "",
      pathwayType = "Plot Arc Pathway",
      count = 4,
      mode = "fresh", // 'fresh' | 'continue'
      familyFriendly = false,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const sourceList = sources
      .sort((a: SourceCtx, b: SourceCtx) => a.order - b.order)
      .map((s: SourceCtx, i: number) => `[#${i + 1} ${s.name}]\n${(s.excerpt || "").slice(0, 1500)}`)
      .join("\n\n");
    const canonList = canon.slice(0, 120).map((c) => `- ${c.name} (${c.type})`).join("\n");
    const priorList = priorCards.slice(0, 12).map((c) => `- [${c.state}] ${c.title}: ${c.summary}`).join("\n");

    const sys = `You are a writer's pathway designer. You create CINEMATIC, CARD-BASED story continuation ideas (NOT graphs, NOT workflows). Each card is a vivid mini-pitch a novelist could expand into a chapter or arc. Cards must respect the writer's existing canon and the story order of their uploads. Stay grounded in their characters, locations, factions, and tone. ${mode === "continue" ? "These cards continue DIRECTLY from the selected prior pathway — do not pivot to unrelated ideas." : ""}`;

    const userMsg = `
Pathway type: ${pathwayType}
Number of cards: ${count}
${endGoal ? `Desired ending direction: ${endGoal}` : ""}
${tone ? `Tone: ${tone}` : ""}
${pacing ? `Pacing: ${pacing}` : ""}
${relationships ? `Relationship priorities: ${relationships}` : ""}
${Object.keys(filters).length ? `Filters / canon restrictions: ${JSON.stringify(filters)}` : ""}

${continueFrom ? `CONTINUE FROM THIS CONFIRMED PATHWAY:\n[${continueFrom.state}] ${continueFrom.title}\n${continueFrom.summary}\n\nGenerate "what happens next" from THIS exact route.` : ""}

EXISTING CANON:
${canonList || "(none)"}

PRIOR PATHWAY DECISIONS (memory):
${priorList || "(none)"}

UPLOADED STORY MATERIAL (in user-confirmed story order):
${sourceList || "(none)"}
`.trim();

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userMsg },
      ],
      tools: [{
        type: "function",
        function: {
          name: "emit_pathway_cards",
          description: "Return cinematic pathway cards.",
          parameters: {
            type: "object",
            properties: {
              cards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Short cinematic title" },
                    logline: { type: "string", description: "1 sentence pitch" },
                    summary: { type: "string", description: "2-4 sentence arc" },
                    beats: { type: "array", items: { type: "string" }, description: "3-6 ordered story beats" },
                    involves: { type: "array", items: { type: "string" }, description: "Canon names involved" },
                    timelineImpact: { type: "string", description: "How this affects the timeline if confirmed" },
                    risks: { type: "string", description: "Continuity risks or tradeoffs" },
                  },
                  required: ["title", "logline", "summary", "beats"],
                  additionalProperties: false,
                },
              },
            },
            required: ["cards"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "emit_pathway_cards" } },
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again soon." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Out of AI credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "AI gateway error", detail: await r.text() }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await r.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { cards: [] };
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

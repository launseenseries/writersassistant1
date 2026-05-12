// Lovable AI: generate a pathway draft from a natural-language prompt
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { prompt, canon, pathwayType, familyFriendly } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const canonList = (canon as { name: string; type: string }[])
      .slice(0, 200)
      .map((c) => `- ${c.name} (${c.type})`)
      .join("\n");

    const contentNote = familyFriendly
      ? "Content policy: Family-friendly mode is ON. Keep all suggestions appropriate for general audiences."
      : "Content policy: Adult literary fiction is supported. Romance, emotional intimacy, dark themes, violence, and morally complex choices are valid story material — engage as a professional collaborator focused on craft.";

    const sys = `You are a story-pathway designer. Given a writer's prompt and a list of existing canon items (characters, locations, factions, timeline events, magic, etc.), produce an ordered pathway. Prefer reusing existing canon names exactly when relevant. Invent new nodes only when needed; mark them with isNew=true. Return 3-8 nodes plus optional connections describing relationships between them.\n\n${contentNote}`;

    const body: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Pathway type: ${pathwayType || "Custom Pathway"}\n\nPrompt: ${prompt}\n\nExisting canon:\n${canonList || "(none)"}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "build_pathway",
          description: "Return a structured pathway draft.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Concise pathway title" },
              description: { type: "string" },
              pathwayType: { type: "string" },
              nodes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    itemType: { type: "string", description: "character | location | faction | family | heritage | faith | magic | timeline | worldbuilding" },
                    summary: { type: "string" },
                    isNew: { type: "boolean" },
                  },
                  required: ["name", "itemType"],
                  additionalProperties: false,
                },
              },
              connections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    from: { type: "string", description: "node name" },
                    to: { type: "string", description: "node name" },
                    label: { type: "string" },
                  },
                  required: ["from", "to", "label"],
                  additionalProperties: false,
                },
              },
            },
            required: ["name", "pathwayType", "nodes"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "build_pathway" } },
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again soon." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Out of credits. Add funds in Lovable AI workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "AI gateway error", detail: await r.text() }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await r.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { name: "", pathwayType: pathwayType || "Custom Pathway", nodes: [] };
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

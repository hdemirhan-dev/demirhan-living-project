export async function onRequestPost(context) {
  const headers = { 
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  };

  try {
    const body = await context.request.json();
    const { message, agentStep, toolName, toolResult, availableTools } = body;
    const ai = context.env.AI;

    // SCHRITT 1: Router - Entschiede strikt ob Tool-Call oder Final-Reply
    if (agentStep === "init") {
      const routerPrompt = `
        Du bist ein KI-Agent für Demirhan.Living.
        Analysiere die Nutzeranfrage: "${message}"
        Verfügbare Tools: ${JSON.stringify(availableTools)}

        Du MUSST eine dieser zwei JSON-Antworten geben:
        1. Wenn ein Tool helfen kann: {"status": "tool_call", "toolName": "NAME_DES_TOOLS", "arguments": {"query": "..."}}
        2. Wenn kein Tool passt: {"status": "final_reply", "reply": "Dein Text hier"}
        
        Antworte nur mit dem JSON-Objekt.
      `;

      const res = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
        messages: [{ role: 'system', content: routerPrompt }, { role: 'user', content: message }],
        response_format: { type: "json_object" }
      });
      
      return new Response(JSON.stringify(res.response || res), { headers });
    }

    // SCHRITT 2: Synthese - Verarbeite Tool-Ergebnis
    if (agentStep === "tool_result") {
      const synthesisePrompt = `Beantworte die Frage "${message}" basierend auf diesen Daten: ${JSON.stringify(toolResult)}`;
      const res = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
        messages: [{ role: 'system', content: synthesisePrompt }]
      });
      
      return new Response(JSON.stringify({ status: "final_reply", reply: res.response }), { headers });
    }

    return new Response(JSON.stringify({ status: "final_reply", reply: "Fehler: Unbekannter Schritt." }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ status: "final_reply", reply: "Fehler: " + err.message }), { status: 200, headers });
  }
}
export async function onRequestPost(context) {
  // 1. Immer ein Response-Objekt zurückgeben, egal welcher Fehler auftritt
  try {
    const body = await context.request.json();
    const { message, agentStep, toolName, toolResult, availableTools } = body;
    const ai = context.env.AI;

    if (!message) {
      return new Response(JSON.stringify({ status: "final_reply", reply: "Keine Nachricht." }), { status: 400 });
    }

    if (agentStep === "init") {
      const routerPrompt = `
        Analysiere diese Tools: ${JSON.stringify(availableTools)}
        Nutzerfrage: "${message}"
        Antworte NUR mit JSON: { "status": "tool_call", "toolName": "...", "arguments": {...} } 
        oder { "status": "final_reply", "reply": "..." }
      `;

      const res = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
        messages: [{ role: 'system', content: routerPrompt }, { role: 'user', content: message }],
        response_format: { type: "json_object" }
      });
      
      // Rückgabe der KI-Entscheidung
      return new Response(JSON.stringify(res), { headers: { 'Content-Type': 'application/json' } });
    }

    if (agentStep === "tool_result") {
      const systemPrompt = `Antworte präzise auf Basis der Daten: ${JSON.stringify(toolResult)}`;
      const res = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }]
      });
      
      return new Response(JSON.stringify({ status: "final_reply", reply: res.response }), { headers: { 'Content-Type': 'application/json' } });
    }

    // FALLBACK: Wenn weder init noch tool_result passt
    return new Response(JSON.stringify({ status: "final_reply", reply: "Unbekannter Fehler." }), { status: 200 });

  } catch (err) {
    // FEHLER-ABFANG: Sendet immer eine gültige JSON-Response, auch bei Absturz!
    return new Response(JSON.stringify({ 
      status: "final_reply", 
      reply: "Systemfehler: " + err.message 
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
export async function onRequestPost(context) {
  const headers = { 
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  };

  try {
    const body = await context.request.json();
    const { message, agentStep, toolName, toolResult, availableTools } = body;
    const ai = context.env.AI;

    if (!message) {
      return new Response(JSON.stringify({ status: "final_reply", reply: "Keine Nachricht." }), { status: 400, headers });
    }

    if (agentStep === "init") {
      // PROMPT OPTIMIERUNG: Striktes JSON erzwingen
      const routerPrompt = `
        Du bist ein präziser Legal-Agent. Deine Aufgabe ist es, aus den verfügbaren Tools das beste für die Anfrage auszuwählen.
        Verfügbare Tools: ${JSON.stringify(availableTools)}
        
        Regeln:
        1. Antworte EXKLUSIV als JSON-Objekt.
        2. Kein einleitender oder nachfolgender Text.
        3. Wenn du ein Tool nutzt, antworte: {"status": "tool_call", "toolName": "NAME", "arguments": { ... }}
        4. Wenn kein Tool passt, antworte: {"status": "final_reply", "reply": "TEXT"}
      `;

      const res = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
        messages: [{ role: 'system', content: routerPrompt }, { role: 'user', content: message }],
        response_format: { type: "json_object" }
      });
      
      // Rückgabe der KI-Entscheidung
      const aiJson = res.response || res;
      return new Response(JSON.stringify(aiJson), { headers });
    }

    if (agentStep === "tool_result") {
      const systemPrompt = `Antworte präzise auf Basis der Daten: ${JSON.stringify(toolResult)}`;
      const res = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }]
      });
      
      return new Response(JSON.stringify({ status: "final_reply", reply: res.response }), { headers });
    }

    return new Response(JSON.stringify({ status: "final_reply", reply: "Router-Fehler: Keine Logik für diesen Schritt gefunden." }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ status: "final_reply", reply: "Systemfehler im Backend: " + err.message }), { 
      status: 200, 
      headers 
    });
  }
}
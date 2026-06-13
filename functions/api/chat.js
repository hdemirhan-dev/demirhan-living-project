export async function onRequestPost(context) {
  // Zentrale Header-Konfiguration
// ...
// Aktualisierte Header-Logik
// Nur das Nötigste für eine API
const headers = { 
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
};
// Lösche 'Cache-Control', 'Pragma' und 'Expires' komplett aus dem Objekt!
// ...

  try {
    const body = await context.request.json();
    const { message, agentStep, toolName, toolResult, availableTools } = body;
    const ai = context.env.AI;

    if (!message) {
      return new Response(JSON.stringify({ status: "final_reply", reply: "Keine Nachricht." }), { status: 400, headers });
    }

    if (agentStep === "init") {
      const routerPrompt = `
        Analysiere diese Tools: ${JSON.stringify(availableTools)}
        Nutzerfrage: "${message}"
        Antworte NUR mit validem JSON. Beispiel: { "status": "tool_call", "toolName": "...", "arguments": {...} } 
        oder { "status": "final_reply", "reply": "..." }
      `;

      const res = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
        messages: [{ role: 'system', content: routerPrompt }, { role: 'user', content: message }],
        response_format: { type: "json_object" }
      });
      
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

    return new Response(JSON.stringify({ status: "final_reply", reply: "Unbekannter Fehler." }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ status: "final_reply", reply: "Systemfehler: " + err.message }), { 
      status: 200, 
      headers 
    });
  }
}
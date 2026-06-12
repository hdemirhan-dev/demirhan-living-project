export async function onRequestPost(context) {
  const { message, agentStep, toolName, toolResult, availableTools } = await context.request.json();
  const ai = context.env.AI;

  if (agentStep === "init") {
    const routerPrompt = `
      Du bist der Chef-Architekt von "Demirhan Living". Wähle aus diesen verfügbaren Werkzeugen das passende aus:
      ${JSON.stringify(availableTools)}
      
      Nutzerfrage: "${message}"
      Antworte NUR mit JSON: { "status": "tool_call", "toolName": "...", "arguments": {...} } 
      oder bei Themenfremdheit: { "status": "final_reply", "reply": "..." }
    `;

    const res = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
      messages: [{ role: 'system', content: routerPrompt }, { role: 'user', content: message }],
      response_format: { type: "json_object" }
    });
    return new Response(JSON.stringify(res), { headers: { 'Content-Type': 'application/json' }});
  }

  if (agentStep === "tool_result") {
    const systemPrompt = `
      Du bist der offizielle KI-Assistent. Beantworte die Frage basierend auf diesen Live-Daten:
      ${toolResult}
      *Rechtlicher Hinweis: Die von dieser KI bereitgestellten Informationen dienen ausschließlich der allgemeinen Orientierung und stellen keine Rechts- oder Steuerberatung dar.*
    `;
    const res = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }]
    });
    return new Response(JSON.stringify({ status: "final_reply", reply: res.response }), { headers: { 'Content-Type': 'application/json' }});
  }
}
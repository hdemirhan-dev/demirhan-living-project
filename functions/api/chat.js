export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { message, agentStep, toolName, toolResult, availableTools } = body;
    const ai = context.env.AI;

    // SICHERHEIT: Wenn Body leer oder keine Nachricht, sofort Response
    if (!message) {
      return new Response(JSON.stringify({ status: "final_reply", reply: "Bitte geben Sie eine Nachricht ein." }), { status: 400 });
    }

    if (agentStep === "init") {
      const routerPrompt = `...`; // (Dein Prompt)
      
      const res = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
        messages: [{ role: 'system', content: routerPrompt }, { role: 'user', content: message }],
        response_format: { type: "json_object" }
      });

      // HIER DIE REPARATUR: Stelle sicher, dass immer eine Response zurückkommt
      const responseData = res.choices?.[0]?.message?.content || res.response;
      return new Response(responseData, { headers: { 'Content-Type': 'application/json' }});
    }

    // ... (restlicher Code)

  } catch (err) {
    // REPARATUR: Auch bei Fehlern muss Cloudflare ein Response-Objekt sehen!
    return new Response(JSON.stringify({ status: "final_reply", reply: "Entschuldigung, ein Systemfehler ist aufgetreten." }), { 
      status: 200, // Wir senden 200, damit das Frontend nicht in den catch-Block läuft
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
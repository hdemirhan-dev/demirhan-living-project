export async function onRequestPost(context) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };

  try {
    const body = await context.request.json();
    const { message, agentStep, toolName, toolResult, availableTools } = body;
    const ai = context.env.AI;
    
    // Euer festgelegtes Modell
    const AI_MODEL = '@cf/google/gemma-4-26b-a4b-it';

    // 1. Synthese: Wenn das Tool-Ergebnis aus dem Frontend (chat-ui.js) kommt
    if (agentStep === "tool_result") {
      const res = await ai.run(AI_MODEL, {
        messages: [{ role: 'user', content: `Antworte auf die Frage "${message}" basierend auf diesen Daten: ${JSON.stringify(toolResult)}` }]
      });
      return new Response(JSON.stringify({ status: "final_reply", reply: res.response }), { headers });
    }

    // 2. Router: Standard-Pfad für die erste Anfrage
    const prompt = `Analysiere die Anfrage: "${message}". Wähle ein Tool aus: ${JSON.stringify(availableTools)}.
    ANTWORTE NUR MIT EINEM JSON-OBJEKT: 
    {"status": "tool_call", "toolName": "NAME", "arguments": {"query": "..."}} oder 
    {"status": "final_reply", "reply": "TEXT"}`;

    const res = await ai.run(AI_MODEL, {
      messages: [{ role: 'user', content: prompt }]
    });

    // Manuelles Parsing für maximale Stabilität (besonders wichtig bei Gemma)
    const text = res.response || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsedJson = jsonMatch ? JSON.parse(jsonMatch[0]) : { status: "final_reply", reply: text };

    return new Response(JSON.stringify(parsedJson), { headers });

  } catch (err) {
    return new Response(JSON.stringify({ status: "final_reply", reply: "Backend-Fehler: " + err.message }), { headers });
  }
}
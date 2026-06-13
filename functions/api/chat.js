export async function onRequestPost(context) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };

  try {
    const body = await context.request.json();
    const { message, agentStep, toolName, toolResult, availableTools } = body;
    const ai = context.env.AI;

    if (agentStep === "init") {
      const prompt = `Analysiere die Anfrage: "${message}". Wähle ein Tool aus: ${JSON.stringify(availableTools)}.
      ANTWORTE NUR MIT EINEM JSON-OBJEKT: 
      {"status": "tool_call", "toolName": "NAME", "arguments": {"query": "..."}} oder 
      {"status": "final_reply", "reply": "TEXT"}`;

      const res = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
        messages: [{ role: 'user', content: prompt }]
      });

      // MANUELLES PARSING: Wir suchen nach dem ersten '{' und letzten '}'
      const text = res.response || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsedJson = jsonMatch ? JSON.parse(jsonMatch[0]) : { status: "final_reply", reply: text };
      
      return new Response(JSON.stringify(parsedJson), { headers });
    }

    if (agentStep === "tool_result") {
      const res = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
        messages: [{ role: 'user', content: `Antworte auf "${message}" basierend auf: ${JSON.stringify(toolResult)}` }]
      });
      return new Response(JSON.stringify({ status: "final_reply", reply: res.response }), { headers });
    }

    return new Response(JSON.stringify({ status: "final_reply", reply: "Fehler: Schritt nicht gefunden." }), { headers });

  } catch (err) {
    return new Response(JSON.stringify({ status: "final_reply", reply: "Parsing-Fehler: " + err.message }), { headers });
  }
}
export async function onRequestPost(context) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };

  // Deine eigene, robuste Extraktions-Logik ist zurück!
  const extractText = (res) => {
    if (res?.choices?.[0]?.message?.content) return res.choices[0].message.content;
    if (typeof res?.response === 'string') return res.response;
    if (typeof res === 'string') return res;
    if (res?.result?.response) return res.result.response;
    return JSON.stringify(res) || "";
  };

  try {
    const body = await context.request.json();
    const { message, agentStep, toolName, toolResult, availableTools } = body;
    const ai = context.env.AI;
    const AI_MODEL = '@cf/google/gemma-4-26b-a4b-it';

    // 1. Synthese: Wenn das Tool-Ergebnis aus dem Frontend kommt
    if (agentStep === "tool_result") {
      const res = await ai.run(AI_MODEL, {
        messages: [{ role: 'user', content: `Antworte auf die Frage "${message}" basierend auf diesen Daten: ${JSON.stringify(toolResult)}` }]
      });
      return new Response(JSON.stringify({ status: "final_reply", reply: extractText(res) }), { headers });
    }

    // 2. Router: Standard-Pfad für die Tool-Entscheidung
    const prompt = `Analysiere die Anfrage: "${message}". Wähle ein Tool aus: ${JSON.stringify(availableTools)}.
    ANTWORTE NUR MIT EINEM JSON-OBJEKT: 
    {"status": "tool_call", "toolName": "NAME", "arguments": {"query": "..."}} oder 
    {"status": "final_reply", "reply": "TEXT"}`;

    const res = await ai.run(AI_MODEL, {
      messages: [{ role: 'user', content: prompt }]
    });

    const text = extractText(res);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsedJson = jsonMatch ? JSON.parse(jsonMatch[0]) : { status: "final_reply", reply: text };

    return new Response(JSON.stringify(parsedJson), { headers });

  } catch (err) {
    return new Response(JSON.stringify({ status: "final_reply", reply: "Backend-Fehler: " + err.message }), { headers });
  }
}
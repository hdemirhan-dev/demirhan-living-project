export async function onRequestPost(context) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };

  try {
    const body = await context.request.json();
    const { message, agentStep, toolResult, availableTools } = body;
    const ai = context.env.AI;

    const AI_MODEL = '@cf/google/gemma-4-26b-a4b-it';

    // Helper: robustly extract text from AI response regardless of shape
    const extractText = (res) => {
      if (typeof res?.response === 'string') return res.response;
      if (typeof res === 'string') return res;
      if (res?.result?.response) return res.result.response;
      return JSON.stringify(res);
    };

    // Helper: try to parse JSON object out of model text
    const extractJson = (text) => {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    };

    // PFAD 1: Synthese nach Tool-Ergebnis
    if (agentStep === "tool_result") {
      const res = await ai.run(AI_MODEL, {
        messages: [
          {
            role: 'system',
            content: 'Du bist ein hilfreicher Assistent für steuerliche Fragen. Antworte präzise und auf Deutsch.'
          },
          {
            role: 'user',
            content: `Ursprüngliche Frage: "${message}"\n\nToolErgebnis: ${JSON.stringify(toolResult)}\n\nFormuliere eine klare Antwort basierend auf diesem Ergebnis.`
          }
        ]
      });

      const reply = extractText(res) || "Es gab leider keine Antwort vom Modell.";
      return new Response(JSON.stringify({ status: "final_reply", reply }), { headers });
    }

    // PFAD 2: Router (Standardfall: agentStep fehlt oder "init")
    const tools = Array.isArray(availableTools) ? availableTools : [];

    const prompt = `Analysiere die folgende Nutzeranfrage und entscheide, ob ein Tool benötigt wird.

Anfrage: "${message}"

Verfügbare Tools: ${JSON.stringify(tools)}

ANTWORTE AUSSCHLIESSLICH MIT EINEM JSON-OBJEKT, OHNE ERKLÄRUNGEN, OHNE MARKDOWN, IN GENAU EINER DIESER FORMEN:
{"status": "tool_call", "toolName": "NAME_DES_TOOLS", "arguments": {"query": "..."}}
{"status": "final_reply", "reply": "DEINE ANTWORT AUF DEUTSCH"}`;

    const res = await ai.run(AI_MODEL, {
      messages: [
        {
          role: 'system',
          content: 'Du antwortest IMMER nur mit validem JSON, niemals mit Fließtext oder Markdown-Codeblöcken.'
        },
        { role: 'user', content: prompt }
      ]
    });

    const text = extractText(res);
    const parsed = extractJson(text);

    if (!parsed) {
      // Model didn't return valid JSON — treat raw text as final reply
      return new Response(JSON.stringify({ status: "final_reply", reply: text || "Entschuldigung, ich konnte keine Antwort generieren." }), { headers });
    }

    // Validate tool_call structure
    if (parsed.status === "tool_call") {
      const validTool = tools.find(t => (t.name || t) === parsed.toolName);
      if (!validTool) {
        // Hallucinated tool name — fall back to final_reply
        return new Response(JSON.stringify({
          status: "final_reply",
          reply: parsed.reply || "Entschuldigung, dafür habe ich kein passendes Werkzeug."
        }), { headers });
      }
      if (!parsed.arguments) parsed.arguments = {};
    }

    if (parsed.status !== "tool_call" && parsed.status !== "final_reply") {
      return new Response(JSON.stringify({ status: "final_reply", reply: text }), { headers });
    }

    return new Response(JSON.stringify(parsed), { headers });

  } catch (err) {
    return new Response(JSON.stringify({
      status: "final_reply",
      reply: "Es ist ein Fehler aufgetreten: " + err.message
    }), { headers, status: 200 });
  }
}
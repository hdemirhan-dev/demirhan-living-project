export async function onRequestPost(context) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  
  // 1. KORREKTUR: Der /mcp Pfad ist jetzt angehängt
  const MEVZUAT_MCP_URL = "https://demirhan-mevzuat-mcp.hdpasso29.workers.dev/mcp";
  
  const KV = context.env.TOOLS_CACHE;
  const CACHE_TTL = 86400;
  const MAX_STEPS = 2;
  
  // 2. KORREKTUR: Zuverlässiges und unterstütztes Modell für Tool-Calling
  const AI_MODEL = '@cf/google/gemma-4-26b-a4b-it';

  // Hilfsfunktionen zum Extrahieren von Antworten
  const extractText = (res) => {
    if (res?.choices?.[0]?.message?.content) return res.choices[0].message.content;
    if (typeof res?.response === 'string') return res.response;
    if (typeof res === 'string') return res;
    if (res?.result?.response) return res.result.response;
    return JSON.stringify(res);
  };

  const extractJson = (text) => {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  };

  // 3. KORREKTUR: Abgesicherter Tool-Abruf
  const getTools = async () => {
    if (KV) {
      const cached = await KV.get("mevzuat_tools", "json");
      if (cached) return cached;
    }
    
    const res = await fetch(MEVZUAT_MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })
    });
    
    // Schutz gegen Non-JSON Responses (wie 404 Endpoint not found)
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`MCP Server meldet ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const tools = data?.result?.tools || [];
    const slimTools = tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema?.properties
        ? Object.fromEntries(Object.entries(t.inputSchema.properties).map(([k, v]) => [k, v.description || v.type]))
        : {}
    }));
    
    if (KV) await KV.put("mevzuat_tools", JSON.stringify(slimTools), { expirationTtl: CACHE_TTL });
    return slimTools;
  };

  // 4. KORREKTUR: Abgesicherte Tool-Ausführung
  const callMcpTool = async (toolName, args) => {
    const res = await fetch(MEVZUAT_MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: toolName, arguments: args || {} }
      })
    });

    // Schutz gegen Non-JSON Responses
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Tool ${toolName} fehlgeschlagen (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data?.result?.content?.[0]?.text || data?.result || data;
  };

  // Der Master-Prompt für den Agenten
  const SYSTEM_PROMPT = `Du bist ein Rechercheassistent für türkisches Recht/Steuerrecht auf demirhan.living.
Verstehe die SEMANTISCHE Absicht der Frage (z.B. "Begründung des Gesetzgebers" = Gerekçe, "was steht in Artikel X" = Artikeltext), nicht nur Stichworte.
Übersetze die Anfrage in passende Suchbegriffe für die Solr/Keyword-Tools (Synonyme, Kurz-/Langform).
Gesetzesnummern wie "7582" = türkisches Gesetz (Kanun), Resmî Gazete.
Wenn search_* eine mevzuat_id/gerekce_id liefert, nutze sie gezielt im nächsten Schritt (get_mevzuat_content / get_mevzuat_gerekce / get_mevzuat_madde_tree / search_within_*).
Antworte NIEMALS mit "ich brauche mehr Infos", solange du noch einen Versuch übrig hast.

ANTWORTE AUSSCHLIESSLICH MIT EINEM JSON-OBJEKT, OHNE ERKLÄRUNG, OHNE MARKDOWN:
{"status": "tool_call", "toolName": "NAME", "arguments": {...}, "reasoning": "kurz"} oder
{"status": "final_reply", "reply": "TEXT AUF DEUTSCH"}`;

  try {
    const body = await context.request.json();
    const { message } = body;
    const ai = context.env.AI;

    const tools = await getTools();
    const history = [];
    let finalReply = null;

    // Agenten-Schleife (Router -> Tool Execution -> Synthese)
    for (let step = 0; step < MAX_STEPS; step++) {
      const contextBlock = history.length
        ? `\n\nBisherige Schritte:\n${history.map((h, i) => `Schritt ${i + 1}: Tool=${h.toolName} (${h.reasoning})\nErgebnis: ${JSON.stringify(h.result).slice(0, 1200)}`).join('\n\n')}`
        : '';

      const lastStepNote = step === MAX_STEPS - 1
        ? '\n\nWICHTIG: Letzter Schritt — antworte zwingend mit final_reply basierend auf dem bisher Gefundenen.'
        : '';

      const prompt = `Nutzeranfrage: "${message}"\n\nVerfügbare Tools:\n${JSON.stringify(tools)}${contextBlock}${lastStepNote}`;

      const res = await ai.run(AI_MODEL, {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ]
      });

      const text = extractText(res);
      const parsed = extractJson(text);

      // Abbruch bei unbrauchbarem Ergebnis
      if (!parsed) {
        finalReply = text || "Entschuldigung, ich konnte keine Antwort generieren.";
        break;
      }

      // Finale Antwort erreicht
      if (parsed.status === "final_reply") {
        finalReply = parsed.reply;
        break;
      }

      // Tool Call angefordert
      if (parsed.status === "tool_call") {
        const validTool = tools.find(t => t.name === parsed.toolName);
        if (!validTool) {
          history.push({ toolName: parsed.toolName, reasoning: parsed.reasoning || '', result: { error: "Unbekanntes Tool" } });
          continue;
        }
        
        // Tool ausführen und Ergebnis in Historie schreiben
        const toolResult = await callMcpTool(parsed.toolName, parsed.arguments || {});
        history.push({ toolName: parsed.toolName, reasoning: parsed.reasoning || '', result: toolResult });
        continue;
      }

      // Fallback
      finalReply = text;
      break;
    }

    // Wenn nach allen Schritten keine finale Antwort vorliegt
    if (!finalReply) {
      finalReply = "Ich konnte die Frage nicht abschließend beantworten." +
        (history.length ? ` Versuchte Suchen: ${history.map(h => h.toolName).join(', ')}.` : '');
    }

    return new Response(JSON.stringify({ status: "final_reply", reply: finalReply }), { headers });

  } catch (err) {
    return new Response(JSON.stringify({ status: "final_reply", reply: "Es ist ein Fehler aufgetreten: " + err.message }), { headers });
  }
}








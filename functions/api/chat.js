import istanbulDatabase from '../../data/istanbul_net.json';

export async function onRequestPost(context) {
  try {
    // 1. Überprüfen, ob das native Cloudflare AI-Binding aktiv ist
    if (!context.env.AI) {
      return new Response(
        JSON.stringify({ error: "Cloudflare Workers AI Binding ist nicht konfiguriert." }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Client-Frage aus dem Request-Body auslesen
    const { message } = await context.request.json();

    // 3. Deine JSON-Wissensbasis (Kanzleien, Ärzte, etc.) für das Modell vorbereiten
    const stringifiedContext = JSON.stringify(istanbulDatabase);

    // 4. System Prompt mit deinen rechtlichen Rahmenbedingungen und Guardrails definieren
    const systemPrompt = `
      Du bist ein hochpräziser KI-Assistent für Steuerrecht und Relocation zwischen Deutschland und der Türkei (Stand Juni 2026).
      Nutze den folgenden Kontext (Gesetzesänderungen wie Kanun 7582, DBA-Regeln und die Dienstleister-Datenbank in Istanbul), um die Frage des Nutzers präzise zu beantworten.
      
      STRIKTE REGELN:
      1. Wenn im Kontext passende Kanzleien, Ärzte oder Institutionen für das Anliegen des Nutzers existieren, nenne sie am Ende deiner Antwort mit konkreten Kontaktdaten.
      2. Gib niemals finale steuerliche Berechnungen in Lira ab, da sich Freibeträge inflationsbedingt ändern.
      3. Weise bei rechtlichen Grauzonen (z.B. Lebensmittelpunkt, Wohnsitzaufgabe) immer darauf hin, dass ein menschlicher Experte konsultiert werden muss.
      4. Antworte immer auf Deutsch, höflich und professionell im Stil von demirhan.living.
      
      KONTEXT-DATENBANK:
      ${stringifiedContext}
    `;

    // 5. Native Ausführung von Llama 3 auf der Cloudflare Edge-Infrastruktur
    const aiResponse = await context.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.3 // Niedrige Temperatur für faktengetreue, präzise Antworten
    });

    // 6. Antwort an das Frontend von demirhan.living zurückgeben
    return new Response(JSON.stringify({ reply: aiResponse.response }), {
      headers: { 
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
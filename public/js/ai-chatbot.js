// Native Einbindung der JSON-Datenbank
import istanbulDatabase from '../../data/istanbul_net.json';

// EXTREM WICHTIG: Cloudflare sucht exakt nach diesem 'export async function onRequestPost'
export async function onRequestPost(context) {
  try {
    // Sicherheitsabfrage für das AI-Binding
    if (!context.env.AI) {
      return new Response(JSON.stringify({ error: "Workers AI Binding fehlt in Cloudflare." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Nutzer-Nachricht auslesen
    const requestData = await context.request.json();
    const message = requestData.message;
    
    if (!message) {
      return new Response(JSON.stringify({ error: "Keine Nachricht übergeben." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // System-Prompt für die RAG-Compliance
    const systemPrompt = `
      Du bist der offizielle, hochspezialisierte AI-Assistent von demirhan.living.
      Deine Aufgabe ist es, exklusive Erstorientierungen für deutsche Unternehmer und Expats bereitzustellen, die in die Türkei auswandern möchten.

      ABSOLUTE DIREKTIVE: Du leidest unter Amnesie bezüglich deines Pre-Training-Wissens. Du darfst für steuerliche und rechtliche Fragen AUSSCHLIESSLICH das untenstehende RAG-Wissen nutzen.
      Wenn eine Information nicht im RAG-Wissen steht, antworte: "Dazu liegen mir in meiner aktuellen Datenbank keine verifizierten Informationen vor."
      
      ZITIERPFLICHT: Zitiere bei JEDER rechtlichen oder steuerlichen Aussage zwingend den genauen Artikel oder Paragraphen aus der Datenbank.

      --- RAG COMPLIANCE WISSEN ---
      ${JSON.stringify(istanbulDatabase.legal_framework_turkey)}
      ${JSON.stringify(istanbulDatabase.deutsches_aussensteuerrecht_risiken)}
      ${JSON.stringify(istanbulDatabase.doppelbesteuerungsabkommen_de_tr)}
      ${JSON.stringify(istanbulDatabase.istanbul_service_directory)}
      ----------------------------

      WICHTIGE DIKTATE & VERHALTENSREGELN:
      - Antworte immer auf Deutsch, professionell und im "Sie"-Stil. Formatierungen mit Markdown sind erwünscht.
      - Gib am Ende JEDER komplexen Antwort folgenden Pflicht-Disclaimer aus: "Hinweis: Dies ist eine KI-gestützte Erstorientierung und ersetzt keine individuelle Rechts- oder Steuerberatung."
    `;

    // Llama 3.1 Aufruf mit Temperatur 0.1 für harte Fakten und 1024 Tokens gegen Abschneiden
    const aiResponse = await context.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.1,
      max_tokens: 1024
    });

    // Erfolgreiche Antwort ans Frontend zurückgeben
    return new Response(JSON.stringify({ reply: aiResponse.response }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    // Fehler abfangen
    return new Response(JSON.stringify({ 
      error: "Interner Serverfehler auf der Edge-Runtime.", 
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
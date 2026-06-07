// Native Einbindung der JSON-Datenbank nach modernem Cloudflare-Standard
import istanbulDatabase from '../../data/istanbul_net.json' assert { type: 'json' };

export async function onRequestPost(context) {
  try {
    // Sicherheitsprüfung für das im Dashboard eingerichtete Workers AI Binding
    if (!context.env.AI) {
      return new Response(JSON.stringify({ 
        error: "Workers AI Binding wurde im Cloudflare-Dashboard nicht gefunden oder falsch benannt." 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. Eingehende Anfrage parsen
    const { message } = await context.request.json();
    
    if (!message) {
      return new Response(JSON.stringify({ error: "Keine Nachricht übergeben." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Systemspezifischen Prompt mit den RAG-Daten initialisieren
    const systemPrompt = `
      Du bist der offizielle, hochspezialisierte AI-Assistent von demirhan.living.
      Deine Aufgabe ist es, exklusive Erstorientierungen für deutsche Unternehmer und Expats bereitzustellen, die in die Türkei (speziell Istanbul) auswandern möchten.

      Nutze für deine Antworten AUSSCHLIESSLICH das folgende verifizierte Wissen aus unserer RAG-Datenbank. Weiche nicht davon ab und halluziniere keine Gesetze:

      --- RAG COMPLIANCE WISSEN ---
      ${JSON.stringify(istanbulDatabase.legal_framework_turkey)}
      ${JSON.stringify(istanbulDatabase.deutsches_aussensteuerrecht_risiken)}
      ${JSON.stringify(istanbulDatabase.doppelbesteuerungsabkommen_de_tr)}

      --- RAG NETZWERK & INFRASTRUKTUR ---
      ${JSON.stringify(istanbulDatabase.istanbul_service_directory)}
      ----------------------------

      WICHTIGE DIKTATE & VERHALTENSREGELN:
      - Antworte immer auf Deutsch, professionell, elegant und im "Sie"-Stil.
      - Wenn der Nutzer nach rechtlichen oder steuerlichen Risiken fragt (z.B. Wegzugsteuer § 6 AStG), erkläre die harten Fakten (Drittstaat, Ratenzahlung nur gegen harte Sicherheiten/Bankbürgschaft) und verweise IMMER proaktiv auf unsere gelisteten Kanzleien (insb. Falke law.tax für Steuern oder Dr. Christian Rumpf für Wirtschaftsrecht).
      - Wenn der Nutzer nach Notaren fragt, kläre auf, dass es staatliche Notariate sind und Ausländer zwingend einen beeidigten Dolmetscher (Yeminli Tercüman) benötigen.
      - Gib am Ende JEDER komplexen steuerlichen Antwort folgenden Pflicht-Disclaimer aus: "Hinweis: Dies ist eine KI-gestützte Erstorientierung und ersetzt keine individuelle Rechts- oder Steuerberatung."
    `;

// 3. Aufruf von Cloudflare Workers AI mit dem AKTUELLEN Llama-Modell
    const aiResponse = await context.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]
    });

    // 4. Antwort an das Frontend ausgeben
    return new Response(JSON.stringify({ reply: aiResponse.response }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: "Interner Serverfehler auf der Edge-Runtime.", 
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
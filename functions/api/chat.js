export async function onRequestPost(context) {
  try {
    // Wir extrahieren jetzt ZUSÄTZLICH den mcpContext, den das Frontend mitschickt
    const { message, mcpContext } = await context.request.json();
    
    if (!message) {
      return new Response(JSON.stringify({ error: "Keine Nachricht empfangen" }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    let finalContext = mcpContext;

    // FALLBACK: Wenn das Frontend aus irgendeinem Grund (z.B. Adblocker) 
    // keine MCP-Daten laden konnte, greifen wir auf die lokale Datei zurück.
    if (!finalContext || finalContext.trim() === "") {
      try {
        const origin = new URL(context.request.url).origin;
        const dbResponse = await fetch(`${origin}/istanbul_database.json`);
        if (dbResponse.ok) {
          finalContext = JSON.stringify(await dbResponse.json());
        } else {
          finalContext = "Keine Mevzuat-Daten verfügbar.";
        }
      } catch (dbError) {
        finalContext = "Keine Mevzuat-Daten verfügbar.";
      }
    }

    // ==========================================================
    // CLOUDFLARE WORKERS AI INTEGRATION
    // ==========================================================
    const ai = context.env.AI;
    if (!ai) {
      return new Response(JSON.stringify({ error: "AI Binding (Umgebungsvariable) fehlt im Cloudflare Dashboard." }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    const systemPrompt = `
      Du bist der offizielle, hochspezialisierte KI-Assistent von "Demirhan Living".
      Deine AUFGABE ist es, Fragen basierend auf der bereitgestellten Datenbank absolut präzise, professionell und auf Deutsch zu beantworten.
      
      FOKUS-THEMA:
      Du antwortest AUSSCHLIESSLICH auf Fragen, die mit dem internationalen Steuerrecht, der deutschen Wegzugsbesteuerung (z. B. § 6 AStG) und dem Doppelbesteuerungsabkommen (DBA) zwischen Deutschland und der Türkei im Kontext von Auswanderern und Investoren zu tun haben.
      
      Hier ist das exklusive Wissen aus unserem System:
      ---
      ${finalContext}
      ---
      
      STRIKTE REGELN FÜR THEMENEINSCHRÄNKUNG:
      1. Wenn die Frage des Nutzers NICHT mit Steuern, Wegzugsbesteuerung, dem DBA Deutschland-Türkei oder steuerlichen Compliance-Fragen zu tun hat, MUSS deine Antwort die Bearbeitung verweigern.
      2. Antworte in diesem Fall ausnahmslos mit folgendem Satz:
         "Als spezialisierter KI-Assistent von Demirhan Living kann ich Ihnen ausschließlich bei Fragen zur Wegzugsbesteuerung und dem Doppelbesteuerungsabkommen (DBA) behilflich sein. Für andere Anfragen wenden Sie sich bitte direkt an unser Kanzlei-Team."
      
      ALLGEMEINE REGELN:
      1. Antworte immer freundlich, formell (Sie) oder gehoben distanziert.
      2. Nutze ausschließlich die Fakten aus der Datenbank. Wenn etwas nicht drin steht, sag höflich, dass wir das individuell prüfen müssen.
      3. Füge am Ende JEDER erlaubten Antwort, getrennt durch eine Leerzeile, exakt folgenden Hinweis in kursiver Schrift an:
         
         *Rechtlicher Hinweis: Die von dieser KI bereitgestellten Informationen dienen ausschließlich der allgemeinen Orientierung und stellen keine Rechts- oder Steuerberatung dar. Jegliche Haftung für die Richtigkeit, Vollständigkeit oder Aktualität der Inhalte ist ausgeschlossen.*
    `;

    const aiResponse = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]
    });

    const replyText = aiResponse.choices?.[0]?.message?.content || aiResponse.response || "Keine Antwort generiert.";

    return new Response(JSON.stringify({ reply: replyText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Interner Serverfehler in der KI-Schnittstelle",
      details: err.message 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
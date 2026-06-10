export async function onRequestPost(context) {
  try {
    const { message } = await context.request.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "Keine Nachricht empfangen" }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 1. Lokale Istanbul-Datenbank laden mit starkem Sicherheitsgurt
    let contextText = "Keine zusätzlichen Datenbank-Infos verfügbar.";
    try {
      const origin = new URL(context.request.url).origin;
      const dbResponse = await fetch(`${origin}/istanbul_database.json`);
      
      if (dbResponse.ok) {
        const database = await dbResponse.json();
        contextText = JSON.stringify(database);
      } else {
        console.log("Datenbank-Datei konnte nicht via Fetch geladen werden. Status:", dbResponse.status);
      }
    } catch (dbError) {
      console.log("Fehler beim Laden/Parsen der JSON-Datenbank:", dbError.message);
      // Wir machen trotzdem weiter, damit die KI zumindest mit Allgemeinwissen antworten kann
    }

    // 2. Cloudflare Workers AI aufrufen
    const ai = context.env.AI;
    if (!ai) {
      return new Response(JSON.stringify({ error: "AI Binding nicht gefunden. Bitte Settings prüfen." }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    const systemPrompt = `
      Du bist der offizielle KI-Assistent von "Demirhan Living", einer Premium-Beratung für Auswanderer und Investoren in Istanbul.
      Deine Aufgabe ist es, Fragen basierend auf der bereitgestellten Datenbank absolut präzise, professionell und auf Deutsch zu beantworten.
      
      Hier ist das Wissen aus unserer internen Datenbank:
      ---
      ${contextText}
      ---
      
      Regeln:
      1. Antworte immer freundlich, formell (Sie) oder gehoben distanziert, passend zum Premium-Look der Website.
      2. Nutze vorrangig die Fakten aus der Datenbank. Wenn etwas nicht drin steht, sag höflich, dass wir das individuell prüfen müssen.
    `;

    const aiResponse = await ai.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]
    });

    // 3. Antwort sauber als valides JSON zurückgeben
    return new Response(JSON.stringify({ reply: aiResponse.response }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache'
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Interner Serverfehler", 
      details: err.message 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
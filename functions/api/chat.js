export async function onRequestPost(context) {
  try {
    const { message } = await context.request.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "Keine Nachricht empfangen" }), { status: 400 });
    }

    // 1. Lokale Istanbul-Datenbank laden
    // Da wir uns in der Edge-Infrastruktur befinden, rufen wir die JSON über die URL ab
    const origin = new URL(context.request.url).origin;
    const dbResponse = await fetch(`${origin}/data/istanbul_database.json`);
    
    let contextText = "Keine zusätzlichen Datenbank-Infos verfügbar.";
    if (dbResponse.ok) {
      const database = await dbResponse.json();
      // Wir machen die gesamte JSON zu lesbarem Text für die KI
      contextText = JSON.stringify(database, null, 2);
    }

    // 2. Cloudflare Workers AI aufrufen (Modell: Llama 3)
    // Das 'context.env.AI' Binding wird von Cloudflare automatisch bereitgestellt
    const ai = context.env.AI;
    
    const systemPrompt = `
      Du bist der offizielle KI-Assistent von "Demirhan Living", einer Premium-Beratung für Auswanderer und Investoren in Istanbul.
      Deine Aufgabe ist es, Fragen basierend auf der bereitgestellten Datenbank absolut präzise, professionell und auf Deutsch zu beantworten.
      
      Hier ist das exklusive Wissen aus unserer internen Datenbank:
      ---
      ${contextText}
      ---
      
      Regeln:
      1. Antworte immer freundlich, formell (Sie) oder gehoben distanziert, passend zum Premium-Look der Website.
      2. Nutze ausschließlich die Fakten aus der Datenbank. Wenn etwas nicht drin steht, sag höflich, dass wir das individuell prüfen müssen.
      3. Nutze Markdown für Formatierungen (**fett**, *kursiv*), um lange Texte lesbar zu machen.
    `;

    const aiResponse = await ai.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]
    });

    // 3. Antwort zurück an das Frontend senden
    return new Response(JSON.stringify({ reply: aiResponse.response }), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Interner Fehler in der Edge-Infrastruktur", 
      details: err.message 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
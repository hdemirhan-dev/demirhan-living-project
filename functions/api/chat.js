// functions/api/chat.js

export async function onRequestPost(context) {
    try {
        const input = await context.request.json();
        
        // Hier kommt später deine KI-Logik hin
        const responseData = {
            reply: `Hallo! Ich habe deine Nachricht erhalten: "${input.message}". Dies ist die Antwort von der Edge.`
        };

        return new Response(JSON.stringify(responseData), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
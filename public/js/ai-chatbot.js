async function sendMessage(event) {
    event.preventDefault();
    
    const inputField = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const userMessage = inputField.value.trim();
    
    if (!userMessage) return;
    
    // 1. Nachricht des Nutzers im UI rendern
    chatBox.innerHTML += `
        <div class="chat-msg user-msg">
            ${userMessage}
        </div>
    `;
    inputField.value = '';
    
    // 2. Temporären Lade-Indikator rendern
    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `
        <div id="${loadingId}" class="chat-msg system-msg" style="font-style: italic; opacity: 0.7;">
            Analysiere Gesetzeslage...
        </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // 3. API-Call an die native Cloudflare Route senden
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage })
        });
        
        const data = await response.json();
        
        // Lade-Indikator entfernen
        if (document.getElementById(loadingId)) {
            document.getElementById(loadingId).remove();
        }
        
        // 4. Prüfen, ob die Edge-Infrastruktur einen internen Fehler meldet
        if (!response.ok || data.error) {
            chatBox.innerHTML += `
                <div class="chat-msg error-msg">
                    <strong>Edge-Fehler:</strong> ${data.error || 'Unerwartete Serverantwort'} <br>
                    <small>${data.details || ''}</small>
                </div>
            `;
            chatBox.scrollTop = chatBox.scrollHeight;
            return;
        }
        
        // 5. Erfolgreiche KI-Antwort formatieren und ausgeben
        if (data.reply) {
            const formattedReply = data.reply.replace(/\n/g, '<br>');
            chatBox.innerHTML += `
                <div class="chat-msg reply-msg">
                    ${formattedReply}
                </div>
            `;
        } else {
            chatBox.innerHTML += `
                <div class="chat-msg error-msg">
                    <strong>Fehler:</strong> Die KI hat keine Textantwort generiert.
                </div>
            `;
        }
        
    } catch (error) {
        // Lade-Indikator im echten Netzwerk-Fehlerfall entfernen
        if (document.getElementById(loadingId)) {
            document.getElementById(loadingId).remove();
        }
        
        chatBox.innerHTML += `
            <div class="chat-msg error-msg">
                <strong>Verbindungsfehler:</strong> Die Anfrage konnte nicht verarbeitet werden.
            </div>
        `;
    }
    
    chatBox.scrollTop = chatBox.scrollHeight;
}
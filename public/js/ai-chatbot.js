// Funktion zum Öffnen und Schließen des Chat-Fensters
function toggleChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    const chatButton = document.getElementById('ai-chat-button');
    const chatTooltip = document.getElementById('ai-chat-tooltip');
    
    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'flex';
        chatButton.style.transform = 'scale(0.95)';
        if (chatTooltip) chatTooltip.style.display = 'none'; // Hinweis-Tooltip permanent ausblenden
    } else {
        chatWindow.style.display = 'none';
        chatButton.style.transform = 'scale(1)';
    }
}

// Funktion zur Verarbeitung und Übermittlung der Nachrichten
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

    // 3. API-Call an deine native Cloudflare Pages Function senden
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage })
        });
        
        const data = await response.json();
        
        // Lade-Indikator entfernen
        document.getElementById(loadingId).remove();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // 4. KI-Antwort formatieren (\n durch <br> ersetzen) und rendern
        const formattedReply = data.reply.replace(/\n/g, '<br>');
        chatBox.innerHTML += `
            <div class="chat-msg reply-msg">
                ${formattedReply}
            </div>
        `;
    } catch (error) {
        // Lade-Indikator im Fehlerfall entfernen
        if (document.getElementById(loadingId)) {
            document.getElementById(loadingId).remove();
        }
        
        // Fehlermeldung ausgeben
        chatBox.innerHTML += `
            <div class="chat-msg error-msg">
                <strong>Verbindungsfehler:</strong> Das Cloudflare Edge-Netzwerk konnte nicht erreicht werden.
            </div>
        `;
    }
    
    // Automatisch zum Ende des Chatverlaufs scrollen
    chatBox.scrollTop = chatBox.scrollHeight;
}
// Globale Sichtbarkeit für HTML-Events
window.toggleChat = toggleChat;
window.sendMessage = sendMessage;

function toggleChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    const chatButton = document.getElementById('ai-chat-button');
    const chatTooltip = document.getElementById('ai-chat-tooltip');
    
    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'flex';
        chatButton.style.transform = 'scale(0.95)';
        if (chatTooltip) chatTooltip.style.display = 'none';
    } else {
        chatWindow.style.display = 'none';
        chatButton.style.transform = 'scale(1)';
    }
}

async function sendMessage(event) {
    event.preventDefault();
    
    const inputField = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const userMessage = inputField.value.trim();
    
    if (!userMessage) return;
    
    // Nachricht des Nutzers sicher einfügen
    const userDiv = document.createElement('div');
    userDiv.className = 'chat-msg user-msg';
    userDiv.textContent = userMessage;
    chatBox.appendChild(userDiv);
    inputField.value = '';
    
    // Lade-Indikator
    const loadingId = 'loading-' + Date.now();
    const loadDiv = document.createElement('div');
    loadDiv.id = loadingId;
    loadDiv.className = 'chat-msg system-msg';
    loadDiv.style.fontStyle = 'italic';
    loadDiv.textContent = 'Analysiere Datenbank...';
    chatBox.appendChild(loadDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage })
        });
        
        const data = await response.json();
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();
        
        if (!response.ok || data.error) {
            throw new Error(data.error || 'Serverfehler');
        }
        
        // Antwort-Formatierung
        if (data.reply) {
            let formattedReply = data.reply
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');
            
            const replyDiv = document.createElement('div');
            replyDiv.className = 'chat-msg reply-msg';
            replyDiv.innerHTML = formattedReply; // Hier ist innerHTML okay, da der Text von deiner KI kommt
            chatBox.appendChild(replyDiv);
        }
        
    } catch (error) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();
        
        const errDiv = document.createElement('div');
        errDiv.className = 'chat-msg error-msg';
        errDiv.textContent = 'Verbindungsfehler zur Edge-Infrastruktur.';
        chatBox.appendChild(errDiv);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}
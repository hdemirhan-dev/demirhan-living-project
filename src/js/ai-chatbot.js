// ==========================================
// 1. CHATBOT WIDGET LOGIK
// ==========================================

// Funktionen an das globale 'window'-Objekt binden (Wichtig für Vite/ESM Kompatibilität)
window.toggleChat = function() {
    const chatWindow = document.getElementById('ai-chat-window');
    const tooltip = document.getElementById('ai-chat-tooltip');
    
    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'flex';
        tooltip.style.display = 'none'; // Tooltip ausblenden, wenn Chat öffnet
    } else {
        chatWindow.style.display = 'none';
    }
};

window.sendMessage = async function(event) {
    event.preventDefault(); // Verhindert das Neuladen der Seite
    
    const inputField = document.getElementById('user-input');
    const userText = inputField.value.trim();
    
    if (!userText) return;

    // Nachricht des Nutzers anzeigen
    appendMessage('user', userText);
    inputField.value = ''; 

    // Lade-Animation anzeigen
    const loadingId = appendMessage('system', 'Tippt gerade...');

    try {
        // Sichere Anfrage an dein Cloudflare Backend (/api/chat)
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: userText })
        });

        if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok.');

        const data = await response.json();

        // Lade-Text entfernen und KI-Antwort einfügen
        removeMessage(loadingId);
        appendMessage('system', data.reply);

    } catch (error) {
        console.error('Fehler bei der KI-Abfrage:', error);
        removeMessage(loadingId);
        appendMessage('system', 'Entschuldigung, es gab einen Verbindungsfehler zur Edge-Infrastruktur.');
    }
};

// --- HILFSFUNKTIONEN FÜR DEN CHAT ---

function appendMessage(sender, text) {
    const chatBox = document.getElementById('chat-box');
    const msgDiv = document.createElement('div');
    const msgId = 'msg-' + Date.now(); 
    
    msgDiv.id = msgId;
    msgDiv.classList.add('chat-msg');
    msgDiv.classList.add(sender === 'user' ? 'user-msg' : 'system-msg');
    msgDiv.textContent = text;
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Automatisch nach unten scrollen
    
    return msgId; 
}

function removeMessage(msgId) {
    const msgDiv = document.getElementById(msgId);
    if (msgDiv) msgDiv.remove();
}


// ==========================================
// 2. SCROLL REVEAL ANIMATION (FX)
// ==========================================

// Startet den Observer sofort beim Laden der Datei (perfekt für Vite HMR)
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Blendet das Element ein
            entry.target.classList.add('visible');
            
            // Optional: Wenn du möchtest, dass Elemente beim Hochscrollen
            // wieder unsichtbar werden, lasse die nächste Zeile auskommentiert.
            // observer.unobserve(entry.target); 
        }
    });
}, {
    threshold: 0.1 // Löst aus, wenn 10% des Elements auf dem Bildschirm sichtbar sind
});

// Sucht alle unsichtbaren Elemente und übergibt sie dem Observer
const hiddenElements = document.querySelectorAll('.reveal');
if (hiddenElements.length > 0) {
    hiddenElements.forEach((el) => observer.observe(el));
}
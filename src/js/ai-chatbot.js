import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// ==========================================
// 0. MCP CLIENT INITIALISIERUNG
// ==========================================
let mcpClient = null;

async function initMcpConnection() {
    try {
        mcpClient = new Client({ name: "demirhan-living-ui", version: "1.0.0" });
        const transport = new SSEClientTransport(
            new URL("https://demirhan-mevzuat-mcp.hdpasso29.workers.dev/mcp")
        );
        await mcpClient.connect(transport);
        console.log("✅ MCP Live-Verbindung über nativen Browser-Stream hergestellt!");
    } catch (error) {
        console.error("MCP Verbindung im Browser fehlgeschlagen:", error);
    }
}
// Verbindung sofort beim Laden der Datei starten
initMcpConnection();

// ==========================================
// 1. CHATBOT WIDGET LOGIK
// ==========================================

// Funktionen an das globale 'window'-Objekt binden (Wichtig für Vite/ESM Kompatibilität)[cite: 4]
window.toggleChat = function() {
    const chatWindow = document.getElementById('ai-chat-window');[cite: 4]
    const tooltip = document.getElementById('ai-chat-tooltip');[cite: 4]
    
    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {[cite: 4]
        chatWindow.style.display = 'flex';[cite: 4]
        tooltip.style.display = 'none'; // Tooltip ausblenden, wenn Chat öffnet[cite: 4]
    } else {
        chatWindow.style.display = 'none';[cite: 4]
    }
};

window.sendMessage = async function(event) {
    event.preventDefault(); // Verhindert das Neuladen der Seite[cite: 4]
    
    const inputField = document.getElementById('user-input');[cite: 4]
    const userText = inputField.value.trim();[cite: 4]
    
    if (!userText) return;[cite: 4]

    // Nachricht des Nutzers anzeigen[cite: 4]
    appendMessage('user', userText);[cite: 4]
    inputField.value = '';[cite: 4]

    // Lade-Animation anzeigen[cite: 4]
    const loadingId = appendMessage('system', 'Analysiere Mevzuat & Datenbank...'); 

    // --- NEU: MCP Tool-Abfrage im Browser ---
    let liveMevzuatContext = "";
    if (mcpClient) {
        try {
            const toolResponse = await mcpClient.callTool({
                name: "get_legislation_markdown", // Achte darauf, dass das Tool im Worker exakt so heißt!
                arguments: { query: userText }
            });
            
            if (toolResponse && toolResponse.content && toolResponse.content[0]) {
                liveMevzuatContext = toolResponse.content[0].text;
            }
        } catch (mcpError) {
            console.warn("Tool-Aufruf im Browser fehlgeschlagen:", mcpError);
        }
    }

    try {
        // Sichere Anfrage an dein Cloudflare Backend (/api/chat)[cite: 4]
        const response = await fetch('/api/chat', {[cite: 4]
            method: 'POST',[cite: 4]
            headers: {
                'Content-Type': 'application/json'[cite: 4]
            },
            // Wir senden jetzt die Nachricht UND den Kontext an die Edge
            body: JSON.stringify({ 
                message: userText,
                mcpContext: liveMevzuatContext 
            }) 
        });

        if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok.');[cite: 4]

        const data = await response.json();[cite: 4]

        // Lade-Text entfernen und KI-Antwort einfügen[cite: 4]
        removeMessage(loadingId);[cite: 4]
        appendMessage('system', data.reply);[cite: 4]

    } catch (error) {
        console.error('Fehler bei der KI-Abfrage:', error);[cite: 4]
        removeMessage(loadingId);[cite: 4]
        appendMessage('system', 'Entschuldigung, es gab einen Verbindungsfehler zur Edge-Infrastruktur.');[cite: 4]
    }
};

// --- HILFSFUNKTIONEN FÜR DEN CHAT ---[cite: 4]

function appendMessage(sender, text) {[cite: 4]
    const chatBox = document.getElementById('chat-box');[cite: 4]
    const msgDiv = document.createElement('div');[cite: 4]
    const msgId = 'msg-' + Date.now();[cite: 4]
    
    msgDiv.id = msgId;[cite: 4]
    msgDiv.classList.add('chat-msg');[cite: 4]
    msgDiv.classList.add(sender === 'user' ? 'user-msg' : 'system-msg');[cite: 4]
    
    // Formatierung für fette Schrift und Zeilenumbrüche (optional, macht die KI-Antworten lesbarer)
    msgDiv.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    
    chatBox.appendChild(msgDiv);[cite: 4]
    chatBox.scrollTop = chatBox.scrollHeight; // Automatisch nach unten scrollen[cite: 4]
    
    return msgId;[cite: 4]
}

function removeMessage(msgId) {[cite: 4]
    const msgDiv = document.getElementById(msgId);[cite: 4]
    if (msgDiv) msgDiv.remove();[cite: 4]
}


// ==========================================
// 2. SCROLL REVEAL ANIMATION (FX)
// ==========================================

// Startet den Observer sofort beim Laden der Datei (perfekt für Vite HMR)[cite: 4]
const observer = new IntersectionObserver((entries) => {[cite: 4]
    entries.forEach(entry => {[cite: 4]
        if (entry.isIntersecting) {[cite: 4]
            // Blendet das Element ein[cite: 4]
            entry.target.classList.add('visible');[cite: 4]
            
            // Optional: Wenn du möchtest, dass Elemente beim Hochscrollen[cite: 4]
            // wieder unsichtbar werden, lasse die nächste Zeile auskommentiert.[cite: 4]
            // observer.unobserve(entry.target);[cite: 4]
        }
    });
}, {
    threshold: 0.1 // Löst aus, wenn 10% des Elements auf dem Bildschirm sichtbar sind[cite: 4]
});

// Sucht alle unsichtbaren Elemente und übergibt sie dem Observer[cite: 4]
const hiddenElements = document.querySelectorAll('.reveal');[cite: 4]
if (hiddenElements.length > 0) {[cite: 4]
    hiddenElements.forEach((el) => observer.observe(el));[cite: 4]
}
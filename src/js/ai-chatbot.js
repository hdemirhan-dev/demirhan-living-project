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

window.toggleChat = function() {
    const chatWindow = document.getElementById('ai-chat-window');
    const tooltip = document.getElementById('ai-chat-tooltip');
    
    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'flex';
        tooltip.style.display = 'none';
    } else {
        chatWindow.style.display = 'none';
    }
};

window.sendMessage = async function(event) {
    event.preventDefault();
    
    const inputField = document.getElementById('user-input');
    const userText = inputField.value.trim();
    
    if (!userText) return;

    appendMessage('user', userText);
    inputField.value = '';

    const loadingId = appendMessage('system', 'Durchsuche Gesetze, Verordnungen und Rundschreiben...'); 

    // --- NEU: Das mächtige Bedesten-Tool (search_mevzuat) aufrufen ---
    let liveMevzuatContext = "";
    if (mcpClient) {
        try {
            const toolResponse = await mcpClient.callTool({
                name: "search_mevzuat", // Aktiviert die Suche über alle 12 Rechtsformen
                arguments: { query: userText } // HINWEIS: Falls der Worker hier einen Fehler wirft, ändere "query" zu "keyword"
            });
            
            if (toolResponse && toolResponse.content && toolResponse.content[0]) {
                liveMevzuatContext = toolResponse.content[0].text;
            }
        } catch (mcpError) {
            console.warn("Tool-Aufruf im Browser fehlgeschlagen:", mcpError);
        }
    }

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: userText,
                mcpContext: liveMevzuatContext 
            }) 
        });

        if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok.');

        const data = await response.json();

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
    
    msgDiv.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    return msgId;
}

function removeMessage(msgId) {
    const msgDiv = document.getElementById(msgId);
    if (msgDiv) msgDiv.remove();
}

// ==========================================
// 2. SCROLL REVEAL ANIMATION (FX)
// ==========================================

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, {
    threshold: 0.1
});

const hiddenElements = document.querySelectorAll('.reveal');
if (hiddenElements.length > 0) {
    hiddenElements.forEach((el) => observer.observe(el));
}
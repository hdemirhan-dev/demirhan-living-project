import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// --- 1. MCP DATENBANK VERBINDUNG ---
let mcpClient = null;
let availableTools = [];

async function initMcpConnection() {
    try {
        mcpClient = new Client({ name: "demirhan-living-ui", version: "1.0.0" });
        const transport = new SSEClientTransport(new URL("https://demirhan-mevzuat-mcp.hdpasso29.workers.dev/mcp"));
        await mcpClient.connect(transport);
        const toolList = await mcpClient.listTools();
        availableTools = toolList.tools;
        console.log("🛠️ Tools bereit:", availableTools.length);
    } catch (error) { 
        console.error("MCP Init Fehler:", error); 
    }
}
initMcpConnection();


// --- 2. UI LOGIK (Fenster öffnen/schließen) ---
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


// --- 3. CHAT LOGIK (Nachrichten senden & Tools abrufen) ---
async function sendMessage(event) {
    event.preventDefault();
    
    const inputField = document.getElementById('user-input');
    const userText = inputField.value.trim();
    
    if (!userText) return;

    // Härtester Check, ob die Tools wirklich da sind
    if (!mcpClient || availableTools.length === 0) {
        appendMessage('system', "Fehler: Die Rechts-Datenbank konnte nicht verbunden werden (Tools laden nicht). Bitte lade die Seite neu oder prüfe die F12-Konsole auf CORS-Fehler.");
        return;
    }

    appendMessage('user', userText);
    inputField.value = '';
    const loadingId = appendMessage('system', 'Analysiere Rechtslage...');

    try {
        // SCHRITT 1: Router-Entscheidung vom Backend abrufen
        const firstResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText, agentStep: "init", availableTools })
        });
        
        const decision = await firstResponse.json();

        // SCHRITT 2: Tool-Call im Frontend ausführen
        if (decision.status === "tool_call") {
            updateMessageText(loadingId, `Recherchiere mit: ${decision.toolName}...`);
            
            const toolResponse = await mcpClient.callTool({
                name: decision.toolName,
                arguments: decision.arguments
            });
            
            const toolResultData = toolResponse.content?.[0]?.text || "Kein Inhalt zurückgegeben.";
            
            // SCHRITT 3: Synthese vom Agenten abrufen
            const secondResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userText, 
                    agentStep: "tool_result", 
                    toolResult: toolResultData 
                })
            });

            const finalData = await secondResponse.json();
            removeMessage(loadingId);
            appendMessage('system', finalData.reply);
        } else {
            removeMessage(loadingId);
            appendMessage('system', decision.reply || "Keine Antwort vom Agenten.");
        }
    } catch (error) {
        console.error('Detaillierter Fehler:', error);
        removeMessage(loadingId);
        appendMessage('system', 'System-Fehler: ' + error.message);
    }
}


// --- 4. HILFSFUNKTIONEN (Nachrichten ins HTML rendern) ---
function appendMessage(sender, text) {
    const chatBox = document.getElementById('chat-box');
    const msgDiv = document.createElement('div');
    const msgId = 'msg-' + Date.now();
    msgDiv.id = msgId;
    msgDiv.className = 'chat-msg ' + (sender === 'user' ? 'user-msg' : 'system-msg');
    
    // Markdown-Formatierung wie in deinem alten Code
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
        
    msgDiv.innerHTML = formattedText;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msgId;
}

function removeMessage(id) { 
    document.getElementById(id)?.remove(); 
}

function updateMessageText(id, text) { 
    const el = document.getElementById(id); 
    if(el) el.innerHTML = text; 
}
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

let mcpClient = null;
let availableTools = [];

async function initMcpConnection() {
    try {
        mcpClient = new Client({ name: "demirhan-living-ui", version: "1.0.0" });
        const transport = new SSEClientTransport(new URL("https://demirhan-mevzuat-mcp.hdpasso29.workers.dev/mcp"));
        await mcpClient.connect(transport);
        const toolList = await mcpClient.listTools();
        availableTools = toolList.tools;
    } catch (error) { console.error("MCP Init Fehler:", error); }
}
initMcpConnection();

window.sendMessage = async function(event) {
    event.preventDefault();
    const inputField = document.getElementById('user-input');
    const userText = inputField.value.trim();
    if (!userText) return;

    appendMessage('user', userText);
    inputField.value = '';
    const loadingId = appendMessage('system', 'Analysiere Rechtslage...');

    try {
        const firstResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText, agentStep: "init", availableTools })
        });

        const decision = await firstResponse.json();

        if (decision.status === "tool_call") {
            updateMessageText(loadingId, `Recherchiere mit: ${decision.toolName}...`);
            const toolResponse = await mcpClient.callTool({
                name: decision.toolName,
                arguments: decision.arguments
            });
            
            const toolResultData = toolResponse.content?.[0]?.text || "Kein Inhalt.";
            const secondResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText, agentStep: "tool_result", toolName: decision.toolName, toolResult: toolResultData })
            });

            const finalData = await secondResponse.json();
            removeMessage(loadingId);
            appendMessage('system', finalData.reply);
        } else {
            removeMessage(loadingId);
            appendMessage('system', decision.reply);
        }
    } catch (error) {
        console.error('Detaillierter Fehler:', error);
        removeMessage(loadingId);
        appendMessage('system', 'Fehler: Die Antwort konnte nicht verarbeitet werden.');
    }
};
// Get references to DOM elements
const chatHistory = document.getElementById('chat-history');
const apiKeyInput = document.getElementById('api-key-input');
const apiEndpointInput = document.getElementById('api-endpoint-input');
const messageInput = document.getElementById('message-input');
const modelMenu = document.getElementById('model-menu');
const aiThinkingMsg = document.getElementById('ai-thinking');
const systemRoleInput = document.getElementById('system-role-input');

// Initialize variables
let messages = [];
let apiKey = '';
let apiEndpoint = '';
let selectedModel = 'gpt-3.5-turbo';

// Add event listeners
messageInput.addEventListener('input', handleInputChange);
messageInput.addEventListener('keydown', handleKeyDown);
document.getElementById('send-button').addEventListener('click', sendMessage);

// Function to handle input change
function handleInputChange() {
  this.style.height = 'auto';
  this.style.height = `${this.scrollHeight}px`;
}

// Function to handle key down
function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    this.value += '\n';
    this.style.height = `${this.scrollHeight}px`;
  }
}

// Function to send message
async function sendMessage() {
  // Check if API key and endpoint are set
  if (!apiKey || !apiEndpoint) {
    alert('API key and endpoint must be set before sending a message.');
    return;
  }

  // Create and append user message
  const message = messageInput.value.trim();
  createAndAppendMessage(message, 'user');
  messageInput.value = '';
  messageInput.style.height = 'auto';

  // Send request to server
  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        apiKey,
        apiEndpoint,
        selectedModel,
      }),
    });

    // Parse response from server
    const jsonResponse = await response.json();
    console.log(jsonResponse);

    // Create and append bot response
    const botResponse = jsonResponse.choices[0].message.content;
    messages.push({
      role: 'assistant',
      content: botResponse,
    });
    createAndAppendMessage(botResponse, 'bot');
  } catch (error) {
    console.error(error);
  }
}

// Function to create and append message
function createAndAppendMessage(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);

  let displayedText = content;

  if (owner === 'bot') {
    if (displayedText.startsWith('>')) {
      message.style.backgroundColor = '#222';
      message.style.borderColor = '#555';
    }
  }

  const parsedContent = parseResponse(displayedText);
  message.innerHTML = parsedContent;

  chatHistory.appendChild(message);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  MathJax.Hub.Queue(['Typeset', MathJax.Hub, message]);
}

// Function to parse response
function parseResponse(response) {
  let parsedResponse = response;

  parsedResponse = parsedResponse.replace(/\$\$(.*?)\$\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parsedResponse.replace(/\$(.*?)\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parseTables(parsedResponse);

  return parsedResponse;
}

// Function to parse tables
function parseTables(response) {
  const tableRegex = /\n((?:\s*:?[\|:].*?:?\|\n)+)\n/g;
  return response.replace(tableRegex, createTable);
}

// Function to create table
function createTable(match, table) {
  const rows = table.trim().split('\n');
  const tableElement = document.createElement('table');

  const tableHeader = document.createElement('tr');
  const tableHeaderCells = rows[0].split('|').slice(1, -1);
  tableHeaderCells.forEach((cell) => {
    const th = document.createElement('th');
    th.classList.add('table-header');
    th.textContent = cell.trim();
    tableHeader.appendChild(th);
  });
  tableElement.appendChild(tableHeader);

  for (let i = 2; i < rows.length; i++) {
    const row = document.createElement('tr');
    const tableCells = rows[i].split('|').slice(1, -1);
    tableCells.forEach((cell) => {
      const td = document.createElement('td');
      td.classList.add('table-data');
      td.innerHTML = parseResponse(cell.trim());
      row.appendChild(td);
    });
    tableElement.appendChild(row);
  }

  return `<br />${tableElement.outerHTML}<br />`;
}

// Function to copy to clipboard
function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

// Function to clear chat history
function clearChatHistory() {
  chatHistory.innerHTML = '';
  messages = [];
}

// Event listener for copy button click
document.getElementById('copy-button').addEventListener('click', () => {
  const latestResponse = chatHistory.lastElementChild.innerHTML;
  if (latestResponse) {
    copyToClipboard(latestResponse);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
});

// Event listener for clear chat history button click
document.getElementById('clear-button').addEventListener('click', clearChatHistory);

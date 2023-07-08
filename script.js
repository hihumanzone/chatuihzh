// Selecting elements
const chatHistory = document.getElementById('chat-history');
const apiKeyInput = document.getElementById('api-key-input');
const apiEndpointInput = document.getElementById('api-endpoint-input');
const messageInput = document.getElementById('message-input');
const modelMenu = document.getElementById('model-menu');
const aiThinkingMsg = document.getElementById('ai-thinking');
const systemRoleInput = document.getElementById('system-role-input');

// Initializing variables
let messages = [];
let apiKey = "";
let apiEndpoint = "";
let selectedModel = "";

// Retrieve API key, API endpoint, and selected model from local storage if available
apiKeyInput.value = localStorage.getItem('apiKey') || "";
apiEndpointInput.value = localStorage.getItem('apiEndpoint') || "";
selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';

// Update model menu and heading
updateModelMenu();
updateModelHeading();

// Set system role message
systemRoleInput.value = localStorage.getItem('systemRole') || "You are a helpful assistant.";

// Add event listeners
messageInput.addEventListener('input', adjustMessageInputHeight);
messageInput.addEventListener('keydown', handleKeyDownEvent);
document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('copy-button').addEventListener('click', copyLatestResponse);
systemRoleInput.addEventListener('input', updateSystemRoleMessage);
window.addEventListener('load', updateModelHeading);

// Adjust message input height dynamically
function adjustMessageInputHeight() {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${messageInput.scrollHeight}px`;
}

// Handle Enter key event in message input
function handleKeyDownEvent(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    messageInput.value += '\n';
    adjustMessageInputHeight();
  }
}

// Toggle model menu display
function toggleModelMenu() {
  modelMenu.style.display = (modelMenu.style.display === 'none') ? 'block' : 'none';
}

// Update selected model and menu
function selectModel(model) {
  selectedModel = model;
  localStorage.setItem('selectedModel', selectedModel);
  updateModelMenu();
  updateModelHeading();
}

// Update model menu selected option
function updateModelMenu() {
  const modelOptions = modelMenu.querySelectorAll('ul li');
  modelOptions.forEach(option => {
    option.classList.remove('selected');
    if (option.dataset.model === selectedModel) {
      option.classList.add('selected');
    }
  });
}

// Update model heading
function updateModelHeading() {
  const modelHeading = document.querySelector('h1');
  modelHeading.textContent = `Chat with ${selectedModel}`;
}

// Get the number of tokens in a text
function getTokenCount(text) {
  const words = text.trim().split(/\s+/);
  return words.length;
}

// Display message in chat history
function createAndAppendMessage(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);

  let displayedText = content;

  const parsedContent = parseResponse(displayedText);
  message.innerHTML = parsedContent;

  chatHistory.appendChild(message);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  // Render MathJax equations
  MathJax.Hub.Queue(['Typeset', MathJax.Hub, message]);
}

// Parse response to format text content
function parseResponse(response) {
  let parsedResponse = response;

  parsedResponse = parsedResponse.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  parsedResponse = parsedResponse.replace(/\$\$(.*?)\$\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parsedResponse.replace(/\$(.*?)\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parseTables(parsedResponse);

  return parsedResponse;
}

// Parse response to format tables
function parseTables(response) {
  const tableRegex = /\n((?:\s*\|.*\|\n)+)\n/g;
  return response.replace(tableRegex, createTable);
}

// Create HTML table from table string
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

  return tableElement.outerHTML;
}

// Send user message and get bot response
async function sendMessage() {
  apiKey = apiKeyInput.value.trim();
  apiEndpoint = apiEndpointInput.value.trim();
  const message = messageInput.value.trim();

  if (!apiKey || !message) {
    alert('Please enter your API key and a message.');
    return;
  }

  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiEndpoint', apiEndpoint);

  createAndAppendMessage(message, 'user');
  messageInput.value = '';
  messageInput.style.height = 'auto';

  const jsonResponse = await getBotResponse(apiKey, apiEndpoint, message);

  const botResponse = jsonResponse.choices[0].message.content;
  createAndAppendMessage(botResponse, 'bot');
}

// Get bot response from API
async function getBotResponse(apiKey, apiEndpoint, message) {
  const ENDPOINT = apiEndpoint || "https://chimeragpt.adventblocks.cc/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  let maxTokens;
  switch (selectedModel) {
    case 'gpt-3.5-turbo':
      maxTokens = 4096;
      break;
    case 'gpt-4-poe':
      maxTokens = 2100;
      break;
    case 'gpt-3.5-turbo-16k':
      maxTokens = 16384;
      break;
    case 'gpt-3.5-turbo-0613':
      maxTokens = 4096;
      break;
    case 'gpt-4-0613':
    case 'gpt-4':
      maxTokens = 8192;
      break;
    case 'claude+':
    case 'claude-instant':
    case 'claude-instant-100k':
      maxTokens = 10240;
      break;
    default:
      maxTokens = 4096;
  }

  let tokenCount = getTokenCount(messages[0].content);
  for (let i = 1; i < messages.length; i++) {
    const messageTokenCount = getTokenCount(messages[i].content);
    if (tokenCount + messageTokenCount > maxTokens) {
      messages.splice(1, i - 1);
      break;
    }
    tokenCount += messageTokenCount;
  }

  messages.push({
    "role": "user",
    "content": message
  });

  aiThinkingMsg.style.display = 'block';

  const data = {
    "model": selectedModel,
    "messages": messages
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
  });

  aiThinkingMsg.style.display = 'none';

  return response.json();
}

// Copy latest bot response to clipboard
function copyLatestResponse() {
  const latestResponse = chatHistory.lastElementChild.innerHTML;
  if (latestResponse) {
    copyToClipboard(latestResponse);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
}

// Copy text to clipboard
function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

// Update system role message
function updateSystemRoleMessage() {
  localStorage.setItem('systemRole', systemRoleInput.value);
  messages[0].content = systemRoleInput.value;
  }

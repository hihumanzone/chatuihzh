// Cache DOM queries
const chatHistory = document.getElementById('chat-history');
const apiKeyInput = document.getElementById('api-key-input');
const apiEndpointInput = document.getElementById('api-endpoint-input');
const messageInput = document.getElementById('message-input');
const modelMenu = document.getElementById('model-menu');
const aiThinkingMsg = document.getElementById('ai-thinking');
const systemRoleInput = document.getElementById('system-role-input');

// Variables for storing data
let messages = [
  {
    role: 'system',
    content: localStorage.getItem('systemRole') || 'You are a helpful assistant.',
  },
];

const apiKey = localStorage.getItem('apiKey') || '';
const apiEndpoint = localStorage.getItem('apiEndpoint') || '';
const selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';

apiKeyInput.value = apiKey;
apiEndpointInput.value = apiEndpoint;
selectModel(selectedModel);
updateModelHeading();

// Event listener with event delegation
chatHistory.addEventListener('input', (event) => {
  if (event.target.id === 'message-input') {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
  }
});

chatHistory.addEventListener('keydown', (event) => {
  if (event.target.id === 'message-input') {
    if (event.code === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      messageInput.value += '\n';
      messageInput.style.height = `${messageInput.scrollHeight}px`;
    }
  }
});

document.getElementById('send-button').addEventListener('click', (event) => {
  if (event.target.id === 'send-button') {
    sendMessage();
  }
});

// Function for toggling model menu
function toggleModelMenu() {
  modelMenu.style.display = modelMenu.style.display === 'none' ? 'block' : 'none';
}

// Function for selecting a model
function selectModel(model) {
  const modelOptions = document.querySelectorAll('ul li');
  
  modelOptions.forEach((option) => {
    option.classList.remove('selected');
  });

  const selectedModelOption = document.querySelector(`ul li[data-model="${model}"]`);
  if (selectedModelOption) {
    selectedModelOption.classList.add('selected');
  }

  localStorage.setItem('selectedModel', model);

  toggleModelMenu();
  updateModelHeading();
}

// Function for updating the model heading
function updateModelHeading() {
  const modelHeading = document.querySelector('h1');
  modelHeading.textContent = `Chat with ${selectedModel}`;
}

const ENDPOINT = apiEndpoint || 'https://api.openai.com/v1/chat/completions';
const MAX_TOKENS_BY_MODEL = {
  'gpt-3.5-turbo': 4096,
  'gpt-3.5-turbo-0613': 4096,
  'gpt-3.5-turbo-16k': 16384,
  'gpt-3.5-turbo-16k-0613': 16384,
  'gpt-4-0613': 8192,
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-32k-0613': 32768,
  'claude-2-100k': 102400,
  'llama-2-70b-chat': 4096,
};

// Function for getting bot response
async function getBotResponse(apiKey, apiEndpoint, message) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const maxTokens = MAX_TOKENS_BY_MODEL[selectedModel] || 4096;

  let tokenCount = getTokenCount(messages[0].content);
  for (let i = 1; i < messages.length; i++) {
    const messageTokenCount = getTokenCount(messages[i].content);
    if (tokenCount + messageTokenCount > maxTokens) {
      messages.splice(i);
      break;
    }
    tokenCount += messageTokenCount;
  }

  messages.push({
    role: 'user',
    content: message,
  });

  aiThinkingMsg.style.display = 'block';

  const data = {
    model: selectedModel,
    messages: messages,
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  aiThinkingMsg.style.display = 'none';

  return response.json();
}

// Function for counting tokens in a text
function getTokenCount(text) {
  const words = text.trim().split(/\s+/);
  return words.length;
}

// Function for creating and appending a message
async function createAndAppendMessage(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);

  let displayedText = content;

  const parsedContent = parseResponse(displayedText);
  message.innerHTML = parsedContent;

  chatHistory.appendChild(message);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  MathJax.Hub.Queue(['Typeset', MathJax.Hub, message]);
}

// Function for parsing a response
function parseResponse(response) {
  let parsedResponse = response;

  parsedResponse = parsedResponse.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  parsedResponse = parsedResponse.replace(/\$\$(.*?)\$\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parsedResponse.replace(/\$(.*?)\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parseTables(parsedResponse);

  return parsedResponse;
}

// Function for parsing tables in a response
function parseTables(response) {
  const tableRegex = /\n((?:\s*:?[\|:].*\|\n)+)\n/g;
  return response.replace(tableRegex, createTable);
}

// Function for creating a table from a matched string
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

  const fragment = document.createDocumentFragment();
  for (let i = 2; i < rows.length; i++) {
    const row = document.createElement('tr');
    const tableCells = rows[i].split('|').slice(1, -1);
    tableCells.forEach((cell) => {
      const td = document.createElement('td');
      td.classList.add('table-data');
      td.textContent = parseResponse(cell.trim());
      row.appendChild(td);
    });
    fragment.appendChild(row);
  }

  tableElement.appendChild(fragment);
  return tableElement.outerHTML;
}

// Function for sending a message
async function sendMessage() {
  const apiKey = apiKeyInput.value.trim();
  const apiEndpoint = apiEndpointInput.value.trim();
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
  messages.push({
    role: 'assistant',
    content: botResponse,
  });

  createAndAppendMessage(botResponse, 'bot');
}

// Function for copying text to clipboard
function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

document.getElementById('copy-button').addEventListener('click', () => {
  const latestResponse = chatHistory.lastElementChild.textContent;
  if (latestResponse) {
    copyToClipboard(latestResponse);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
});

systemRoleInput.value = localStorage.getItem('systemRole') || 'You are a helpful assistant.';
systemRoleInput.addEventListener('input', () => {
  localStorage.setItem('systemRole', systemRoleInput.value);
  messages[0].content = systemRoleInput.value;
});

window.addEventListener('load', updateModelHeading);

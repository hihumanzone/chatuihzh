// Cache frequently accessed DOM elements
const elements = {
  chatHistory: document.querySelector('#chat-history'),
  apiKeyInput: document.querySelector('#api-key-input'),
  apiEndpointInput: document.querySelector('#api-endpoint-input'),
  messageInput: document.querySelector('#message-input'),
  modelMenu: document.querySelector('#model-menu'),
  aiThinkingMsg: document.querySelector('#ai-thinking'),
  systemRoleInput: document.querySelector('#system-role-input'),
};

let messages = [
  {
    role: 'system',
    content: localStorage.getItem('systemRole') || 'You are a helpful assistant.',
  },
];

const apiKey = localStorage.getItem('apiKey') || '';
const apiEndpoint = localStorage.getItem('apiEndpoint') || '';
const selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';

elements.apiKeyInput.value = apiKey;
elements.apiEndpointInput.value = apiEndpoint;
selectModel(selectedModel);
updateModelHeading();

elements.messageInput.addEventListener('input', () => {
  elements.messageInput.style.height = 'auto';
  elements.messageInput.style.height = `${elements.messageInput.scrollHeight}px`;
});

elements.messageInput.addEventListener('keydown', (event) => {
  if (event.code === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    elements.messageInput.value += '\n';
    elements.messageInput.style.height = `${elements.messageInput.scrollHeight}px`;
  }
});

document.getElementById('send-button').addEventListener('click', sendMessage);

function toggleModelMenu() {
  elements.modelMenu.style.display = elements.modelMenu.style.display === 'none' ? 'block' : 'none';
}

function selectModel(model) {
  const modelOptions = document.querySelectorAll('ul li');
  modelOptions.forEach((option) => option.classList.remove('selected'));

  const selectedModelOption = document.querySelector(`ul li[data-model="${model}"]`);
  if (selectedModelOption) {
    selectedModelOption.classList.add('selected');
  }

  localStorage.setItem('selectedModel', model);

  toggleModelMenu();
  updateModelHeading();
}

function updateModelHeading() {
  const modelHeading = document.querySelector('h1');
  modelHeading.textContent = `Chat with ${selectedModel}`;
}

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

  elements.aiThinkingMsg.style.display = 'block';

  const data = {
    model: selectedModel,
    messages: messages,
  };

  const response = await fetch(apiEndpoint || 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  elements.aiThinkingMsg.style.display = 'none';

  return response.json();
}

function getTokenCount(text) {
  return text.trim().split(/\s+/).length;
}

async function createAndAppendMessage(content, owner) {
  const fragment = document.createDocumentFragment();
  const message = document.createElement('div');
  message.classList.add('message', owner);

  let displayedText = content;

  const parsedContent = parseResponse(displayedText);
  message.innerHTML = parsedContent;

  if (message.textContent) {
    fragment.appendChild(message);
  }
  elements.chatHistory.appendChild(fragment);
  elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;

  MathJax.Hub.Queue(['Typeset', MathJax.Hub, message]);
}

function parseResponse(response) {
  let parsedResponse = response;

  parsedResponse = parsedResponse.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  parsedResponse = parsedResponse.replace(/\$\$(.*?)\$\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parsedResponse.replace(/\$(.*?)\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parseTables(parsedResponse);

  return parsedResponse;
}

function parseTables(response) {
  const tableRegex = /\n((?:\s*:?[\|:].*\|\n)+)\n/g;
  return response.replace(tableRegex, createTable);
}

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
      td.textContent = parseResponse(cell.trim());
      row.appendChild(td);
    });
    tableElement.appendChild(row);
  }

  return tableElement.outerHTML;
}

async function sendMessage() {
  const apiKey = elements.apiKeyInput.value.trim();
  const apiEndpoint = elements.apiEndpointInput.value.trim();
  const message = elements.messageInput.value.trim();

  if (!apiKey || !message) {
    alert('Please enter your API key and a message.');
    return;
  }

  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiEndpoint', apiEndpoint);

  createAndAppendMessage(message, 'user');
  elements.messageInput.value = '';
  elements.messageInput.style.height = 'auto';

  const jsonResponse = await getBotResponse(apiKey, apiEndpoint, message);

  const botResponse = jsonResponse.choices[0].message.content;
  messages.push({
    role: 'assistant',
    content: botResponse,
  });

  createAndAppendMessage(botResponse, 'bot');
}

function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

document.getElementById('copy-button').addEventListener('click', () => {
  const latestResponse = elements.chatHistory.lastElementChild.textContent;
  if (latestResponse) {
    copyToClipboard(latestResponse);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
});

elements.systemRoleInput.value = localStorage.getItem('systemRole') || 'You are a helpful assistant.';
elements.systemRoleInput.addEventListener('input', () => {
  localStorage.setItem('systemRole', elements.systemRoleInput.value);
  messages[0].content = elements.systemRoleInput.value;
});

window.addEventListener('load', updateModelHeading);

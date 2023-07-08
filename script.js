const {
  chatHistory,
  apiKeyInput,
  apiEndpointInput,
  messageInput,
  modelMenu,
  aiThinkingMsg,
  systemRoleInput
} = document;

const modelOptions = Array.from(document.querySelectorAll('ul li'));
const modelHeading = document.querySelector('h1');
const sendButton = document.getElementById('send-button');
const copyButton = document.getElementById('copy-button');

let messages = [
  {
    role: 'system',
    content: localStorage.getItem('systemRole') || 'You are a helpful assistant.',
  },
];

let apiKey = localStorage.getItem('apiKey') || '';
let apiEndpoint = localStorage.getItem('apiEndpoint') || '';
let selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';

if (apiKey !== '') {
  apiKeyInput.value = apiKey;
}

if (apiEndpoint !== '') {
  apiEndpointInput.value = apiEndpoint;
}

selectModel(selectedModel);
updateModelHeading();

messageInput.addEventListener('input', (event) => {
  if (event.target.id === 'message-input') {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
  }
});

messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    messageInput.value += '\n';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
  }
});

document.addEventListener('click', (event) => {
  if (!modelMenu.contains(event.target)) {
    modelMenu.style.display = 'none';
  }
});

modelMenu.addEventListener('click', (event) => {
  if (event.target.tagName === 'LI') {
    selectModel(event.target.dataset.model);
  }
});

sendButton.addEventListener('click', sendMessage);

function toggleModelMenu() {
  modelMenu.style.display = modelMenu.style.display === 'none' ? 'block' : 'none';
}

function selectModel(model) {
  modelOptions.forEach((option) => option.classList.remove('selected'));

  const selectedModelOption = modelOptions.find((option) => option.dataset.model === model);
  if (selectedModelOption) {
    selectedModelOption.classList.add('selected');
  }

  selectedModel = model;
  localStorage.setItem('selectedModel', selectedModel);

  toggleModelMenu();
  updateModelHeading();
}

function updateModelHeading() {
  modelHeading.textContent = `Chat with ${selectedModel}`;
}

async function getBotResponse(apiKey, apiEndpoint, message) {
  const ENDPOINT = apiEndpoint || 'https://chimeragpt.adventblocks.cc/v1/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const maxTokens = {
    'gpt-3.5-turbo': 4096,
    'gpt-4-poe': 2100,
    'gpt-3.5-turbo-16k': 16384,
    'gpt-3.5-turbo-0613': 4096,
    'gpt-4-0613': 8192,
    'gpt-4': 8192,
    'claude+': 10240,
    'claude-instant': 10240,
    'claude-instant-100k': 10240
  };

  let tokenCount = getTokenCount(messages[0].content);
  for (let i = 1; i < messages.length; i++) {
    const messageTokenCount = getTokenCount(messages[i].content);
    if (tokenCount + messageTokenCount > maxTokens[selectedModel]) {
      messages.shift();
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

function getTokenCount(text) {
  return text.trim().split(/\s+/).length;
}

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

function parseResponse(response) {
  let parsedResponse = response;

  parsedResponse = parsedResponse.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  parsedResponse = parsedResponse.replace(/\$\$(.*?)\$\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parsedResponse.replace(/\$(.*?)\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parseTables(parsedResponse);

  return parsedResponse;
}

function parseTables(response) {
  const tableRegex = /\n((?:\s*\|.*\|\n)+)\n/g;
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
      td.innerHTML = parseResponse(cell.trim());
      row.appendChild(td);
    });
    tableElement.appendChild(row);
  }

  return tableElement.outerHTML;
}

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

  chatHistory.insertAdjacentHTML('beforeend', `<div class="message user">${message}</div>`);
  chatHistory.scrollTop = chatHistory.scrollHeight;

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

function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

copyButton.addEventListener('click', () => {
  const latestResponse = chatHistory.lastElementChild.innerHTML;
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

window.addEventListener('load', () => {
  updateModelHeading();
});
    

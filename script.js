const chatHistory = document.getElementById('chat-history');
const apiKeyInput = document.getElementById('api-key-input');
const apiEndpointInput = document.getElementById('api-endpoint-input');
const messageInput = document.getElementById('message-input');
const modelMenu = document.getElementById('model-menu');
const aiThinkingMsg = document.getElementById('ai-thinking');
const systemRoleInput = document.getElementById('system-role-input');

let selectedModel = 'gpt-3.5-turbo';
let messages = [{
  role: 'system',
  content: localStorage.getItem('systemRole') || 'You are a helpful assistant.',
}];

apiKeyInput.value = localStorage.getItem('apiKey') || '';
apiEndpointInput.value = localStorage.getItem('apiEndpoint') || '';
selectModel(localStorage.getItem('selectedModel') || selectedModel);
modelMenu.addEventListener('click', toggleModelMenu);
messageInput.addEventListener('input', resizeMessageInput);
messageInput.addEventListener('keydown', handleEnterKey);
document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('copy-button').addEventListener('click', copyToClipboard);

systemRoleInput.value = localStorage.getItem('systemRole') || 'You are a helpful assistant.';
systemRoleInput.addEventListener('input', updateSystemRole);
window.addEventListener('load', updateModelHeading);

async function getBotResponse(apiKey, apiEndpoint, message) {
  const ENDPOINT = apiEndpoint || 'https://chimeragpt.adventblocks.cc/v1/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const maxTokens = getMaxTokens();

  let tokenCount = getTokenCount(messages[0].content);
  for (let i = 1; i < messages.length; i++) {
    const messageTokenCount = getTokenCount(messages[i].content);
    if (tokenCount + messageTokenCount > maxTokens) {
      messages = messages.slice(0, i);
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

function getMaxTokens() {
  const models = {
    'gpt-3.5-turbo': 4096,
    'gpt-4-poe': 2100,
    'gpt-3.5-turbo-16k': 16384,
    'gpt-3.5-turbo-0613': 4096,
    'gpt-4-0613': 8192,
    'gpt-4': 8192,
    'claude+': 10240,
    'claude-instant': 10240,
    'claude-instant-100k': 10240,
  };

  return models[selectedModel] || models['gpt-3.5-turbo'];
}

function getTokenCount(text) {
  const words = text.trim().split(/\s+/);
  return words.length;
}

function createAndAppendMessage(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);
  message.innerHTML = parseResponse(content);
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

function copyToClipboard() {
  const latestResponse = chatHistory.lastElementChild.innerHTML;
  if (latestResponse) {
    navigator.clipboard.writeText(latestResponse)
      .then(() => {
        alert('Text copied to clipboard');
      })
      .catch((error) => {
        console.error('Copy failed:', error);
      });
  } else {
    alert('No text to copy');
  }
}

function resizeMessageInput() {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${messageInput.scrollHeight}px`;
}

function handleEnterKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    messageInput.value += '\n';
    resizeMessageInput();
  }
}

function toggleModelMenu() {
  modelMenu.hidden = !modelMenu.hidden;
}

function selectModel(model) {
  const modelOptions = document.querySelectorAll('ul li');
  modelOptions.forEach((option) => option.classList.remove('selected'));

  const selectedModelOption = document.querySelector(`ul li[data-model="${model}"]`);
  if (selectedModelOption) {
    selectedModelOption.classList.add('selected');
  }

  selectedModel = model;
  localStorage.setItem('selectedModel', selectedModel);

  toggleModelMenu();
  updateModelHeading();
}

function updateModelHeading() {
  const modelHeading = document.querySelector('h1');
  modelHeading.textContent = `Chat with ${selectedModel}`;
}

function updateSystemRole() {
  localStorage.setItem('systemRole', systemRoleInput.value);
  messages[0].content = systemRoleInput.value;
}

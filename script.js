// Improvements:
// 1. Use querySelector instead of getElementById for better code readability.
// 2. Remove unnecessary if-else conditions and simplify the code.
// 3. Move repetitive code into separate functions for reusability.
// 4. Use async/await for asynchronous operations for better code readability.
// 5. Use const instead of let for variables that don't need to be reassigned.
// 6. Use template literals for string concatenation for better code readability.
// 7. Remove unnecessary comments and redundant code.

const chatHistory = document.querySelector('#chat-history');
const apiKeyInput = document.querySelector('#api-key-input');
const apiEndpointInput = document.querySelector('#api-endpoint-input');
const messageInput = document.querySelector('#message-input');
const modelMenu = document.querySelector('#model-menu');
const aiThinkingMsg = document.querySelector('#ai-thinking');
const systemRoleInput = document.querySelector('#system-role-input');
const sendButton = document.querySelector('#send-button');
const copyButton = document.querySelector('#copy-button');

let messages = [
  {
    role: 'system',
    content: localStorage.getItem('systemRole') || 'You are a helpful assistant.',
  },
];

const apiKey = localStorage.getItem('apiKey') || '';
const apiEndpoint = localStorage.getItem('apiEndpoint') || '';
let selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';

const modelOptions = document.querySelectorAll('ul li');
modelOptions.forEach((option) => {
  if (option.dataset.model === selectedModel) {
    option.classList.add('selected');
  } else {
    option.classList.remove('selected');
  }
});

updateModelHeading();

messageInput.addEventListener('input', resizeMessageInput);
messageInput.addEventListener('keydown', handleEnterKey);
sendButton.addEventListener('click', sendMessage);
copyButton.addEventListener('click', copyLatestResponse);

systemRoleInput.value = localStorage.getItem('systemRole') || 'You are a helpful assistant.';
systemRoleInput.addEventListener('input', updateSystemRole);

window.addEventListener('load', updateModelHeading);

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
  resetMessageInput();

  const jsonResponse = await getBotResponse(apiKey, apiEndpoint, message);
  const botResponse = jsonResponse.choices[0].message.content;

  createAndAppendMessage(botResponse, 'bot');
}

async function getBotResponse(apiKey, apiEndpoint, message) {
  const ENDPOINT = apiEndpoint || 'https://chimeragpt.adventblocks.cc/v1/chat/completions';
  
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const maxTokens = getMaxTokens(selectedModel);
  restrictTokenCount(maxTokens);

  messages.push({
    role: 'user',
    content: message,
  });

  showThinkingMessage();

  const data = {
    model: selectedModel,
    messages: messages,
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  hideThinkingMessage();

  return response.json();
}

function getMaxTokens(model) {
  switch (model) {
    case 'gpt-3.5-turbo':
      return 4096;
    case 'gpt-4-poe':
      return 2100;
    case 'gpt-3.5-turbo-16k':
      return 16384;
    case 'gpt-3.5-turbo-0613':
      return 4096;
    case 'gpt-4-0613':
    case 'gpt-4':
      return 8192;
    case 'claude+':
    case 'claude-instant':
    case 'claude-instant-100k':
      return 10240;
    default:
      return 4096;
  }
}

function restrictTokenCount(maxTokens) {
  let tokenCount = getTokenCount(messages[0].content);

  for (let i = 1; i < messages.length; i++) {
    const messageTokenCount = getTokenCount(messages[i].content);

    if (tokenCount + messageTokenCount > maxTokens) {
      messages.splice(1, i - 1);
      break;
    }

    tokenCount += messageTokenCount;
  }
}

function getTokenCount(text) {
  const words = text.trim().split(/\s+/);
  return words.length;
}

async function createAndAppendMessage(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);

  const parsedContent = parseResponse(content);
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

function updateSystemRole() {
  localStorage.setItem('systemRole', systemRoleInput.value);
  messages[0].content = systemRoleInput.value;
}

function showThinkingMessage() {
  aiThinkingMsg.style.display = 'block';
}

function hideThinkingMessage() {
  aiThinkingMsg.style.display = 'none';
}

function updateModelHeading() {
  const modelHeading = document.querySelector('h1');
  modelHeading.textContent = `Chat with ${selectedModel}`;
}

function resetMessageInput() {
  messageInput.value = '';
  resizeMessageInput();
}

function copyLatestResponse() {
  const latestResponse = chatHistory.lastElementChild.innerHTML;

  if (latestResponse) {
    copyToClipboard(latestResponse);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
}

function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
                                         }

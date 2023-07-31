const chatContainer = document.getElementById('chat-container');
const chatHistory = document.getElementById('chat-history');
const modelMenu = document.getElementById('model-menu');
const selectedModelElement = document.getElementById('selected-model');
const settingsButton = document.getElementById('settings-button');
const apiKeyInput = document.getElementById('api-key-input');
const systemRoleInput = document.getElementById('system-role-input');
const messageInput = document.getElementById('message-input');

let messages = [
  {
    role: 'system',
    content: localStorage.getItem('systemRole') || 'You are a helpful assistant.',
  },
];

let apiKey = localStorage.getItem('apiKey') || '';
let selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';

apiKeyInput.value = apiKey;
selectModel(selectedModel);

messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${messageInput.scrollHeight}px`;
});

messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    messageInput.value += '\n';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
  }
});

settingsButton.addEventListener('click', toggleModelMenu);

function toggleModelMenu() {
  modelMenu.classList.toggle('hidden');
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

  updateModelHeading();
  toggleModelMenu();
}

function updateModelHeading() {
  selectedModelElement.textContent = selectedModel;
}

async function getBotResponse(apiKey, message) {
  const maxTokens = getModelMaxTokens(selectedModel) || 4096;
  const tokenCount = calculateTokenCount(messages, maxTokens);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const data = {
    model: selectedModel,
    messages: messages,
  };

  aiThinkingMsg.classList.remove('hidden');

  const response = await fetch('/api/completions', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  aiThinkingMsg.classList.add('hidden');

  return response.json();
}

function calculateTokenCount(messages, maxTokens) {
  let tokenCount = getTokenCount(messages[0].content);
  for (let i = 1; i < messages.length; i++) {
    const messageTokenCount = getTokenCount(messages[i].content);
    if (tokenCount + messageTokenCount > maxTokens) {
      messages.splice(i);
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

  let displayedText = content;

  // Extract code blocks
  if (owner === 'bot') {
    displayedText = extractCodeBlocks(displayedText);
  }

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
      td.innerHTML = parseResponse(cell.trim());
      row.appendChild(td);
    });
    tableElement.appendChild(row);
  }

  return tableElement.outerHTML;
}

async function sendMessage() {
  apiKey = apiKeyInput.value.trim();
  const message = messageInput.value.trim();

  if (!apiKey || !message) {
    alert('Please enter your API key and a message.');
    return;
  }

  localStorage.setItem('apiKey', apiKey);

  createAndAppendMessage(message, 'user');
  messageInput.value = '';
  messageInput.style.height = 'auto';

  const jsonResponse = await getBotResponse(apiKey, message);

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

settingsButton.addEventListener('load', updateModelHeading);

function getModelMaxTokens(model) {
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

  return MAX_TOKENS_BY_MODEL[model];
}

function extractCodeBlocks(response) {
  const codeBlockRegex = /```(.*?)```/gs;
  const codeBlocks = response.match(codeBlockRegex);

  if (codeBlocks) {
    codeBlocks.forEach((codeBlock) => {
      response = response.replace(codeBlock, createCodeBlockUI(codeBlock));
    });
  }

  return response;
}

function createCodeBlockUI(codeBlock) {
  const preElement = document.createElement('pre');
  preElement.textContent = codeBlock.replace(/```/g, '');

  const codeBlockElement = document.createElement('div');
  codeBlockElement.classList.add('code-block');
  codeBlockElement.appendChild(preElement);

  const copyCodeButton = document.createElement('button');
  copyCodeButton.classList.add('copy-code-button');
  copyCodeButton.textContent = 'Copy The Code';
  codeBlockElement.appendChild(copyCodeButton);

  return codeBlockElement.outerHTML;
}

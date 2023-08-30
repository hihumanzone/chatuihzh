const STRING_CONSTANTS = {
  model: 'gpt-3.5-turbo',
  modelMenu: 'none',
  block: 'block',
  messageUser: 'user',
  messageRole: 'assistant',
  messageSystem: 'system',
  localStorageApiKey: 'apiKey',
  localStorageApiEndpoint: 'apiEndpoint',
  localStorageSelectedModel: 'selectedModel',
  localStorageSystemRole: 'systemRole',
  endpoint: 'https://free.churchless.tech/v1/chat/completions',
  chatMessageDisplayStyle: 'block',
  input: 'input',
}

let messages = [
  {
    role: STRING_CONSTANTS.messageSystem,
    content: localStorage.getItem(STRING_CONSTANTS.localStorageSystemRole) || '',
  },
];

const getElementById = (id) => document.getElementById(id);
const getElement = (query) => document.querySelector(query);
const getElements = (query) => document.querySelectorAll(query);

const chatHistory = getElementById('chat-history');
const systemRoleInput = getElementById('system-role-input');
const apiKeyInput = getElementById('api-key-input');
const apiEndpointInput = getElementById('api-endpoint-input');
const messageInput = getElementById('message-input');
const modelMenu = getElementById('model-menu');
const aiThinkingMsg = getElementById('ai-thinking');

let apiKey = retrieveLocalStorageItem(STRING_CONSTANTS.localStorageApiKey);
let apiEndpoint = retrieveLocalStorageItem(STRING_CONSTANTS.localStorageApiEndpoint);
let selectedModel = retrieveLocalStorageItem(STRING_CONSTANTS.localStorageSelectedModel) || STRING_CONSTANTS.model;

applyValueToElement(apiKeyInput, apiKey);
applyValueToElement(apiEndpointInput, apiEndpoint);

systemRoleInput.value = retrieveLocalStorageItem(STRING_CONSTANTS.localStorageSystemRole) || '';
modelMenu.style.display = STRING_CONSTANTS.modelMenu;
window.addEventListener('load', selectModel);
window.addEventListener('load', updateModelHeading);

messageInput.addEventListener(STRING_CONSTANTS.input, resizeMessageInput);
messageInput.addEventListener('keydown', appendContentToMessageInput);

getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);
getElementById('send-button').addEventListener('click', sendMessage);
getElementById('copy-button').addEventListener('click', copyLastMessage);

function retrieveLocalStorageItem(item) {
  return localStorage.getItem(item) || '';
}

function applyValueToElement(element, value) {
  element.value = value;
}

function resizeMessageInput() {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${messageInput.scrollHeight}px`;
}

function appendContentToMessageInput(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    messageInput.value += '\n';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
  }
}

function toggleModelMenu() {
  modelMenu.style.display = modelMenu.style.display === STRING_CONSTANTS.modelMenu ? STRING_CONSTANTS.block : STRING_CONSTANTS.modelMenu;
}

function selectModel(model) {
  const modelOptions = getElements('ul li');
  modelOptions.forEach((option) => option.classList.remove('selected'));

  const selectedModelOption = getElement(`ul li[data-model="${model}"]`);
  if (selectedModelOption) {
    selectedModelOption.classList.add('selected');
  }

  selectedModel = model;
  localStorage.setItem(STRING_CONSTANTS.localStorageSelectedModel, selectedModel);

  toggleModelMenu();
  updateModelHeading();
}

function updateModelHeading() {
  const modelHeading = getElement('h1');
  modelHeading.textContent = `Chat with ${selectedModel}`;
}

const ENDPOINT = apiEndpoint || STRING_CONSTANTS.endpoint;

async function getBotResponse(apiKey, apiEndpoint, message) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  messages.push({
    role: STRING_CONSTANTS.messageUser,
    content: message,
  });

  aiThinkingMsg.style.display = STRING_CONSTANTS.block;

  const data = {
    model: selectedModel,
    messages: messages,
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  aiThinkingMsg.style.display = STRING_CONSTANTS.modelMenu;

  return response.json();
}

async function createAndAppendMessage(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);

  let displayedText = content;
  
  if (owner === STRING_CONSTANTS.messageRole) {
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

function parseResponse(response) {
  let parsedResponse = response;

  parsedResponse = parsedResponse.replace(/\$\$(.*?)\$\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parsedResponse.replace(/\$(.*?)\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parseTables(parsedResponse);

  return parsedResponse;
}

function parseTables(response) {
  const tableRegex = /\n((?:\s*:?[\|:].*?:?\|\n)+)\n/g;
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

  return `\n${tableElement.outerHTML}\n`;
}

async function sendMessage() {
  apiKey = apiKeyInput.value.trim();
  apiEndpoint = apiEndpointInput.value.trim();
  const message = messageInput.value.trim();

  if (!message) {
    alert('Please enter a message.');
    return;
  }

  localStorage.setItem(STRING_CONSTANTS.localStorageApiKey, apiKey);
  localStorage.setItem(STRING_CONSTANTS.localStorageApiEndpoint, apiEndpoint);

  createAndAppendMessage(message, STRING_CONSTANTS.messageUser);
  messageInput.value = '';
  messageInput.style.height = 'auto';

  const jsonResponse = await getBotResponse(apiKey, apiEndpoint, message);

  const botResponse = jsonResponse.choices[0].message.content;
  messages.push({
    role: STRING_CONSTANTS.messageRole,
    content: botResponse,
  });

  createAndAppendMessage(botResponse, STRING_CONSTANTS.messageRole);
}

function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function clearChatHistory() {
  chatHistory.innerHTML = '';
  messages = [
    {
      role: STRING_CONSTANTS.messageSystem,
      content: localStorage.getItem(STRING_CONSTANTS.localStorageSystemRole) || '',
    },
  ];
}

function copyLastMessage() {
  const latestResponse = chatHistory.lastElementChild.innerHTML;
  if (latestResponse) {
    copyToClipboard(latestResponse);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
}

systemRoleInput.addEventListener(STRING_CONSTANTS.input, () => {
  localStorage.setItem(STRING_CONSTANTS.localStorageSystemRole, systemRoleInput.value);
  messages[0].content = systemRoleInput.value;
});

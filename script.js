// Cache frequently used DOM elements
const elements = {
  chatHistory: document.getElementById('chat-history'),
  apiKeyInput: document.getElementById('api-key-input'),
  apiEndpointInput: document.getElementById('api-endpoint-input'),
  messageInput: document.getElementById('message-input'),
  modelMenu: document.getElementById('model-menu'),
  aiThinkingMsg: document.getElementById('ai-thinking'),
  systemRoleInput: document.getElementById('system-role-input'),
  sendButton: document.getElementById('send-button'),
  copyButton: document.getElementById('copy-button'),
};

// Constants
const codeBlockRegex = /```(.*?)```/gs;
const ENDPOINT = localStorage.getItem('apiEndpoint') || 'https://api.openai.com/v1/chat/completions';

// Variables
let messages = getMessageFromLocalStorage();

// Set initial values
elements.apiKeyInput.value = localStorage.getItem('apiKey') || '';
elements.apiEndpointInput.value = localStorage.getItem('apiEndpoint') || '';
selectModel(localStorage.getItem('selectedModel') || 'gpt-3.5-turbo');
updateModelHeading();

// Attach event listeners
elements.messageInput.addEventListener('input', adjustMessageInputSize);
elements.messageInput.addEventListener('keydown', handleEnterKey);
elements.sendButton.addEventListener('click', sendMessage);
elements.copyButton.addEventListener('click', copyLatestResponse);
elements.systemRoleInput.addEventListener('input', updateSystemRole);

// Function to get message from local storage
function getMessageFromLocalStorage() {
  return [
    {
      role: 'system',
      content: localStorage.getItem('systemRole') || 'You are a helpful assistant.',
    },
  ];
}

// Function to toggle model menu
function toggleModelMenu() {
  elements.modelMenu.style.display = elements.modelMenu.style.display === 'none' ? 'block' : 'none';
}

// Function to select the model
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

// Function to update the model heading
function updateModelHeading() {
  const modelHeading = document.querySelector('h1');
  modelHeading.textContent = `Chat with ${localStorage.getItem('selectedModel')}`;
}

// Function to get the token count of a text
function getTokenCount(text) {
  const words = text.trim().split(/\s+/);
  return words.length;
}

// Function to get the maximum token count for a model
function getMaxTokens() {
  return MAX_TOKENS_BY_MODEL[localStorage.getItem('selectedModel')] || 4096;
}

// Function to limit the messages based on maximum tokens
function limitMessagesByTokens() {
  const maxTokens = getMaxTokens();
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

// Function to get the bot response
async function getBotResponse(apiKey, apiEndpoint, message) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  limitMessagesByTokens();

  messages.push({
    role: 'user',
    content: message,
  });

  elements.aiThinkingMsg.style.display = 'block';

  const data = {
    model: localStorage.getItem('selectedModel'),
    messages: messages,
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  elements.aiThinkingMsg.style.display = 'none';

  return response.json();
}

// Function to extract and format code blocks from the bot response
function extractCodeBlocks(response) {
  const codeBlocks = response.match(codeBlockRegex);

  if (codeBlocks) {
    codeBlocks.forEach((codeBlock) => {
      response = response.replace(codeBlock, createCodeBlockUI(codeBlock));
    });
  }

  return response;
}

// Function to create the HTML for a code block
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

// Function to create and append a message to the chat history
async function createAndAppendMessage(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);

  let displayedText = content;

  if (owner === 'bot') {
    displayedText = extractCodeBlocks(displayedText);
  }

  const parsedContent = parseResponse(displayedText);
  message.innerHTML = parsedContent;

  elements.chatHistory.appendChild(message);
  elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;

  MathJax.Hub.Queue(['Typeset', MathJax.Hub, message]);
}

// Function to parse the bot response and format it
function parseResponse(response) {
  let parsedResponse = response;

  parsedResponse = parsedResponse.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  parsedResponse = parsedResponse.replace(/\$\$(.*?)\$\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parsedResponse.replace(/\$(.*?)\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parseTables(parsedResponse);

  return parsedResponse;
}

// Function to parse and format tables in the response
function parseTables(response) {
  const tableRegex = /\n((?:\s*:?[\|:].*\|\n)+)\n/g;
  return response.replace(tableRegex, createTable);
}

// Function to create the HTML for a table
function createTable(_, table) {
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

// Function to send a user message and get a bot response
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
  adjustMessageInputSize();

  const jsonResponse = await getBotResponse(apiKey, apiEndpoint, message);

  const botResponse = jsonResponse.choices[0].message.content;
  messages.push({
    role: 'assistant',
    content: botResponse,
  });

  createAndAppendMessage(botResponse, 'bot');
}

// Function to copy the latest bot response to the clipboard
function copyLatestResponse() {
  const latestResponse = elements.chatHistory.lastElementChild.innerHTML;
  if (latestResponse) {
    copyToClipboard(latestResponse);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
}

// Function to copy text to clipboard
function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

// Function to update the system role
function updateSystemRole() {
  localStorage.setItem('systemRole', elements.systemRoleInput.value);
  messages[0].content = elements.systemRoleInput.value;
}

// Function to adjust the size of the message input box
function adjustMessageInputSize() {
  elements.messageInput.style.height = 'auto';
  elements.messageInput.style.height = `${elements.messageInput.scrollHeight}px`;
}

// Function to handle the Enter key in the message input box
function handleEnterKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    elements.messageInput.value += '\n';
    adjustMessageInputSize();
  }
}

// Invoke the updateModelHeading function when the window loads
window.addEventListener('load', updateModelHeading);

// Constants for maximum tokens by model
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

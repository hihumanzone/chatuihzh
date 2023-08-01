// Cache frequently accessed DOM elements
const chatHistory = document.getElementById('chat-history');
const apiKeyInput = document.getElementById('api-key-input');
const apiEndpointInput = document.getElementById('api-endpoint-input');
const messageInput = document.getElementById('message-input');
const modelMenu = document.getElementById('model-menu');
const aiThinkingMsg = document.getElementById('ai-thinking');
const systemRoleInput = document.getElementById('system-role-input');

// Cache regex and constants
const codeBlockRegex = /```(.*?)```/gs;
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

// Initialize variables
let messages = [
  {
    role: 'system',
    content: localStorage.getItem('systemRole') || 'You are a helpful assistant.',
  },
];
let apiKey = localStorage.getItem('apiKey') || '';
let apiEndpoint = localStorage.getItem('apiEndpoint') || '';
let selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';

// Set initial values for input elements
apiKeyInput.value = apiKey;
apiEndpointInput.value = apiEndpoint;
selectModel(selectedModel);
updateModelHeading();

// Set event listeners
messageInput.addEventListener('input', adjustMessageInputHeight);
messageInput.addEventListener('keydown', handleEnterKey);
document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('copy-button').addEventListener('click', copyLatestResponse);
systemRoleInput.addEventListener('input', updateSystemRole);

// Function to adjust the height of the message input box
function adjustMessageInputHeight() {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${messageInput.scrollHeight}px`;
}

// Function to handle the Enter key in the message input box
function handleEnterKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    messageInput.value += '\n';
    adjustMessageInputHeight();
  }
}

// Function to toggle the model menu
function toggleModelMenu() {
  modelMenu.style.display = (modelMenu.style.display === 'none') ? 'block' : 'none';
}

// Function to select a model
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

// Function to update the model heading
function updateModelHeading() {
  const modelHeading = document.querySelector('h1');
  modelHeading.textContent = `Chat with ${selectedModel}`;
}

// API endpoint
const ENDPOINT = apiEndpoint || 'https://api.openai.com/v1/chat/completions';

// Function to count the number of tokens in a text
function getTokenCount(text) {
  const words = text.trim().split(/\s+/);
  return words.length;
}

// Function to get the bot's response
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

// Function to extract and format code blocks from the bot's response
function extractCodeBlocks(response) {
  const codeBlocks = response.match(codeBlockRegex);
  if (codeBlocks) {
    codeBlocks.forEach((codeBlock) => {
      response = response.replace(codeBlock, createCodeBlockUI(codeBlock));
    });
  }
  return response;
}

// Function to create the UI for a code block
function createCodeBlockUI(codeBlock) {
  const preElement = document.createElement('pre');
  preElement.textContent = codeBlock.replace(/```/g, '');

  const codeBlockElement = document.createElement('div');
  codeBlockElement.classList.add('code-block');
  codeBlockElement.appendChild(preElement);

  const copyCodeButton = document.createElement('button');
  copyCodeButton.classList.add('copy-code-button');
  copyCodeButton.textContent = 'Copy The Code';
  copyCodeButton.addEventListener('click', () => {
    copyToClipboard(codeBlock.replace(/```/g, ''));
  });
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

  chatHistory.appendChild(message);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  MathJax.Hub.Queue(['Typeset', MathJax.Hub, message]);
}

// Function to parse and format the bot's response
function parseResponse(response) {
  let parsedResponse = response;

  parsedResponse = parsedResponse.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  parsedResponse = parsedResponse.replace(/\$\$(.*?)\$\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parsedResponse.replace(/\$(.*?)\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parseTables(parsedResponse);

  return parsedResponse;
}

// Function to parse and format tables in the bot's response
function parseTables(response) {
  const tableRegex = /\n((?:\s*:?[\|:].*\|\n)+)\n/g;
  return response.replace(tableRegex, createTable);
}

// Function to create a table from a match
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

// Function to handle sending a user message
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
  messages.push({
    role: 'assistant',
    content: botResponse,
  });

  createAndAppendMessage(botResponse, 'bot');
}

// Function to copy the latest response to the clipboard
function copyLatestResponse() {
  const latestResponse = chatHistory.lastElementChild.innerHTML;
  if (latestResponse) {
    copyToClipboard(latestResponse);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
}

// Function to copy text to the clipboard
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
  localStorage.setItem('systemRole', systemRoleInput.value);
  messages[0].content = systemRoleInput.value;
}

// Update the model heading on page load
window.addEventListener('load', updateModelHeading);

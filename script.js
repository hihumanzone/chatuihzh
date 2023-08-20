const getElementById = (id) => document.getElementById(id);

const [
  chatHistory, apiKeyInput, apiEndpointInput,
  messageInput, modelMenu, aiThinkingMsg,
  systemRoleInput, sendButton, copyButton,
  refreshButton
] = [
  'chat-history', 'api-key-input', 'api-endpoint-input',
  'message-input', 'model-menu', 'ai-thinking',
  'system-role-input', 'send-button', 'copy-button',
  'refresh-button'
].map(getElementById);

const CONFIG = {
  ENDPOINT: apiEndpoint || 'https://free.churchless.tech/v1/chat/completions',
  HEADING_REGEX: [/^#\s(.+)/gm, /^##\s(.+)/gm, /^###\s(.+)/gm, /^####\s(.+)/gm],
  BLOCK_REGEX: /```[\s\S]*?```/gs
};

let messages = [{
  role: 'system',
  content: localStorage.getItem('systemRole') || '',
}];

let apiKey = localStorage.getItem('apiKey') || '';
let apiEndpoint = localStorage.getItem('apiEndpoint') || '';
let selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';

apiKeyInput.value = apiKey;
apiEndpointInput.value = apiEndpoint;
selectModel(selectedModel);
updateModelHeading();

messageInput.addEventListener('input', adjustHeightToScroll);
messageInput.addEventListener('keydown', addNewLine);
sendButton.addEventListener('click', sendMessage);
copyButton.addEventListener('click', copyLatestResponse);
refreshButton.addEventListener('click', saveInputsAndRefresh);
window.addEventListener('load', updateModelHeading);

function adjustHeightToScroll() {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${messageInput.scrollHeight}px`;
}

function addNewLine(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    messageInput.value += '\n';
    adjustHeightToScroll();
  }
}

getElementById('send-button').addEventListener('click', sendMessage);

function toggleModelMenu() {
  modelMenu.style.display = modelMenu.style.display === 'none' ? 'block' : 'none';
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

async function getBotResponse(apiKey, apiEndpoint, message) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  messages.push({
    role: 'user',
    content: message,
  });

  aiThinkingMsg.style.display = 'block';

  const data = {
    model: selectedModel,
    messages: messages,
  };

  const response = await fetch(CONFIG.ENDPOINT, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  aiThinkingMsg.style.display = 'none';

  return response.json();
}

function extractCodeBlocks(response) {
  const codeBlocks = response.match(CONFIG.BLOCK_REGEX);
  if (codeBlocks) {
    response = codeBlocks.reduce((acc, codeBlock) => {
      const codeWithoutMarkdown = codeBlock.replace(/```/g, '');
      return acc.replace(codeBlock, '```' + codeWithoutMarkdown + '```');
    }, response);
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

async function createAndAppendMessage(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);

  let displayedText = owner === 'bot' ? content.replace(/</g, "&lt;").replace(/>/g, "&gt;") : content;

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

  const codeBlocks = parsedResponse.match(CONFIG.BLOCK_REGEX);

  if (codeBlocks) {
    parsedResponse = codeBlocks.reduce((acc, codeBlock, index) => {
      return acc.replace(codeBlock, `CODEBLOCK${index}`);
    }, parsedResponse);
  }

  parsedResponse = parsedResponse.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  parsedResponse = parsedResponse.replace(/\$\$(.*?)\$\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parsedResponse.replace(/\$(.*?)\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parseTables(parsedResponse);

  CONFIG.HEADING_REGEX.forEach((regex, index) => {
    const fontSize = 30 - (index * 4);
    const fontWeight = index === 0 ? 'bold' : 'normal';
    parsedResponse = parsedResponse.replace(regex, `<span style="font-size: ${fontSize}px; font-weight: ${fontWeight};">$1</span>`);
  });

  parsedResponse = parsedResponse.replace(/^&gt;\s(.*?)$/gm, '<div class="blockquote">$1</div>');
  parsedResponse = parsedResponse.replace(/\*(.*?)\*/g, '<i>$1</i>');

  if (codeBlocks) {
    parsedResponse = codeBlocks.reduce((acc, codeBlock, index) => {
      return acc.replace(`CODEBLOCK${index}`, createCodeBlockUI(codeBlock));
    }, parsedResponse);
  }

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
  messages = [{
    role: 'system',
    content: localStorage.getItem('systemRole') || '',
  }];
}

getElementById('copy-button').addEventListener('click', () => {
  const latestResponse = chatHistory.lastElementChild.innerHTML;
  if (latestResponse) {
    copyToClipboard(latestResponse);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
});

systemRoleInput.value = localStorage.getItem('systemRole') || '';
systemRoleInput.addEventListener('input', () => {
  localStorage.setItem('systemRole', systemRoleInput.value);
  messages[0].content = systemRoleInput.value;
});

window.addEventListener('load', updateModelHeading);

function saveInputsAndRefresh() {
  apiKey = apiKeyInput.value.trim();
  apiEndpoint = apiEndpointInput.value.trim();

  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiEndpoint', apiEndpoint);

  location.reload();
}

getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);

const chatHistory = document.getElementById('chat-history');
const apiKeyInput = document.getElementById('api-key-input');
const apiEndpointInput = document.getElementById('api-endpoint-input');
const messageInput = document.getElementById('message-input');
const modelMenu = document.getElementById('model-menu');
const aiThinkingMsg = document.getElementById('ai-thinking');
const systemRoleInput = document.getElementById('system-role-input');
const codeBlockRegex = /```[\s\S]*?```/gs;
const inlineCodeBlockRegex = /`(.*?)`/gs;
const headingRegex = [
  /^#\s(.+)/gm,
  /^##\s(.+)/gm,
  /^###\s(.+)/gm,
  /^####\s(.+)/gm
];

const elements = {
  chatHistory,
  apiKeyInput,
  apiEndpointInput,
  messageInput,
  modelMenu,
  aiThinkingMsg,
  systemRoleInput
};

let state = {
  messages: [
    {
      role: 'system',
      content: localStorage.getItem('systemRole') || '',
    },
  ],
  apiKey: localStorage.getItem('apiKey') || '',
  apiEndpoint: localStorage.getItem('apiEndpoint') || '',
  selectedModel: localStorage.getItem('selectedModel') || 'gpt-3.5-turbo',
};

elements.apiKeyInput.value = state.apiKey;
elements.apiEndpointInput.value = state.apiEndpoint;
selectModel(state.selectedModel);
updateModelHeading();

elements.messageInput.addEventListener('input', () => {
  elements.messageInput.style.height = 'auto';
  elements.messageInput.style.height = `${elements.messageInput.scrollHeight}px`;
});

elements.messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    elements.messageInput.value += '\n';
    elements.messageInput.style.height = `${elements.messageInput.scrollHeight}px`;
  }
});

document.getElementById('send-button').addEventListener('click', sendMessage);

function toggleModelMenu() {
  elements.modelMenu.style.display = elements.modelMenu.style.display === 'none' ? 'block' : 'none';
}

elements.modelMenu.addEventListener('click', function(event) {
  if (event.target.tagName === 'LI') {
    const modelOptions = document.querySelectorAll('ul li');
    modelOptions.forEach((option) => option.classList.remove('selected'));
    
    event.target.classList.add('selected');
    
    state.selectedModel = event.target.getAttribute('data-model');
    localStorage.setItem('selectedModel', state.selectedModel);
    
    toggleModelMenu();
    updateModelHeading();
  }
});

function updateModelHeading() {
  const modelHeading = document.querySelector('h1');
  modelHeading.textContent = `Chat with ${state.selectedModel}`;
}

const ENDPOINT = state.apiEndpoint || 'https://free.churchless.tech/v1/chat/completions';

async function getBotResponse(apiKey, apiEndpoint, message) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  state.messages.push({
    role: 'user',
    content: message,
  });

  elements.aiThinkingMsg.style.display = 'block';

  const data = {
    model: state.selectedModel,
    messages: state.messages,
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  elements.aiThinkingMsg.style.display = 'none';

  return response.json();
}

function extractCodeBlocks(response) {
  const codeBlocks = response.match(codeBlockRegex);
  if (codeBlocks) {
    response = codeBlocks.reduce((acc, codeBlock) => {
      const codeWithoutMarkdown = codeBlock.replace(/```/g, '');
      return acc.replace(codeBlock, '```' + codeWithoutMarkdown + '```');
    }, response);
  }
  
  const inlineCodeBlocks = response.match(inlineCodeBlockRegex);
  if (inlineCodeBlocks) {
    response = inlineCodeBlocks.reduce((acc, inlineCodeBlock) => {
      const codeWithoutMarkdown = inlineCodeBlock.replace(/`/g, '');
      return acc.replace(inlineCodeBlock, '`' + codeWithoutMarkdown + '`');
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

function createInlineCodeBlockUI(codeBlock) {
  const spanElement = document.createElement('span');
  spanElement.textContent = codeBlock.replace(/`/g, '');

  const inlineCodeBlockElement = document.createElement('span');
  inlineCodeBlockElement.classList.add('inline-code-block');
  inlineCodeBlockElement.appendChild(spanElement);

  return inlineCodeBlockElement.outerHTML;
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

  elements.chatHistory.appendChild(message);
  elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;

  MathJax.Hub.Queue(['Typeset', MathJax.Hub, message]);
}

function parseResponse(response) {
  let parsedResponse = response;

  const codeBlocks = parsedResponse.match(codeBlockRegex);
  const inlineCodeBlocks = parsedResponse.match(inlineCodeBlockRegex);

  if (codeBlocks) {
    parsedResponse = codeBlocks.reduce((acc, codeBlock, index) => {
      return acc.replace(codeBlock, `CODEBLOCK${index}`);
    }, parsedResponse);
  }

  if (inlineCodeBlocks) {
    parsedResponse = inlineCodeBlocks.reduce((acc, inlineCodeBlock, index) => {
      return acc.replace(inlineCodeBlock, `INLINECODEBLOCK${index}`);
    }, parsedResponse);
  }

  parsedResponse = parsedResponse.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  parsedResponse = parsedResponse.replace(/\$\$(.*?)\$\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parsedResponse.replace(/\$(.*?)\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parseTables(parsedResponse);

  headingRegex.forEach((regex, index) => {
    const fontSize = 30 - (index * 4);
    const fontWeight = index === 0 ? 'bold' : 'normal';
    parsedResponse = parsedResponse.replace(regex, `<span style="font-size: ${fontSize}px; font-weight: ${fontWeight};">$1</span>`);
  });

  parsedResponse = parsedResponse.replace(/^>\s(.*?)$/gm, '<div class="blockquote">$1</div>');
  parsedResponse = parsedResponse.replace(/\*(.*?)\*/g, '<i>$1</i>');

  if (codeBlocks) {
    parsedResponse = codeBlocks.reduce((acc, codeBlock, index) => {
      return acc.replace(`CODEBLOCK${index}`, createCodeBlockUI(codeBlock));
    }, parsedResponse);
  }
  
  if (inlineCodeBlocks) {
    parsedResponse = inlineCodeBlocks.reduce((acc, inlineCodeBlock, index) => {
      return acc.replace(`INLINECODEBLOCK${index}`, createInlineCodeBlockUI(inlineCodeBlock));
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
  state.apiKey = elements.apiKeyInput.value.trim();
  state.apiEndpoint = elements.apiEndpointInput.value.trim();
  const message = elements.messageInput.value.trim();

  if (!message) {
    alert('Please enter a message.');
    return;
  }

  localStorage.setItem('apiKey', state.apiKey);
  localStorage.setItem('apiEndpoint', state.apiEndpoint);

  createAndAppendMessage(message, 'user');
  elements.messageInput.value = '';
  elements.messageInput.style.height = 'auto';

  const jsonResponse = await getBotResponse(state.apiKey, state.apiEndpoint, message);

  const botResponse = jsonResponse.choices[0].message.content;
  state.messages.push({
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
  elements.chatHistory.innerHTML = '';
  state = {
    messages: [
      {
        role: 'system',
        content: localStorage.getItem('systemRole') || '',
      },
    ],
    apiKey: '',
    apiEndpoint: ''
  };
}

document.getElementById('copy-button').addEventListener('click', () => {
  const latestResponse = elements.chatHistory.lastElementChild.innerHTML;
  if (latestResponse) {
    copyToClipboard(latestResponse);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
});

elements.systemRoleInput.value = localStorage.getItem('systemRole') || '';
elements.systemRoleInput.addEventListener('input', () => {
  localStorage.setItem('systemRole', elements.systemRoleInput.value);
  state.messages[0].content = elements.systemRoleInput.value;
});

window.addEventListener('load', updateModelHeading);

function saveInputsAndRefresh() {
  state.apiKey = elements.apiKeyInput.value.trim();
  state.apiEndpoint = elements.apiEndpointInput.value.trim();

  localStorage.setItem('apiKey', state.apiKey);
  localStorage.setItem('apiEndpoint', state.apiEndpoint);

  location.reload();
}

document.getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);

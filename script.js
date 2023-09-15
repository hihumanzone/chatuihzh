const chatHistory = document.getElementById('chat-history');
const apiKeyInput = document.getElementById('api-key-input');
const apiEndpointInput = document.getElementById('api-endpoint-input');
const messageInput = document.getElementById('message-input');
const modelMenu = document.getElementById('model-menu');
const aiThinkingMsg = document.getElementById('ai-thinking');
const systemRoleInput = document.getElementById('system-role-input');

let messages = [
  {
    role: 'system',
    content: localStorage.getItem('systemRole') || '',
  },
];

let apiKey = localStorage.getItem('apiKey') || '';
let apiEndpoint = localStorage.getItem('apiEndpoint') || '';
let selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';

apiKeyInput.value = apiKey;
apiEndpointInput.value = apiEndpoint;
selectModel(selectedModel);
updateModelHeading();

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

document.getElementById('send-button').addEventListener('click', sendMessage);

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

const ENDPOINT = apiEndpoint || 'https://free.churchless.tech/v1/chat/completions';

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

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  aiThinkingMsg.style.display = 'none';

  return response.json();
}

async function createAndAppendMessage(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);

  let displayedText = content;
  
  if (owner === 'bot') {
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

    // Parses bold text
    parsedResponse = parsedResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Parses italic text
    parsedResponse = parsedResponse.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Parses strikethrough text
    parsedResponse = parsedResponse.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // Parses headers using fontSize instead of h tags
    parsedResponse = parsedResponse.replace(/#### (.*?)( \n|$)/g, '<p style="font-size: 1em;">$1</p>');
    parsedResponse = parsedResponse.replace(/### (.*?)( \n|$)/g, '<p style="font-size: 1.25em;">$1</p>');
    parsedResponse = parsedResponse.replace(/## (.*?)( \n|$)/g, '<p style="font-size: 1.5em;">$1</p>');
    parsedResponse = parsedResponse.replace(/# (.*?)( \n|$)/g, '<p style="font-size: 2em;">$1</p>');
    
    // Parses inline code
    parsedResponse = parsedResponse.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Parses links
    parsedResponse = parsedResponse.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    // Parses images
    parsedResponse = parsedResponse.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');

    // Parses blockquotes
    parsedResponse = parsedResponse.replace(/> (.*?)( \n|$)/g, '<blockquote>$1</blockquote>');

    // Parses unordered lists
    parsedResponse = parsedResponse.replace(/\n\*(.*?)\n/g, '\n<ul>\n<li>$1</li>\n</ul>\n');
    parsedResponse = parsedResponse.replace(/\n\+(.*?)\n/g, '\n<ul>\n<li>$1</li>\n</ul>\n');
    parsedResponse = parsedResponse.replace(/\n\-(.*?)\n/g, '\n<ul>\n<li>$1</li>\n</ul>\n');

    // Parses ordered lists
    parsedResponse = parsedResponse.replace(/\n(\d+\..*?)\n/g, '\n<ol>\n<li>$1</li>\n</ol>\n');

    // Parses task lists
    parsedResponse = parsedResponse.replace(/\n\-\s\[x\](.*?)\n/g, '\n<ul>\n<li><input type="checkbox" checked disabled>$1</li>\n</ul>\n');
    parsedResponse = parsedResponse.replace(/\n\-\s\[\](.*?)\n/g, '\n<ul>\n<li><input type="checkbox" disabled>$1</li>\n</ul>\n');

    // Parses code blocks
    parsedResponse = parsedResponse.replace(/```(.*?)```/gs, function (match, p1) {
        return `<div class="code-block"><pre>${p1}</pre>
          <button class="copy-button" onclick="copyToClipboard('${p1}')">Copy</button>
        </div>`;
    });
  
    // Parses math equations
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
  messages = [
    {
      role: 'system',
      content: localStorage.getItem('systemRole') || '',
    },
  ];
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

document.getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);

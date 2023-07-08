const chatHistory = document.getElementById('chat-history');
const apiKeyInput = document.getElementById('api-key-input');
const apiEndpointInput = document.getElementById('api-endpoint-input');
const messageInput = document.getElementById('message-input');
const modelMenu = document.getElementById('model-menu');
const aiThinkingMsg = document.getElementById('ai-thinking');
const systemRoleInput = document.getElementById('system-role-input');
const sendButton = document.getElementById('send-button');
const copyButton = document.getElementById('copy-button');
const h1 = document.querySelector('h1');

const messages = [
  {
    role: 'system',
    content: localStorage.getItem('systemRole') || 'You are a helpful assistant.',
  },
];

let apiKey = localStorage.getItem('apiKey') || '';
let apiEndpoint = localStorage.getItem('apiEndpoint') || '';
let selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';

const selectModelOption = (model) => {
  const modelOptions = Array.from(document.querySelectorAll('ul li'));
  modelOptions.forEach(option => {
    option.classList.remove('selected');
    if (option.dataset.model === model) {
      option.classList.add('selected');
    }
  });
};

const updateModelHeading = () => {
  h1.innerText = `Chat with ${selectedModel}`;
};

const getBotResponse = async (apiKey, apiEndpoint, message) => {
  const ENDPOINT = apiEndpoint || 'https://chimeragpt.adventblocks.cc/v1/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

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

  const maxTokens = models[selectedModel] || 4096;
  let tokenCount = getTokenCount(messages[0].content);

  for (let i = 1; i < messages.length; i++) {
    const messageTokenCount = getTokenCount(messages[i].content);

    if (tokenCount + messageTokenCount > maxTokens) {
      messages.splice(1, i - 1);
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
};

const getTokenCount = (text) => {
  const words = text.trim().split(/\s+/);
  return words.length;
};

const createAndAppendMessage = (content, owner) => {
  const message = document.createElement('div');
  message.classList.add('message', owner);

  let displayedText = content;

  const parsedContent = parseResponse(displayedText);
  message.innerHTML = parsedContent;

  chatHistory.appendChild(message);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  MathJax.Hub.Queue(['Typeset', MathJax.Hub, message]);
};

const parseResponse = (response) => {
  let parsedResponse = response;

  parsedResponse = parsedResponse.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  parsedResponse = parsedResponse.replace(/\$\$(.*?)\$\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parsedResponse.replace(/\$(.*?)\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parseTables(parsedResponse);

  return parsedResponse;
};

const parseTables = (response) => {
  const tableRegex = /\n((?:\s*\|.*\|\n)+)\n/g;
  return response.replace(tableRegex, createTable);
};

const createTable = (match, table) => {
  const rows = table.trim().split('\n');
  const tableElement = document.createElement('table');

  const tableHeader = document.createElement('tr');
  const tableHeaderCells = rows[0].split('|').slice(1, -1);

  tableHeaderCells.forEach(cell => {
    const th = document.createElement('th');
    th.classList.add('table-header');
    th.innerText = cell.trim();
    tableHeader.appendChild(th);
  });

  tableElement.appendChild(tableHeader);

  for (let i = 2; i < rows.length; i++) {
    const row = document.createElement('tr');
    const tableCells = rows[i].split('|').slice(1, -1);

    tableCells.forEach(cell => {
      const td = document.createElement('td');
      td.classList.add('table-data');
      td.innerHTML = parseResponse(cell.trim());
      row.appendChild(td);
    });

    tableElement.appendChild(row);
  }

  return tableElement.outerHTML;
};

const sendMessage = async () => {
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

  const json = await getBotResponse(apiKey, apiEndpoint, message);
  const botResponse = json.choices[0].message.content;

  messages.push({
    role: 'assistant',
    content: botResponse,
  });

  createAndAppendMessage(botResponse, 'bot');
};

const copyToClipboard = (text) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

sendButton.addEventListener('click', sendMessage);

const toggleModelMenu = () => {
  modelMenu.classList.toggle('hidden');
};

const selectModel = (model) => {
  selectModelOption(model);
  selectedModel = model;
  localStorage.setItem('selectedModel', selectedModel);

  toggleModelMenu();
  updateModelHeading();
};

copyButton.addEventListener('click', () => {
  const latestResponse = chatHistory.lastElementChild.innerText;

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

window.addEventListener('load', updateModelHeading);

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

modelMenu.addEventListener('click', (event) => {
  if (!event.target.closest('.selected-model')) {
    toggleModelMenu();
  }
});

apiEndpointInput.addEventListener('input', () => {
  apiEndpoint = apiEndpointInput.value.trim();
});

apiKeyInput.addEventListener('input', () => {
  apiKey = apiKeyInput.value.trim();
});

// Initial setup
apiKeyInput.value = apiKey;
apiEndpointInput.value = apiEndpoint;
selectModelOption(selectedModel);
updateModelHeading();

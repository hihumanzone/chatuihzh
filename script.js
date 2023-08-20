const getElementById = (id) => document.getElementById(id);
const getLocalStorage = (key, defaultVal = '') => localStorage.getItem(key) || defaultVal;
const setLocalStorage = (key, value) => localStorage.setItem(key, value);
const setElemValue = (elem, value) => { elem.value = value; }

const UI = {
    chatHistory: getElementById('chat-history'),
    apiKeyInput: getElementById('api-key-input'),
    apiEndpointInput: getElementById('api-endpoint-input'),
    messageInput: getElementById('message-input'),
    modelMenu: getElementById('model-menu'),
    aiThinkingMsg: getElementById('ai-thinking'),
    systemRoleInput: getElementById('system-role-input')
};

const codeBlockRegex = /```[\s\S]*?```/gs;
const headingRegex = [
    /^#\s(.+)/gm,
    /^##\s(.+)/gm,
    /^###\s(.+)/gm,
    /^####\s(.+)/gm
];

let messages = [
    {
        role: 'system',
        content: getLocalStorage('systemRole'),
    },
];
let apiKey = getLocalStorage('apiKey');
let apiEndpoint = getLocalStorage('apiEndpoint');
let selectedModel = getLocalStorage('selectedModel', 'gpt-3.5-turbo');
const ENDPOINT = apiEndpoint || 'https://free.churchless.tech/v1/chat/completions';

const initializeValues = () => {
    setElemValue(UI.apiKeyInput, apiKey);
    setElemValue(UI.apiEndpointInput, apiEndpoint);
    selectModel(selectedModel);
    updateModelHeading();
}

const toggleModelMenu = () => {
    UI.modelMenu.style.display = UI.modelMenu.style.display === 'none' ? 'block' : 'none';
}

const selectModel = (model) => {
    document.querySelectorAll('ul li').forEach(option => option.classList.remove('selected'));
    const selectedModelOption = document.querySelector(`ul li[data-model="${model}"]`);
    selectedModelOption && selectedModelOption.classList.add('selected');
    selectedModel = model;
    setLocalStorage('selectedModel', selectedModel);
    toggleModelMenu();
    updateModelHeading();
}

const updateModelHeading = () => {
    document.querySelector('h1').textContent = `Chat with ${selectedModel}`;
}

const getBotResponse = async (apiKey, apiEndpoint, message) => {
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

const extractCodeBlocks = (response) => {
const codeBlocks = response.match(codeBlockRegex);
  if (codeBlocks) {
    response = codeBlocks.reduce((acc, codeBlock) => {
      const codeWithoutMarkdown = codeBlock.replace(/```/g, '');
      return acc.replace(codeBlock, '```' + codeWithoutMarkdown + '```');
    }, response);
  }

  return response;
}

const createCodeBlockUI = (codeBlock) => {
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

const createAndAppendMessage = async (content, owner) => {
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

const parseResponse = (response) => {
  let parsedResponse = response;

  const codeBlocks = parsedResponse.match(codeBlockRegex);

  if (codeBlocks) {
    parsedResponse = codeBlocks.reduce((acc, codeBlock, index) => {
      return acc.replace(codeBlock, `CODEBLOCK${index}`);
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

  parsedResponse = parsedResponse.replace(/^&gt;\s(.*?)$/gm, '<div class="blockquote">$1</div>');
  parsedResponse = parsedResponse.replace(/\*(.*?)\*/g, '<i>$1</i>');

  if (codeBlocks) {
    parsedResponse = codeBlocks.reduce((acc, codeBlock, index) => {
      return acc.replace(`CODEBLOCK${index}`, createCodeBlockUI(codeBlock));
    }, parsedResponse);
  }

  return parsedResponse;
}

const parseTables = (response) => {
  const tableRegex = /\n((?:\s*:?[\|:].*?:?\|\n)+)\n/g;
  return response.replace(tableRegex, createTable);
}

const createTable = (match, table) => {
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

const sendMessage = async () => {
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

const copyToClipboard = (text) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

const clearChatHistory = () => {
  chatHistory.innerHTML = '';
  messages = [
    {
      role: 'system',
      content: localStorage.getItem('systemRole') || '',
    },
  ];
}
}

UI.messageInput.addEventListener('input', () => {
    UI.messageInput.style.height = 'auto';
    UI.messageInput.style.height = `${UI.messageInput.scrollHeight}px`;
});

UI.messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        UI.messageInput.value += '\n';
        UI.messageInput.style.height = `${UI.messageInput.scrollHeight}px`;
    }
});

getElementById('send-button').addEventListener('click', sendMessage);
getElementById('copy-button').addEventListener('click', () => {
    const latestResponse = UI.chatHistory.lastElementChild.innerHTML;
    if (latestResponse) {
        copyToClipboard(latestResponse);
        alert('Text copied to clipboard');
    } else {
        alert('No text to copy');
    }
});

UI.systemRoleInput.value = getLocalStorage('systemRole');
UI.systemRoleInput.addEventListener('input', () => {
    setLocalStorage('systemRole', UI.systemRoleInput.value);
    messages[0].content = UI.systemRoleInput.value;
});

window.addEventListener('load', updateModelHeading);

const saveInputsAndRefresh = () => {
    apiKey = UI.apiKeyInput.value.trim();
    apiEndpoint = UI.apiEndpointInput.value.trim();
    setLocalStorage('apiKey', apiKey);
    setLocalStorage('apiEndpoint', apiEndpoint);
    location.reload();
}

getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);

initializeValues();

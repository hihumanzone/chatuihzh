const elements = {
  chatHistory: document.getElementById('chat-history'),
  apiKeyInput: document.getElementById('apiKey-input'),
  apiEndpointInput: document.getElementById('api-endpoint-input'),
  messageInput: document.getElementById('message-input'),
  modelMenu: document.getElementById('model-menu'),
  aiThinkingMsg: document.getElementById('ai-thinking'),
  systemRoleInput: document.getElementById('system-role-input')
};

let messages = [{
  role: 'system',
  content: localStorage.getItem('systemRole') || ''
}];

let apiKey = localStorage.getItem('apiKey') || '';
let apiEndpoint = localStorage.getItem('apiEndpoint') || '';
let selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';
let systemRole = localStorage.getItem('systemRole') || '';

elements.apiKeyInput.value = apiKey;
elements.apiEndpointInput.value = apiEndpoint;
elements.systemRoleInput.value = systemRole;
selectModel(selectedModel);
updateModelHeading();

document.getElementById('send-button').addEventListener('click', sendMessage);

function toggleModelMenu() {
  elements.modelMenu.style.display = elements.modelMenu.style.display === 'none' ? 'block' : 'none';
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

elements.messageInput.addEventListener('input', () => {
  elements.messageInput.style.height = 'auto';
  elements.messageInput.style.height = `${elements.messageInput.scrollHeight}px`;
});

function updateModelHeading() {
  const modelHeading = document.querySelector('.class-h1');
  modelHeading.textContent = `${selectedModel}`;
}

const ENDPOINT = apiEndpoint || 'https://nyx-beta.samirawm7.repl.co/openai/chat/completions';

async function getBotResponse(apiKey, apiEndpoint, message) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  };

  messages.push({
    role: 'user',
    content: message
  });

  elements.aiThinkingMsg.style.display = 'flex';

  const data = {
    model: selectedModel,
    messages: messages
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
  });

  elements.aiThinkingMsg.style.display = 'none';

  return response.json();
}

function createAndAppendMessage(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);
  message.dataset.raw = content;

  let displayedText = content;

  MathJax.Hub.Config({
    tex2jax: {
      inlineMath: [
        ['$', '$'],
        ['\\(', '\\)']
      ],
      processEscapes: true
    }
  });

  const md = window.markdownit();
  displayedText = md.render(displayedText);
  message.innerHTML = displayedText;

  const actionButtons = document.createElement('div');
  actionButtons.classList.add('action-buttons');

  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy';
  copyButton.classList.add('action-button-copy');
  copyButton.addEventListener('click', () => copyMessage(content));

  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';
  deleteButton.classList.add('action-button-delete');
  deleteButton.addEventListener('click', () => {
    deleteMessage(message, content);
  });

  actionButtons.appendChild(copyButton);
  actionButtons.appendChild(deleteButton);

  if (owner === 'bot') {
    const regenButton = document.createElement('button');
    regenButton.textContent = 'Regen';
    regenButton.classList.add('action-button-regen');
    regenButton.addEventListener('click', () => {
      regenerateMessage(message, owner);
    });

    actionButtons.appendChild(regenButton);
  }

  message.appendChild(actionButtons);

  elements.chatHistory.insertBefore(message, elements.aiThinkingMsg);
  elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
  MathJax.Hub.Queue(['Typeset', MathJax.Hub, message]);
}

function copyMessage(content) {
  if (content) {
    copyToClipboard(content);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
}

function deleteMessage(messageElement, content) {
  elements.chatHistory.removeChild(messageElement);
  messages = messages.filter(msg => msg.content !== content);
}

async function regenerateMessage(messageElement, owner) {
  const messageIdx = messages.findIndex(msg => msg.content === messageElement.dataset.raw && msg.role === owner);
  messages.splice(messageIdx, 1);
  elements.chatHistory.removeChild(messageElement);
  const userMessage = messages[messages.length - 1].content;
  const jsonResponse = await getBotResponse(apiKey, apiEndpoint, userMessage);
  const botResponse = jsonResponse.choices[0].message.content;
  messages.push({
    role: 'assistant',
    content: botResponse
  });
  createAndAppendMessage(botResponse, 'bot');
}

async function sendMessage() {
  apiKey = elements.apiKeyInput.value.trim();
  apiEndpoint = elements.apiEndpointInput.value.trim();
  const message = elements.messageInput.value;

  if (!message) {
    alert('Please enter a message.');
    return;
  }

  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiEndpoint', apiEndpoint);

  createAndAppendMessage(message, 'user');
  elements.messageInput.value = '';
  elements.messageInput.style.height = 'auto';

  const jsonResponse = await getBotResponse(apiKey, apiEndpoint, message);

  const botResponse = jsonResponse.choices[0].message.content;
  messages.push({
    role: 'assistant',
    content: botResponse
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
  Array.from(elements.chatHistory.getElementsByClassName('message')).forEach(message => {
    elements.chatHistory.removeChild(message);
  });

  messages = [{
    role: 'system',
    content: localStorage.getItem('systemRole') || ''
  }];
}

elements.systemRoleInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    let caret = elements.systemRoleInput.selectionStart;
    elements.systemRoleInput.value = elements.systemRoleInput.value.substring(0, caret) + '\n' + elements.systemRoleInput.value.substring(caret);
    elements.systemRoleInput.selectionEnd = caret + 1;
    localStorage.setItem('systemRole', elements.systemRoleInput.value);
    messages[0].content = elements.systemRoleInput.value;
  }
});

window.addEventListener('load', updateModelHeading);

function saveInputsAndRefresh() {
  apiKey = elements.apiKeyInput.value.trim();
  apiEndpoint = elements.apiEndpointInput.value.trim();
  let systemRole = elements.systemRoleInput.value.trim();

  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiEndpoint', apiEndpoint);
  localStorage.setItem('systemRole', systemRole);

  location.reload();
}

document.getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);

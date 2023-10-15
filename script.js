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
let systemRole = localStorage.getItem('systemRole') || '';

apiKeyInput.value = apiKey;
apiEndpointInput.value = apiEndpoint;
systemRoleInput.value = systemRole;
selectModel(selectedModel);
updateModelHeading();


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

messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
});

function updateModelHeading() {
  const modelHeading = document.querySelector('.class-h1');
  modelHeading.textContent = `Chat with ${selectedModel}`;
}

const ENDPOINT = apiEndpoint || 'https://nyx-beta.samirawm7.repl.co/openai/chat/completions';

async function getBotResponse(apiKey, apiEndpoint, message) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  messages.push({
    role: 'user',
    content: message,
  });

  aiThinkingMsg.style.display = 'flex';

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

function createAndAppendMessage(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);
  message.dataset.raw = content;

  let displayedText = content;
    
MathJax.Hub.Config({
  tex2jax: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    processEscapes: true
  }
});

  const md = window.markdownit();
  displayedText = md.render(displayedText);
  message.innerHTML = displayedText;
  displayedText = displayedText.replace(/\n/g, '<br>');

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

  chatHistory.insertBefore(message, aiThinkingMsg);
  chatHistory.scrollTop = chatHistory.scrollHeight;
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
  chatHistory.removeChild(messageElement);
  messages = messages.filter(msg => msg.content !== content);
}

async function regenerateMessage(messageElement, owner) {
  const messageIdx = messages.findIndex(msg => msg.content === messageElement.dataset.raw && msg.role === owner);
  messages.splice(messageIdx, 1);
  chatHistory.removeChild(messageElement);
  const userMessage = messages[messages.length - 1].content;
  const jsonResponse = await getBotResponse(apiKey, apiEndpoint, userMessage);
  const botResponse = jsonResponse.choices[0].message.content;
  messages.push({
    role: 'assistant',
    content: botResponse,
  });
  createAndAppendMessage(botResponse, 'bot');
}

async function sendMessage() {
  apiKey = apiKeyInput.value.trim();
  apiEndpoint = apiEndpointInput.value.trim();
  const message = messageInput.value;

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
  Array.from(chatHistory.getElementsByClassName('message')).forEach(message => {
    chatHistory.removeChild(message);
  });

  messages = [
    {
    role: 'system',
    content: localStorage.getItem('systemRole') || '',
  },
];
}

systemRoleInput.addEventListener('keydown', (event) => {
if (event.key === 'Enter' && !event.shiftKey) {
  event.preventDefault();
  let caret = systemRoleInput.selectionStart;
  systemRoleInput.value = systemRoleInput.value.substring(0, caret) + '\n' + systemRoleInput.value.substring(caret);
  systemRoleInput.selectionEnd = caret + 1;
  localStorage.setItem('systemRole', systemRoleInput.value);
  messages[0].content = systemRoleInput.value;
}
});

window.addEventListener('load', updateModelHeading);

function saveInputsAndRefresh() {
  apiKey = apiKeyInput.value.trim();
  apiEndpoint = apiEndpointInput.value.trim();
  let systemRole = systemRoleInput.value.trim();

  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiEndpoint', apiEndpoint);
  localStorage.setItem('systemRole', systemRole);

  location.reload();
}

document.getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);

const chatHistory = document.getElementById('chat-history');
const apiKeyInput = document.getElementById('api-key-input');
const apiEndpointInput = document.getElementById('api-endpoint-input');
const messageInput = document.getElementById('message-input');
const modelMenu = document.getElementById('model-menu');
const aiThinkingMsg = document.getElementById('ai-thinking');
const systemRoleInput = document.getElementById('system-role-input');

let messages = [{
  role: 'system',
  content: localStorage.getItem('systemRole') || '',
}];

let apiKey = localStorage.getItem('apiKey') || '';
let apiEndpoint = localStorage.getItem('apiEndpoint') || '';
let selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';
let systemRole = localStorage.getItem('systemRole') || '';

apiKeyInput.value = apiKey;
apiEndpointInput.value = apiEndpoint;
systemRoleInput.value = systemRole;
selectModel(selectedModel);

document.getElementById('send-button').addEventListener('click', sendMessage);

function selectModel(model) {
  const modelOptions = document.querySelectorAll('#model-list div');
  modelOptions.forEach((option) => {
    option.classList.remove('selected');
    if (option.dataset.model === model) {
      option.classList.add('selected');
    }
  });

  selectedModel = model;
  localStorage.setItem('selectedModel', selectedModel);

  toggleModelMenu();
}

function toggleModelMenu() {
  modelMenu.style.display = modelMenu.style.display === 'none' ? 'block' : 'none';
}

messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${messageInput.scrollHeight}px`;
});

document.getElementById('custom-model-switch').addEventListener('change', function(event) {
  if (event.target.checked) {
    document.getElementById('model-list').style.display = 'none';
    document.getElementById('custom-model-input').style.display = 'block';
    selectedModel = '';
  } else {
    document.getElementById('model-list').style.display = 'block';
    document.getElementById('custom-model-input').style.display = 'none';
    document.getElementById('custom-model-input').value = ''; // Clear the custom input field when switching back.
    selectModel(localStorage.getItem('selectedModel') || 'gpt-3.5-turbo'); // Reset to the last selected model from the list.
  }
});

document.addEventListener('DOMContentLoaded', function(event) {
  const isCustomModelActive = localStorage.getItem('isCustomModelActive') === 'true';
  const customModelName = localStorage.getItem('customModelName') || '';

  if (isCustomModelActive) {
    document.getElementById('custom-model-switch').checked = true;
    document.getElementById('custom-model-input').value = customModelName;
    document.getElementById('custom-model-input').style.display = 'block';
    document.getElementById('model-list').style.display = 'none';
    selectedModel = customModelName;
  }
});

document.getElementById('custom-model-input').addEventListener('input', function(event) {
  selectedModel = event.target.value.trim();
});

const ENDPOINT = apiEndpoint || 'https://api.openai.com/v1/chat/completions';

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
    model: selectedModel || document.getElementById('custom-model-input').value.trim(),
    messages: messages,
  };

  const response = await fetch(apiEndpoint || ENDPOINT, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  aiThinkingMsg.style.display = 'none';

  return response.json();
}

let lastBotMessageElement = null;

function createAndAppendMessage(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);
  message.dataset.raw = content;

  const messageText = document.createElement('div');
  messageText.classList.add('message-text');
  message.appendChild(messageText);

  MathJax.Hub.Config({
    tex2jax: {
      inlineMath: [
        ['$', '$'],
        ['\\(', '\\)'],
      ],
      processEscapes: true,
    },
  });

  const md = window.markdownit();
  const displayedText = md.render(content);
  messageText.innerHTML = displayedText;

  const codeBlocks = message.querySelectorAll('pre code');
  codeBlocks.forEach((code) => {
    const copyCodeButton = document.createElement('button');
    copyCodeButton.classList.add('copy-code-button');
    copyCodeButton.textContent = 'Copy Code';
    copyCodeButton.addEventListener('click', () => {
      copyToClipboard(code.innerText || code.textContent);
      alert('Code copied to clipboard');
    });
    const codeBlockContainer = code.parentNode;
    codeBlockContainer.appendChild(copyCodeButton);
  });

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

  if (lastBotMessageElement && owner === 'bot') {
    const lastRegenButton = lastBotMessageElement.querySelector('.action-button-regen');
    if (lastRegenButton) {
      lastRegenButton.remove();
    }
  }

  if (owner === 'bot') {
    const regenButton = document.createElement('button');
    regenButton.textContent = 'Regen';
    regenButton.classList.add('action-button-regen');
    regenButton.addEventListener('click', () => regenerateMessage(message, owner));

    actionButtons.appendChild(regenButton);
    lastBotMessageElement = message;
  }

  message.appendChild(actionButtons);
  chatHistory.insertBefore(message, aiThinkingMsg);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  MathJax.Hub.Queue(['Typeset', MathJax.Hub, messageText]);
}

function addRegenerateButton(messageElement) {
  if (!messageElement.querySelector('.action-button-regen')) {
    const regenButton = document.createElement('button');
    regenButton.textContent = 'Regen';
    regenButton.classList.add('action-button-regen');
    regenButton.addEventListener('click', () => regenerateMessage(messageElement, 'bot'));

    const actionButtons = messageElement.querySelector('.action-buttons');
    actionButtons.appendChild(regenButton);
  }
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
  messages = messages.filter((msg) => msg.content !== content);

  if (lastBotMessageElement === messageElement) {
    lastBotMessageElement = null;

    const botMessages = chatHistory.querySelectorAll('.message.bot');
    if (botMessages.length > 0) {
      const lastBotMsgElement = botMessages[botMessages.length - 1];
      addRegenerateButton(lastBotMsgElement);
      lastBotMessageElement = lastBotMsgElement;
    }
  }
}

async function regenerateMessage(messageElement, owner) {
  const messageIdx = messages.findIndex((msg) => msg.content === messageElement.dataset.raw && msg.role === owner);
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
  Array.from(chatHistory.getElementsByClassName('message')).forEach((message) => {
    chatHistory.removeChild(message);
  });

  messages = [{
    role: 'system',
    content: localStorage.getItem('systemRole') || '',
  }];
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

function saveInputsAndRefresh() {
  apiKey = apiKeyInput.value.trim();
  apiEndpoint = apiEndpointInput.value.trim();
  systemRole = systemRoleInput.value.trim();
  const isCustomModelActive = document.getElementById('custom-model-switch').checked;
  const customModelName = document.getElementById('custom-model-input').value.trim();
  
  if (isCustomModelActive) {
    selectedModel = customModelName;
  }

  localStorage.setItem('isCustomModelActive', isCustomModelActive);
  localStorage.setItem('customModelName', customModelName);
  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiEndpoint', apiEndpoint);
  localStorage.setItem('systemRole', systemRole);

  location.reload();
}

document.getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);

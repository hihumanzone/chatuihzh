class ChatBot {
  constructor() {
    this.config = {
      apiKey: localStorage.getItem('apiKey') || '',
      apiEndpoint: localStorage.getItem('apiEndpoint') || '',
      selectedModel: localStorage.getItem('selectedModel') || 'gpt-3.5-turbo',
      systemRole: localStorage.getItem('systemRole') || ''
    };

    this.domElements = {
      chatHistory: document.getElementById('chat-history'),
      apiKeyInput: document.getElementById('api-key-input'),
      apiEndpointInput: document.getElementById('api-endpoint-input'),
      messageInput: document.getElementById('message-input'),
      modelMenu: document.getElementById('model-menu'),
      aiThinkingMsg: document.getElementById('ai-thinking'),
      systemRoleInput: document.getElementById('system-role-input')
    };

    this.messages = [{
      role: 'system',
      content: this.config.systemRole
    }];

    this.ENDPOINT = this.config.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    this.lastBotMessageElement = null;
  }

  init() {
    this.domElements.apiKeyInput.value = this.config.apiKey;
    this.domElements.apiEndpointInput.value = this.config.apiEndpoint;
    this.domElements.systemRoleInput.value = this.config.systemRole;
    this.selectModel(this.config.selectedModel);

    document.getElementById('send-button').addEventListener('click', () => this.sendMessage());
    this.domElements.messageInput.addEventListener('input', () => this.autoResizeInput());

    document.addEventListener('click', event => this.handleDocumentClick(event));
    document.getElementById('refresh-button').addEventListener('click', () => this.saveInputsAndRefresh());
  }

  function selectModel(model) {
  const modelOptions = document.querySelectorAll('#model-list div');
  modelOptions.forEach((option) => option.classList.remove('selected'));

  const selectedModelOption = document.querySelector(`#model-list div[data-model="${model}"]`);
  if (selectedModelOption) {
    selectedModelOption.classList.add('selected');
  }

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

  const response = await fetch(apiEndpoint || ENDPOINT, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  aiThinkingMsg.style.display = 'none';

  return response.json();
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

  function saveInputsAndRefresh() {
  apiKey = apiKeyInput.value.trim();
  apiEndpoint = apiEndpointInput.value.trim();
  systemRole = systemRoleInput.value.trim();

  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiEndpoint', apiEndpoint);
  localStorage.setItem('systemRole', systemRole);

  location.reload();
  }
}

const bot = new ChatBot();
bot.init();

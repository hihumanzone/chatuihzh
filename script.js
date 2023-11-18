// Selectors and Initial State
const chatHistory = document.getElementById('chat-history');
const apiKeyInput = document.getElementById('api-key-input');
const apiEndpointInput = document.getElementById('api-endpoint-input');
const messageInput = document.getElementById('message-input');
const modelMenu = document.getElementById('model-menu');
const aiThinkingMsg = document.getElementById('ai-thinking');
const systemRoleInput = document.getElementById('system-role-input');
const md = window.markdownit();

const LOCAL_STORAGE_KEYS = {
  apiKey: 'apiKey',
  apiEndpoint: 'apiEndpoint',
  selectedModel: 'selectedModel',
  systemRole: 'systemRole'
};

const state = {
  messages: [{ role: 'system', content: '' }],
  apiKey: '',
  apiEndpoint: '',
  selectedModel: 'gpt-3.5-turbo',
  systemRole: '',
  lastBotMessageElement: null
};

// Load initial state from localStorage
function init() {
  state.apiKey = localStorage.getItem(LOCAL_STORAGE_KEYS.apiKey) || '';
  state.apiEndpoint = localStorage.getItem(LOCAL_STORAGE_KEYS.apiEndpoint) || '';
  state.selectedModel = localStorage.getItem(LOCAL_STORAGE_KEYS.selectedModel) || 'gpt-3.5-turbo';
  state.systemRole = localStorage.getItem(LOCAL_STORAGE_KEYS.systemRole) || '';
  state.messages[0].content = state.systemRole;
  
  apiKeyInput.value = state.apiKey;
  apiEndpointInput.value = state.apiEndpoint;
  systemRoleInput.value = state.systemRole;
  
  document.getElementById('send-button').addEventListener('click', sendMessage);
  document.getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);
  document.getElementById('clear-button').addEventListener('click', clearChatHistory);
  document.getElementById('settings').addEventListener('click', toggleModelMenu);
  
  messageInput.addEventListener('input', resizeMessageInput);
  systemRoleInput.addEventListener('keydown', handleSystemRoleEnter);
  
  selectModel(state.selectedModel);
}

// Update the model selection and close the model menu
function selectModel(model) {
  state.selectedModel = model;
  localStorage.setItem(LOCAL_STORAGE_KEYS.selectedModel, state.selectedModel);
  
  const modelOptions = Array.from(document.querySelectorAll('#model-list div'));
  
  modelOptions.forEach((option) => {
    option.classList.toggle('selected', option.dataset.model === model);
  });
  
  apiThinkingMsg.style.display = 'none';
  toggleModelMenu();
}

// Toggle the visibility of the model selection menu
function toggleModelMenu() {
  const isHidden = modelMenu.style.display === 'none';
  modelMenu.style.display = isHidden ? 'block' : 'none';
}

// Resize the message input to fit content
function resizeMessageInput() {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${messageInput.scrollHeight}px`;
}

// Get a response from the AI bot
async function getBotResponse(message) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${state.apiKey}`,
  };

  state.messages.push({
    role: 'user',
    content: message,
  });

  aiThinkingMsg.style.display = 'flex';
  
  const data = {
    model: state.selectedModel,
    messages: state.messages,
  };

  const endpoint = state.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    });
  
    aiThinkingMsg.style.display = 'none';
    return response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    aiThinkingMsg.style.display = 'none';
  }
}

// Create and append a chat message to the chat history
function createAndAppendMessage(content, owner) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', owner);
  const messageText = document.createElement('div');
  messageText.classList.add('message-text');
  messageText.innerHTML = convertMarkdownToHTML(content);
  
  messageElement.appendChild(messageText);
  addActionsToMessage(messageElement, owner === 'bot');
  chatHistory.insertBefore(messageElement, aiThinkingMsg);
  
  if (owner === 'bot') {
    state.lastBotMessageElement = messageElement;
  }
  
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function convertMarkdownToHTML(markdown) {
  return md.render(markdown);
}

// Add action buttons (copy, delete, regenerate) to the message
function addActionsToMessage(messageElement, isBotMessage) {
  const actionButtons = document.createElement('div');
  actionButtons.classList.add('action-buttons');
  
  const copyButton = createActionButtouton('Copy', () => copyTextToClipboard(messageElement.textContent));
  const deleteButton = createActionButtouton('Delete', () => chatHistory.removeChild(messageElement));
  
  actionButtons.appendChild(copyButton);
  actionButtons.appendChild(deleteButton);
  
  if (isBotMessage) {
    const regenButton = createActionButtouton('Regen', () => regenerateMessage(messageElement));
    actionButtons.appendChild(regenButton);
  }
  
  messageElement.appendChild(actionButtons);
}

// Create a button for message actions
function createActionButtouton(text, onClick) {
  const button = document.createElement('button');
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

// Copy text to the clipboard
function copyTextToClipboard(text) {
  navigator.clipboard.writeText(text).then(
    () => alert('Text copied to clipboard'),
    (err) => console.error('Async clipboard write failed:', err)
  );
}

// Regenerate a message from the AI bot
async function regenerateMessage(messageElement) {
  const messageIdx = state.messages.findIndex((msg) => msg.content === messageElement.textContent);
  const userMessage = state.messages[messageIdx - 1].content; // Assuming user message comes before
  
  state.messages.splice(messageIdx, 1);
  chatHistory.removeChild(messageElement);
  
  const jsonResponse = await getBotResponse(userMessage);
  const botResponse = jsonResponse?.choices[0]?.message?.content;
  
  if (botResponse && jsonResponse) {
    state.messages.push({
      role: 'assistant',
      content: botResponse,
    });
    createAndAppendMessage(botResponse, 'bot');
  }
}

// Send a message when user presses Send button
async function sendMessage() {
  const message = messageInput.value;
  if (!message) return alert('Please enter a message.');
  
  createAndAppendMessage(message, 'user');
  messageInput.value = '';
  resizeMessageInput();
  
  const jsonResponse = await getBotResponse(message);
  const botResponse = jsonResponse?.choices[0]?.message?.content;
  if (botResponse && jsonResponse) {
    state.messages.push({
      role: 'assistant',
      content: botResponse,
    });
    createAndAppendMessage(botResponse, 'bot');
  }
}

// Save inputs to localStorage and refresh the page
function saveInputsAndRefresh() {
  state.apiKey = apiKeyInput.value;
  state.apiEndpoint = apiEndpointInput.value;
  state.systemRole = systemRoleInput.value;
  
  localStorage.setItem(LOCAL_STORAGE_KEYS.apiKey, state.apiKey);
  localStorage.setItem(LOCAL_STORAGE_KEYS.apiEndpoint, state.apiEndpoint);
  localStorage.setItem(LOCAL_STORAGE_KEYS.systemRole, state.systemRole);
  
  window.location.reload();
}

// Clear the chat history
function clearChatHistory() {
  chatHistory.innerHTML = '';
  state.messages = [{ role: 'system', content: state.systemRole }];
}

// Handle pressing Enter in the system role input
function handleSystemRoleEnter(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    localStorage.setItem(LOCAL_STORAGE_KEYS.systemRole, systemRoleInput.value);
    state.systemRole = systemRoleInput.value;
    state.messages[0].content = state.systemRole;
  }
}

// Initialize the app
init();

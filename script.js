const chatHistory = document.getElementById('chat-history');
const apiKeyInput = document.getElementById('api-key-input');
const apiEndpointInput = document.getElementById('api-endpoint-input');
const messageInput = document.getElementById('message-input');
const modelMenu = document.getElementById('model-menu');
const aiThinkingMsg = document.getElementById('ai-thinking');
const systemRoleInput = document.getElementById('system-role-input');
const codeBlockRegex = /```(.*?)```/gs;
const headingRegex = [
  /^#\s(.+)/gm,
  /^##\s(.+)/gm,
  /^###\s(.+)/gm,
  /^####\s(.+)/gm
];

const localStore = localStorage;

let apiKey = localStore.getItem('apiKey') || '';
let apiEndpoint = localStore.getItem('apiEndpoint') || 'https://free.churchless.tech/v1/chat/completions';
let selectedModel = localStore.getItem('selectedModel') || 'gpt-3.5-turbo';

let messages = [
  {
    role: 'system',
    content: localStore.getItem('systemRole') || '',
  },
];

apiKeyInput.value = apiKey;
apiEndpointInput.value = apiEndpoint;
selectModel(selectedModel);
updateModelHeading();

messageInput.addEventListener('input', handleInputChange);
messageInput.addEventListener('keydown', handleKeydownEvent);
document.getElementById('send-button').addEventListener('click', sendMessage);

function handleInputChange() {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${messageInput.scrollHeight}px`;
};

function handleKeydownEvent(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    messageInput.value += '\n';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
  }
}

function toggleModelMenu() {
  modelMenu.style.display = modelMenu.style.display === 'none' ? 'block' : 'none';
}

function selectModel(model) {
  modelOptions.forEach((option) => {
    const { classList } = option;
    classList.remove('selected');
    if(option.dataset.model == model) classList.add('selected');
  });

  selectedModel = model;
  localStore.setItem('selectedModel', selectedModel);

  toggleModelMenu();
  updateModelHeading();
}

function updateModelHeading() {
  const modelHeading = document.querySelector('h1');
  modelHeading.textContent = `Chat with ${selectedModel}`;
}

async function getBotResponse(message) {
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

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });

  aiThinkingMsg.style.display = 'none';

  return response.json();
}

async function sendMessage() {
  const message = messageInput.value.trim();

  if (!message) {
    alert('Please enter a message.');
    return;
  }

  localStore.setItem('apiKey', apiKey);
  localStore.setItem('apiEndpoint', apiEndpoint);

  createAndAppendMessage(message, 'user');
  messageInput.value = '';
  messageInput.style.height = 'auto';

  const jsonResponse = await getBotResponse(message);

  const botResponse = jsonResponse.choices[0].message.content;

  messages.push({
    role: 'assistant',
    content: botResponse,
  });

  createAndAppendMessage(botResponse, 'bot');
}

function saveInputsAndRefresh() {
  apiKey = apiKeyInput.value.trim();
  apiEndpoint = apiEndpointInput.value.trim();

  localStore.setItem('apiKey', apiKey);
  localStore.setItem('apiEndpoint', apiEndpoint);

  location.reload();
}

document.getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);

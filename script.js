const chatContainer = document.getElementById('chat-container');
const modelMenu = document.getElementById('model-menu');
const modelOptions = document.querySelectorAll('ul li');

const apiKeyInput = document.getElementById('api-key-input');
const apiEndpointInput = document.getElementById('api-endpoint-input');
const systemRoleInput = document.getElementById('system-role-input');

const copyButton = document.getElementById('copy-button');
const chatHistory = document.getElementById('chat-history');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

let selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';
let systemRole = localStorage.getItem('systemRole') || 'You are a helpful assistant.';

modelOptions.forEach(option => {
  option.addEventListener('click', () => selectModel(option.getAttribute('data-model')));
});

function toggleModelMenu() {
  modelMenu.style.display = modelMenu.style.display === 'none' ? 'block' : 'none';
}

function selectModel(model) {
  modelOptions.forEach(option => option.classList.remove('selected'));
  document.querySelector(`li[data-model="${model}"]`).classList.add('selected');
  selectedModel = model;
  localStorage.setItem('selectedModel', selectedModel);
  toggleModelMenu();
  updateModelHeading();
}

function updateModelHeading() {
  const modelHeading = document.querySelector('h1');
  modelHeading.textContent = `Chat with ${selectedModel}`;
}

function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

copyButton.addEventListener('click', () => {
  const latestResponse = chatHistory.lastElementChild.innerHTML;
  if (latestResponse) {
    copyToClipboard(latestResponse);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
});

systemRoleInput.value = systemRole;
systemRoleInput.addEventListener('input', () => {
  systemRole = systemRoleInput.value;
  localStorage.setItem('systemRole', systemRole);
  messages[0].content = systemRole;
});

messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${messageInput.scrollHeight}px`;
});

messageInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    messageInput.value += '\n';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
  }
});

sendButton.addEventListener('click', sendMessage);

const apiEndpoint = apiEndpointInput.value.trim() || 'https://api.openai.com/v1/chat/completions';
const MAX_TOKENS_BY_MODEL = {
  'gpt-3.5-turbo': 4096,
  'gpt-3.5-turbo-0613': 4096,
  'gpt-3.5-turbo-16k': 16384,
  'gpt-3.5-turbo-16k-0613': 16384,
  'gpt-4': 8192,
  'gpt-4-0613': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-32k-0613': 32768,
  'claude-2-100k': 102400,
  'llama-2-70b-chat': 4096,
};
const messages = [
  {
    role: 'system',
    content: systemRole
  }
];

function getTokenCount(text) {
  const words = text.trim().split(/\s+/);
  return words.length;
}

async function getBotResponse(apiKey, message) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const maxTokens = MAX_TOKENS_BY_MODEL[selectedModel] || 4096;
  let tokenCount = getTokenCount(messages[0].content);

  for (let i = 1; i < messages.length; i++) {
    const messageTokenCount = getTokenCount(messages[i].content);
    if (tokenCount + messageTokenCount > maxTokens) {
      messages.splice(i);
      break;
    }
    tokenCount += messageTokenCount;
  }

  messages.push({
    role: 'user',
    content: message,
  });

  const data = {
    model: selectedModel,
    messages: messages,
  };

  const requestOptions = {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  };

  const response = await fetch(apiEndpoint, requestOptions);
  messages.splice(messages.length - 1); // remove user message from messages
  return response.json();
}

function createAndAppendMessage(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);
  message.innerHTML = content;
  chatHistory.appendChild(message);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  MathJax.Hub.Queue(['Typeset', MathJax.Hub, message]);
}

async function sendMessage() {
  const apiKey = apiKeyInput.value.trim();
  const message = messageInput.value.trim();

  if (!apiKey || !message) {
    alert('Please enter your API key and a message.');
    return;
  }

  const jsonResponse = await getBotResponse(apiKey, message);
  const botResponse = jsonResponse.choices[0].message.content;

  messages.push({
    role: 'assistant',
    content: botResponse,
  });

  createAndAppendMessage(botResponse, 'bot');
}

window.addEventListener('load', updateModelHeading);

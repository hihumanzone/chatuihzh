let messages = [
  {
    role: 'system',
    content: localStorage.getItem('systemRole') || '',
  },
];

let apiKey = localStorage.getItem('apiKey') || '';
let apiEndpoint = localStorage.getItem('apiEndpoint') || '';
let selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';

document.getElementById('send-button').addEventListener('click', sendMessage);

function toggleModelMenu() {
  let modelMenu = document.getElementById('model-menu');
  modelMenu.style.display = modelMenu.style.display === 'none' ? 'block' : 'none';
}

function selectModel(model) {
  let modelHeading = document.querySelector('h1');
  let modelOptions = document.querySelectorAll('ul li');
  let selectedModelOption = document.querySelector(`ul li[data-model="${model}"]`);
  modelOptions.forEach((option) => option.classList.remove('selected'));

  if (selectedModelOption) {
    selectedModelOption.classList.add('selected');
  }

  selectedModel = model;
  localStorage.setItem('selectedModel', selectedModel);
  toggleModelMenu();
  modelHeading.textContent = `Chat with ${selectedModel}`;
}

const ENDPOINT = apiEndpoint || 'https://free.churchless.tech/v1/chat/completions';

async function getBotResponse(apiKey, apiEndpoint, message) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  let aiThinkingMsg = document.getElementById('ai-thinking');
  aiThinkingMsg.style.display = 'block';

  messages.push({
    role: 'user',
    content: message,
  });

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
  let chatHistory = document.getElementById('chat-history');
  let message = document.createElement('div');
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

async function sendMessage() {
  let apiKeyInput = document.getElementById('api-key-input');
  let apiEndpointInput = document.getElementById('api-endpoint-input');
  let messageInput = document.getElementById('message-input');

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

function clearChatHistory() {
  let chatHistory = document.getElementById('chat-history');
  chatHistory.innerHTML = '';
  messages = [
    {
      role: 'system',
      content: localStorage.getItem('systemRole') || '',
    },
  ];
}

document.getElementById('copy-button').addEventListener('click', () => {
  let chatHistory = document.getElementById('chat-history');
  const latestResponse = chatHistory.lastElementChild.innerHTML;
  if (latestResponse) {
    copyToClipboard(latestResponse);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
});

document.getElementById('refresh-button').addEventListener('click', function () {

  let apiKeyInput = document.getElementById('api-key-input');
  let apiEndpointInput = document.getElementById('api-endpoint-input');

  apiKey = apiKeyInput.value.trim();
  apiEndpoint = apiEndpointInput.value.trim();

  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiEndpoint', apiEndpoint);

  location.reload();

});

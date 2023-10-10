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
let latestMessageRawText = '';

apiKeyInput.value = apiKey;
apiEndpointInput.value = apiEndpoint;
selectModel(selectedModel);
updateModelHeading();

function createActions(messageElem) {
  const actionsDiv = document.createElement('div');
  const editBtn = document.createElement('button');
  const delBtn = document.createElement('button');
  
  editBtn.textContent = 'Edit';
  delBtn.textContent = 'Delete';
  editBtn.classList.add('action-btn', 'edit-btn');
  delBtn.classList.add('action-btn', 'delete-btn');
  actionsDiv.classList.add('message-actions');

  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(delBtn);
  messageElem.appendChild(actionsDiv);
}

async function createAndAppendMessage(content, owner, msgIndex) {
  const message = document.createElement('div');
  message.classList.add('message', owner);
  message.dataset.index = msgIndex;
  message.dataset.raw = content;

  latestMessageRawText = content;

  let displayedText = content;

  if (owner === 'bot') {
    if (displayedText.startsWith('>')) {
      message.style.backgroundColor = '#222';
      message.style.borderColor = '#555';
    }
  }

  const md = window.markdownit();
  displayedText = md.render(displayedText);
  message.innerHTML = displayedText;
  createActions(message);
  chatHistory.insertBefore(message, aiThinkingMsg);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  MathJax.Hub.Queue(['Typeset', MathJax.Hub, message]);
  addCopyButtonToCodeBlock();
}

async function sendMessage() {
  apiKey = apiKeyInput.value.trim();
  apiEndpoint = apiEndpointInput.value.trim();
  const message = messageInput.value.trim();
  const editingMsgIndex = localStorage.getItem('editingMsgIndex');

  if (!message) {
    alert('Please enter a message.');
    return;
  }

  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiEndpoint', apiEndpoint);

  const userMessage = {
    role: 'user',
    content: message,
  };

  if (editingMsgIndex !== null) {
    messages[editingMsgIndex] = userMessage;
    localStorage.removeItem('editingMsgIndex');
  } else {
    messages.push(userMessage);
  }

  messageInput.value = '';
  messageInput.style.height = 'auto';

  const jsonResponse = await getBotResponse(apiKey, apiEndpoint, message);
  
  const botResponse = jsonResponse.choices[0].message.content;
  messages.push({
    role: 'assistant',
    content: botResponse,
  });

  reloadChatHistory();
}

function clearChatHistory() {
  while (chatHistory.firstChild) {
    chatHistory.removeChild(chatHistory.firstChild);
  }

  messages = [
    {
      role: 'system',
      content: localStorage.getItem('systemRole') || '',
    },
  ];
}

function reloadChatHistory() {
  clearChatHistory();

  messages.forEach((message, index) => {
    if (message.role !== 'system') {
      createAndAppendMessage(message.content, message.role === 'assistant' ? 'bot' : 'user', index);
    }
  });
}

systemRoleInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    let caret = systemRoleInput.selectionStart;
    systemRoleInput.value = systemRoleInput.value.substring(0, caret) + '\n' + systemRoleInput.value.substring(caret);
    systemRoleInput.selectionEnd = caret + 1;
  }
  localStorage.setItem('systemRole', systemRoleInput.value);
  messages[0].content = systemRoleInput.value;
});

window.addEventListener('load', updateModelHeading);

function saveInputsAndRefresh() {
  apiKey = apiKeyInput.value.trim();
  apiEndpoint = apiEndpointInput.value.trim();

  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiEndpoint', apiEndpoint);

  location.reload();
}

document.addEventListener('click', (event) => {
  const target = event.target;
  const messageElement = target.parentElement.parentElement;

  if (target.classList.contains('edit-btn')) {
    const rawMessage = messageElement.dataset.raw;
    const msgIndex = messageElement.dataset.index;

    messageInput.value = rawMessage;

    localStorage.setItem('editingMsgIndex', msgIndex);
  } else if (target.classList.contains('delete-btn')) {
    messages.splice(messageElement.dataset.index, 1);
    messageElement.remove();
  }
});

document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);

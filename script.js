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

const apiKey = localStorage.getItem('apiKey') || '';
const apiEndpoint = localStorage.getItem('apiEndpoint') || '';
let selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';

apiKeyInput.value = apiKey;
apiEndpointInput.value = apiEndpoint;
selectModel(selectedModel);
updateModelHeading();

const ENDPOINT = apiEndpoint || 'https://free.churchless.tech/v1/chat/completions';
let latestMessageRawText = '';

document.addEventListener('click', handleCopyCodeButtonClick);
messageInput.addEventListener('input', handleChangeInInputHeight);
messageInput.addEventListener('keydown', handleNewlineInMessage);
document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('copy-button').addEventListener('click', () => copyTextToClipboard(latestMessageRawText));
document.getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);
systemRoleInput.addEventListener('input', handleSystemRoleChange);
window.addEventListener('load', updateModelHeading);

function handleCopyCodeButtonClick(event) {
  if (event.target.classList.contains('copy-code-button')) {
    const codeBlock = event.target.parentElement.querySelector('pre');
    if (codeBlock) {
      copyTextToClipboard(codeBlock.textContent);
    }
  }
}

function handleChangeInInputHeight() {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${messageInput.scrollHeight}px`;
}

function handleNewlineInMessage(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    insertNewLineInInputValue(event, messageInput);
  }
}

function insertNewLineInInputValue(event, inputElement) {
  event.preventDefault();
  const caret = inputElement.selectionStart;
  const text = inputElement.value;
  inputElement.value = `${text.substring(0, caret)}\n${text.substring(caret)}`;
  inputElement.selectionEnd = caret + 1;
  inputElement.style.height = `${inputElement.scrollHeight}px`;
}

async function getBotResponse(apiKey, apiEndpoint, message) {
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

function toggleModelMenu() {
  modelMenu.style.display = modelMenu.style.display === 'none' ? 'block' : 'none';
}

function updateModelHeading() {
  const modelHeading = document.querySelector('.class-h1');
  modelHeading.textContent = `Chat with ${selectedModel}`;
}

async function sendMessage() {
  const apiKey = apiKeyInput.value.trim();
  const apiEndpoint = apiEndpointInput.value.trim();
  const message = messageInput.value.trim();

  if (!message) {
    alert('Please enter a message.');
    return;
  }

  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiEndpoint', apiEndpoint);

  appendUserMessage(message);
  messageInput.value = '';

  const botResponse = await getBotResponse(apiKey, apiEndpoint, message);
  appendBotMessage(botResponse);
}

function appendUserMessage(message) {
  messages.push({
    role: 'user',
    content: message,
  });

  const messageElement = createMessageElement(message, 'user');
  chatHistory.appendChild(messageElement);
  scrollToBottom();
}

function appendBotMessage(message) {
  const botResponse = message.choices[0].message.content;
  messages.push({
    role: 'assistant',
    content: botResponse,
  });

  const messageElement = createMessageElement(botResponse, 'bot');
  chatHistory.appendChild(messageElement);
  scrollToBottom();
  latestMessageRawText = botResponse;
}

function createMessageElement(content, owner) {
  const message = document.createElement('div');
  message.classList.add('message', owner);
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
  const parsedContent = md.render(displayedText);
  message.innerHTML = parsedContent;

  addCopyButtonToCodeBlock(message);
  MathJax.Hub.Queue(['Typeset', MathJax.Hub, message]);

  return message;
}

function addCopyButtonToCodeBlock(message) {
  const codeBlocks = message.getElementsByTagName('pre');
  if (codeBlocks.length > 0) {
    const copyButton = document.createElement('button');
    copyButton.classList.add('copy-code-button');
    copyButton.textContent = 'Copy Code';
    copyButton.addEventListener('click', () => {
      copyTextToClipboard(message.dataset.raw);
    });
    message.appendChild(copyButton);
  }
}

function copyTextToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function scrollToBottom() {
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function handleSystemRoleChange() {
  const role = systemRoleInput.value;
  localStorage.setItem('systemRole', role);
  messages[0].content = role;
}

function saveInputsAndRefresh() {
  const apiKey = apiKeyInput.value.trim();
  const apiEndpoint = apiEndpointInput.value.trim();

  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiEndpoint', apiEndpoint);

  location.reload();
}

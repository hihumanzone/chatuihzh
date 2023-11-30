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
       ['\(', '\)'],
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
 deleteButton.

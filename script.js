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

apiKeyInput.value = apiKey;
apiEndpointInput.value = apiEndpoint;
selectModel(selectedModel);
updateModelHeading();

document.addEventListener('click', function(event) {
    const target = event.target;
    if (target.classList.contains('copy-code-button')) {
        const codeBlock = target.parentElement.querySelector('pre');
        if (codeBlock) {
            copyToClipboard(codeBlock.textContent);
        }
    }
});

messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
});

messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        let caret = messageInput.selectionStart;
        messageInput.value = messageInput.value.substring(0, caret) + '\n' + messageInput.value.substring(caret);
        messageInput.selectionEnd = caret + 1;
        messageInput.style.height = `${messageInput.scrollHeight}px`;
    }
});

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

function updateModelHeading() {
    const modelHeading = document.querySelector('.class-h1');
    modelHeading.textContent = `Chat with ${selectedModel}`;
}

const ENDPOINT = apiEndpoint || 'https://free.churchless.tech/v1/chat/completions';

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

let latestMessageRawText = '';

async function createAndAppendMessage(content, owner) {
    const message = document.createElement('div');
    const deleteButton = document.createElement('button');
    const editButton = document.createElement('button');
    message.classList.add('message', owner);
    message.dataset.raw = content;
    latestMessageRawText = content;
    let displayedText = content;
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deleteMessage(message, owner));
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => editMessage(message, owner));
    const md = window.markdownit();
    displayedText = md.render(displayedText);
    message.innerHTML = displayedText;
    message.append(deleteButton);
    message.append(editButton);
    message.append(copyButton);
    chatHistory.insertBefore(message, aiThinkingMsg);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    addCopyButtonToCodeBlock();
}

function deleteMessage(messageElement, role) {
    let roleKey = role === "user" ? "user" : "assistant";
    const content = messageElement.dataset.raw;
    const index = messages.findIndex(msg => msg.role === roleKey && msg.content === content);
    if (index > -1) {
        messages.splice(index, 1);
        messageElement.remove();
    }
}

function editMessage(messageElement, role) {
    let roleKey = role === "user" ? "user" : "assistant";
    const content = messageElement.dataset.raw;
    let newContent = prompt("Edit your message:", content);
    if (newContent !== null) {
        const index = messages.findIndex(msg => msg.role === roleKey && msg.content === content);
        if (index !== -1) {
            messages[index].content = newContent;
            messageElement.dataset.raw = newContent;
            messageElement.childNodes[0].textContent = newContent;
        }
    }
}

function copyMessage(content) {
  const textarea = document.createElement('textarea');
  textarea.value = content;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  alert('Message copied to clipboard');
}

async function sendMessage() {
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

function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

document.getElementById('copy-button').addEventListener('click', () => {
  if (latestMessageRawText) {
    copyToClipboard(latestMessageRawText);
    alert('Text copied to clipboard');
  } else {
    alert('No text to copy');
  }
});

function addCopyButtonToCodeBlock(){
  const allCodeBlocks = document.querySelectorAll('pre');
  allCodeBlocks.forEach((block) => {
      const copyButton = document.createElement('button');
      const parentDiv = document.createElement('div');
      copyButton.classList.add('copy-code-button');
      copyButton.textContent = 'Copy Code';
      const dupBlock = block.cloneNode(true);
      block.replaceWith(parentDiv);
      parentDiv.appendChild(dupBlock);
      parentDiv.appendChild(copyButton);
  });
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

document.getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);

class ChatBotUI {
  constructor() {
    this.initializeUIElements();
    this.initializeEventListeners();
    this.initializeChatHistory();
  }

  initializeUIElements() {
    this.chatHistory = document.getElementById('chat-history');
    this.apiKeyInput = document.getElementById('api-key-input');
    this.apiEndpointInput = document.getElementById('api-endpoint-input');
    this.messageInput = document.getElementById('message-input');
    this.modelMenu = document.getElementById('model-menu');
    this.aiThinkingMsg = document.getElementById('ai-thinking');
    this.systemRoleInput = document.getElementById('system-role-input');

    this.apiKey = localStorage.getItem('apiKey') || '';
    this.apiEndpoint = localStorage.getItem('apiEndpoint') || '';
    this.selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';
    this.systemRole = localStorage.getItem('systemRole') || '';

    this.messages = [
      {
        role: 'system',
        content: this.systemRole,
      },
    ];

    this.lastBotMessageElement = null;

    this.apiKeyInput.value = this.apiKey;
    this.apiEndpointInput.value = this.apiEndpoint;
    this.systemRoleInput.value = this.systemRole;
    this.selectModel(this.selectedModel);
  }

  initializeEventListeners() {
    document.getElementById('send-button').addEventListener('click', () => this.sendMessage());

    this.messageInput.addEventListener('input', () => {
      this.messageInput.style.height = 'auto';
      this.messageInput.style.height = `${this.messageInput.scrollHeight}px`;
    });

    this.systemRoleInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.updateSystemRole();
      }
    });

    document.addEventListener('click', (event) => this.handleGlobalClicks(event));
  }

  initializeChatHistory() {
    // Implement logic to load and display buffered chat messages
    // if needed.
  }

  handleGlobalClicks(event) {
    const target = event.target;

    if (target.id === 'settings') {
      this.toggleModelMenu();
    } else if (target.tagName === 'DIV' && target.parentElement.id === 'model-list') {
      const model = target.dataset.model;
      this.selectModel(model);
    } else if (target.id === 'clear-button') {
      this.clearChatHistory();
    } else if (target.id === 'refresh-button') {
      this.saveInputsAndRefresh();
    }
  }

  toggleModelMenu() {
    this.modelMenu.style.display = this.modelMenu.style.display === 'none' ? 'block' : 'none';
  }

  selectModel(model) {
    const modelOptions = this.modelMenu.querySelectorAll('div');
    modelOptions.forEach((option) => option.classList.remove('selected'));

    const selectedModelOption = this.modelMenu.querySelector(`div[data-model="${model}"]`);
    if (selectedModelOption) {
      selectedModelOption.classList.add('selected');
    }

    this.selectedModel = model;
    localStorage.setItem('selectedModel', this.selectedModel);
    this.toggleModelMenu();
  }

  async getBotResponse(message) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    this.messages.push({
      role: 'user',
      content: message,
    });

    this.aiThinkingMsg.style.display = 'flex';

    const endpoint = this.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    const data = {
      model: this.selectedModel,
      messages: this.messages,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    });

    this.aiThinkingMsg.style.display = 'none';

    return response.json();
  }

  createAndAppendMessage(content, owner) {
    const message = document.createElement('div');
    message.classList.add('message', owner);
    message.dataset.raw = content;

    const messageText = document.createElement('div');
    messageText.classList.add('message-text');
    messageText.innerHTML = this.markdownToHTML(content);
    message.appendChild(messageText);

    const actionButtons = this.createActionButtons(content, owner);
    message.appendChild(actionButtons);

    this.chatHistory.insertBefore(message, this.aiThinkingMsg);
    this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    this.typesetMath(messageText);

    if (owner === 'bot') {
      this.lastBotMessageElement = message;
    }
  }

  createActionButtons(content, owner) {
    const actionButtons = document.createElement('div');
    actionButtons.classList.add('action-buttons');

    const copyButton = this.createButton('Copy', 'copy', () => this.copyToClipboard(content));
    const deleteButton = this.createButton('Delete', 'delete', () => this.deleteMessage(actionButtons.parentNode, content));

    actionButtons.appendChild(copyButton);
    actionButtons.appendChild(deleteButton);

    if (owner === 'bot') {
      const regenButton = this.createButton('Regen', 'regen', () => this.regenerateMessage(actionButtons.parentNode));
      actionButtons.appendChild(regenButton);
      this.removeRegenButton(this.lastBotMessageElement);
    }

    return actionButtons;
  }

  createButton(text, classNameSuffix, clickHandler) {
    const button = document.createElement('button');
    button.textContent = text;
    button.classList.add(`action-button-${classNameSuffix}`);
    button.addEventListener('click', clickHandler);
    return button;
  }

  removeRegenButton(elem) {
    if (elem) {
      const regenButton = elem.querySelector('.action-button-regen');
      if (regenButton) {
        regenButton.remove();
      }
    }
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Text copied to clipboard');
    }, (err) => {
      console.error('Failed to copy text: ', err);
    });
  }

  clearChatHistory() {
    Array.from(this.chatHistory.getElementsByClassName('message')).forEach((message) => {
      this.chatHistory.removeChild(message);
    });

    this.messages = [{
      role: 'system',
      content: this.systemRole,
    }];
  }

  saveInputsAndRefresh() {
    this.apiKey = this.apiKeyInput.value.trim();
    this.apiEndpoint = this.apiEndpointInput.value.trim();
    this.systemRole = this.systemRoleInput.value.trim();

    localStorage.setItem('apiKey', this.apiKey);
    localStorage.setItem('apiEndpoint', this.apiEndpoint);
    localStorage.setItem('systemRole', this.systemRole);

    location.reload();
  }

  updateSystemRole() {
    this.systemRole = this.systemRoleInput.value.trim();
    localStorage.setItem('systemRole', this.systemRole);
    this.messages[0].content = this.systemRole;
  }

  markdownToHTML(markdownContent) {
    const md = window.markdownit();
    return md.render(markdownContent);
  }

  typesetMath(element) {
    if (window.MathJax) {
      window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub, element]);
    }
  }

  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message) {
      alert('Please enter a message.');
      return;
    }

    this.apiKey = this.apiKeyInput.value.trim();
    this.apiEndpoint = this.apiEndpointInput.value.trim();
    localStorage.setItem('apiKey', this.apiKey);
    localStorage.setItem('apiEndpoint', this.apiEndpoint);

    this.createAndAppendMessage(message, 'user');
    this.messageInput.value = '';
    this.messageInput.style.height = 'auto';

    const jsonResponse = await this.getBotResponse(message);
    const botResponse = jsonResponse.choices[0].message.content;
    this.messages.push({
      role: 'assistant',
      content: botResponse,
    });
    this.createAndAppendMessage(botResponse, 'bot');
  }

  async regenerateMessage(messageElement) {
    const messageIndex = this.messages.findIndex((msg) => msg.content === messageElement.dataset.raw && msg.role === 'bot');
    if (messageIndex !== -1) {
      this.messages.splice(messageIndex, 1);
    }
    this.chatHistory.removeChild(messageElement);
    if (this.messages.length > 0) {
      const userMessage = this.messages[this.messages.length - 1].content;
      const jsonResponse = await this.getBotResponse(userMessage);
      const botResponse = jsonResponse.choices[0].message.content;
      this.messages.push({
        role: 'assistant',
        content: botResponse,
      });
      this.createAndAppendMessage(botResponse, 'bot');
    }
  }

  deleteMessage(messageElement, content) {
    this.chatHistory.removeChild(messageElement);
    this.messages = this.messages.filter((msg) => msg.content !== content);
    if (this.lastBotMessageElement === messageElement) {
      const botMessages = Array.from(this.chatHistory.getElementsByClassName('bot'));
      const lastBotMessage = botMessages.pop();
      if (lastBotMessage) {
        this.addRegenerateButton(lastBotMessage);
        this.lastBotMessageElement = lastBotMessage;
      } else {
        this.lastBotMessageElement = null;
      }
    }
  }

  addRegenerateButton(messageElement) {
    const regenButtonExist = messageElement.querySelector('.action-button-regen');
    if (!regenButtonExist) {
      const regenButton = this.createButton('Regen', 'regen', () => this.regenerateMessage(messageElement));
      const actionButtons = messageElement.querySelector('.action-buttons');
      actionButtons.appendChild(regenButton);
    }
  }
}

// Initialization call to start the chat UI
new ChatBotUI();

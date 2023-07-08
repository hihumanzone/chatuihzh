class ChatApp {
  constructor() {
    this.chatHistory = document.getElementById('chat-history');
    this.apiKeyInput = document.getElementById('api-key-input');
    this.apiEndpointInput = document.getElementById('api-endpoint-input');
    this.messageInput = document.getElementById('message-input');
    this.modelMenu = document.getElementById('model-menu');
    this.aiThinkingMsg = document.getElementById('ai-thinking');
    this.systemRoleInput = document.getElementById('system-role-input');
    this.selectedModel = 'gpt-3.5-turbo';
    this.messages = [
      {
        role: 'system',
        content: localStorage.getItem('systemRole') || 'You are a helpful assistant.',
      },
    ];
  }

  init() {
    this.loadApiDetails();
    this.loadSelectedModel();
    this.updateModelHeading();
    this.addEventListeners();
  }

  loadApiDetails() {
    const apiKey = localStorage.getItem('apiKey');
    const apiEndpoint = localStorage.getItem('apiEndpoint');

    this.apiKeyInput.value = apiKey || '';
    this.apiEndpointInput.value = apiEndpoint || '';
  }

  loadSelectedModel() {
    const selectedModel = localStorage.getItem('selectedModel');

    if (selectedModel) {
      this.selectedModel = selectedModel;
      const modelOption = document.querySelector(`ul li[data-model="${selectedModel}"]`);

      if (modelOption) {
        modelOption.classList.add('selected');
      }
    }
  }

  addEventListeners() {
    this.messageInput.addEventListener('input', () => {
      this.messageInput.style.height = 'auto';
      this.messageInput.style.height = `${this.messageInput.scrollHeight}px`;
    });

    this.messageInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.sendMessage();
      }
    });

    document.getElementById('send-button').addEventListener('click', () => {
      this.sendMessage();
    });

    document.getElementById('copy-button').addEventListener('click', () => {
      const latestResponse = this.chatHistory.lastElementChild.innerHTML;
      if (latestResponse) {
        this.copyToClipboard(latestResponse);
        alert('Text copied to clipboard');
      } else {
        alert('No text to copy');
      }
    });

    this.systemRoleInput.addEventListener('input', () => {
      localStorage.setItem('systemRole', this.systemRoleInput.value);
      this.messages[0].content = this.systemRoleInput.value;
    });

    window.addEventListener('load', () => {
      this.updateModelHeading();
    });
  }

  async getBotResponse(message) {
    const ENDPOINT = this.apiEndpointInput.value || 'https://chimeragpt.adventblocks.cc/v1/chat/completions';
    const apiKey = this.apiKeyInput.value;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    const maxTokens = this.getMaxTokens();

    let tokenCount = this.getTokenCount(this.messages[0].content);
    for (let i = 1; i < this.messages.length; i++) {
      const messageTokenCount = this.getTokenCount(this.messages[i].content);
      if (tokenCount + messageTokenCount > maxTokens) {
        this.messages.splice(1, i - 1);
        break;
      }
      tokenCount += messageTokenCount;
    }

    this.messages.push({
      role: 'user',
      content: message,
    });

    this.aiThinkingMsg.style.display = 'block';

    const data = {
      model: this.selectedModel,
      messages: this.messages,
    };

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response.');
      }

      const jsonResponse = await response.json();
      const botResponse = jsonResponse.choices[0].message.content;

      this.messages.push({
        role: 'assistant',
        content: botResponse,
      });

      this.createAndAppendMessage(botResponse, 'bot');
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while fetching the bot response.');
    } finally {
      this.aiThinkingMsg.style.display = 'none';
    }
  }

  getTokenCount(text) {
    const words = text.trim().split(/\s+/);
    return words.length;
  }

  getMaxTokens() {
    switch (this.selectedModel) {
      case 'gpt-3.5-turbo':
        return 4096;
      case 'gpt-4-poe':
        return 2100;
      case 'gpt-3.5-turbo-16k':
        return 16384;
      case 'gpt-3.5-turbo-0613':
        return 4096;
      case 'gpt-4-0613':
      case 'gpt-4':
        return 8192;
      case 'claude+':
      case 'claude-instant':
      case 'claude-instant-100k':
        return 10240;
      default:
        return 4096;
    }
  }

  async sendMessage() {
    const apiKey = this.apiKeyInput.value.trim();
    const message = this.messageInput.value.trim();

    if (!apiKey || !message) {
      alert('Please enter your API key and a message.');
      return;
    }

    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('apiEndpoint', this.apiEndpointInput.value);

    this.createAndAppendMessage(message, 'user');
    this.messageInput.value = '';
    this.messageInput.style.height = 'auto';

    await this.getBotResponse(message);
  }

  copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  createAndAppendMessage(content, owner) {
    const message = document.createElement('div');
    message.classList.add('message', owner);

    let displayedText = content;

    const parsedContent = this.parseResponse(displayedText);
    message.innerHTML = parsedContent;

    this.chatHistory.appendChild(message);
    this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
  }

  parseResponse(response) {
    let parsedResponse = response;

    parsedResponse = parsedResponse.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    parsedResponse = parsedResponse.replace(/\$\$(.*?)\$\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
    parsedResponse = parsedResponse.replace(/\$(.*?)\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
    parsedResponse = this.parseTables(parsedResponse);

    return parsedResponse;
  }

  parseTables(response) {
    const tableRegex = /\n((?:\s*\|.*\|\n)+)\n/g;
    return response.replace(tableRegex, this.createTable);
  }

  createTable(match, table) {
    const rows = table.trim().split('\n');
    const tableElement = document.createElement('table');

    const tableHeader = document.createElement('tr');
    const tableHeaderCells = rows[0].split('|').slice(1, -1);
    tableHeaderCells.forEach((cell) => {
      const th = document.createElement('th');
      th.classList.add('table-header');
      th.textContent = cell.trim();
      tableHeader.appendChild(th);
    });
    tableElement.appendChild(tableHeader);

    for (let i = 2; i < rows.length; i++) {
      const row = document.createElement('tr');
      const tableCells = rows[i].split('|').slice(1, -1);
      tableCells.forEach((cell) => {
        const td = document.createElement('td');
        td.classList.add('table-data');
        td.innerHTML = this.parseResponse(cell.trim());
        row.appendChild(td);
      });
      tableElement.appendChild(row);
    }

    return tableElement.outerHTML;
  }

  toggleModelMenu() {
    this.modelMenu.style.display = this.modelMenu.style.display === 'none' ? 'block' : 'none';
  }

  selectModel(model) {
    const modelOptions = document.querySelectorAll('ul li');
    modelOptions.forEach((option) => option.classList.remove('selected'));

    const selectedModelOption = document.querySelector(`ul li[data-model="${model}"]`);
    if (selectedModelOption) {
      selectedModelOption.classList.add('selected');
    }

    this.selectedModel = model;
    localStorage.setItem('selectedModel', this.selectedModel);

    this.toggleModelMenu();
    this.updateModelHeading();
  }

  updateModelHeading() {
    const modelHeading = document.querySelector('h1');
    modelHeading.textContent = `Chat with ${this.selectedModel}`;
  }
}

const chatApp = new ChatApp();
chatApp.init();

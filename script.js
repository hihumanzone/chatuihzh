let initialState = {
    apiKey: localStorage.getItem('apiKey'),
    apiEndpoint: localStorage.getItem('apiEndpoint'),
    selectedModel: localStorage.getItem('selectedModel') || 'gpt-3.5-turbo',
    systemRole: localStorage.getItem('systemRole') || '',
    modelHeading: document.getElementById('model-heading')
};

const endpoint = apiEndpointInput.value || 'https://free.churchless.tech/v1/chat/completions';
const re = {
    codeBlock: /```[\s\S]*?```/gs,
    inlineCodeBlock: /`(.*?)`/gs,
    heading: [/^#\s(.+)/gm, /^##\s(.+)/gm, /^###\s(.+)/gm, /^####\s(.+)/gm]
};

document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('message-input');
    messageInput.addEventListener('keypress', resizeInput, false);
    messageInput.addEventListener('keydown', (e) => (e.key === 'Enter' && !e.shiftKey) && resizeInput.call(this), false);
});

const chatMessage = {
    sendMessage: async (event) => {
        event.preventDefault();
        let content = messageInput.value.trim();
        createAndAppendMessage(content, 'user');
        messageInput.value = '';
        resizeInput.call(messageInput);
    },
    createAndAppendMessage: async (content, owner) => {
        const message = document.createElement('div');
        message.classList.add('message', owner);
        let displayedText = owner === 'bot' ? content.replace(/</g, "<").replace(/>/g, ">") : content;
        displayedText = owner === 'bot' ? extractCodeBlocks(displayedText) : displayedText;
        message.innerHTML = parseResponse(displayedText);
        chatHistory.appendChild(message);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    },
    resizeInput: () => {
        this.style.height = `${this.scrollHeight}px`;
    }
};

const modelMenu = {
    selectModel: (model) => {
        const options = document.querySelectorAll('ul li');
        options.forEach(option => option.classList.remove('selected'));
        const chosenOption = Array.from(options).find(option => option.dataset.model === model);
        toggleMenuHandler(chosenOption);
    },
    toggleModelMenu: () => { modelMenu.style.display = toggleDisplay(modelMenu.style.display); },
    toggleMenuHandler: async (option) => {
        option.classList.add('selected');
        localStorage.setItem('selectedModel', initialState.selectedModel);
        modelMenu.style.display = toggleDisplay(modelMenu.style.display);
        updateHeader();
    },
    updateHeader: () => { initialState.modelHeading.textContent = `Chat with ${initialState.selectedModel}`; }
};

function replaceCodeBlocks(response, codeBlocks, name) {
    return codeBlocks.reduce((res, c, i) => res.replace(c, `${name}${i}`), response);
}

function parseResponse(response) {
    let parsedResponse = response;
    const codeBlocks = parsedResponse.match(codeBlockRegex) || [];
    const inlineCodeBlocks = parsedResponse.match(inlineCodeBlockRegex) || [];

    const pairRegex = {
        "\\*\\*(.*?)\\*\\*": "<b>$1</b>",
        "\\$\\$(.*?)\\$\\$": '<span class="mathjax-latex">\\($1\\)</span>',
        "\\$(.*?)\\$": '<span class="mathjax-latex">\\($1\\)</span>',
        "^>\\s(.*?)$": '<div class="blockquote">$1</div>',
        "\\*(.*?)\\*": '<i>$1</i>',
    };

    parsedResponse = replaceCodeBlocks(parsedResponse, codeBlocks, 'CODEBLOCK');
    parsedResponse = replaceCodeBlocks(parsedResponse, inlineCodeBlocks, 'INLINECODEBLOCK');

    Object.entries(pairRegex).forEach(([key, value]) => parsedResponse = parsedResponse.replace(new RegExp(key, 'gm'), value));

    parsedResponse = parseTables(parsedResponse);

    headingRegex.forEach((regex, index) => {
        const style = `font-size: ${30 - index * 4}px; font-weight: ${index === 0 ? 'bold' : 'normal'};`;
        parsedResponse = parsedResponse.replace(regex, `<span style="${style}">$1</span>`);
    });

    parsedResponse = replaceCodeBlocks(parsedResponse, codeBlocks, 'CODEBLOCK', createCodeBlockUI);
    parsedResponse = replaceCodeBlocks(parsedResponse, inlineCodeBlocks, 'INLINECODEBLOCK', createInlineCodeBlockUI);

    return parsedResponse;
}

function parseTables(response) {
    const tableRegex = /\n((?:\s*:?[\|:].*?:?\|\n)+)\n/g;
    return response.replace(tableRegex, createTable);
}

function createTable(match, table) {
    const rows = table.trim().split('\n');
    const tableHtml = ['<table>'];

    const createCell = (tag, cellValue) => `<${tag} class='table-${tag === "th" ? "header" : "data"}'>${parseResponse(cellValue.trim())}</${tag}>`;

    const headerCells = rows[0].split('|').slice(1, -1);
    const tableHeader = `<tr>${headerCells.map(cell => createCell("th", cell)).join('')}</tr>`;
    tableHtml.push(tableHeader);

    for (let i = 2; i < rows.length; i++) {
        const row = `<tr>${rows[i].split('|').slice(1, -1).map(cell => createCell("td", cell)).join('')}</tr>`;
        tableHtml.push(row);
    }

    tableHtml.push('</table>');

    return `\n${tableHtml.join('')}\n`;
}

const LocalStorageService = {
    get: (key, defaultValue = '') => localStorage.getItem(key) || defaultValue,

    set: (key, value) => localStorage.setItem(key, value),
};

async function sendMessage() {
    const [apiKey, apiEndpoint, message] = ['apiKey', 'apiEndpoint', 'message'].map(id => document.getElementById(id).value.trim());

    if (!message) {
        return alert('Please enter a message.');
    }

    ['apiKey', 'apiEndpoint'].forEach(key => LocalStorageService.set(key, eval(key)));

    createAndAppendMessage(message, 'user');
    document.getElementById('message').value = '';

    const jsonResponse = await getBotResponse(apiKey, apiEndpoint, message);
    const botResponse = jsonResponse.choices[0].message.content;

    messages.push({ role: 'assistant', content: botResponse });
    createAndAppendMessage(botResponse, 'bot');
}

document.getElementById('copy-button').addEventListener('click', () => {
    const latestResponse = chatHistory.lastElementChild?.innerHTML;

    if (latestResponse) {
        navigator.clipboard.writeText(latestResponse)
            .then(() => alert('Text copied to clipboard'))
            .catch(() => alert('Failed to copy text to clipboard'));
    } else {
        alert('No text to copy');
    }
});

document.getElementById('systemRole').addEventListener('input', ({ target: { value } }) => {
    LocalStorageService.set('systemRole', value);
    messages[0].content = value;
});

window.addEventListener('load', updateModelHeading);

const saveInputsAndRefresh = () => {
    ['apiKey', 'apiEndpoint'].forEach(key => LocalStorageService.set(key, document.getElementById(key).value.trim()));

    location.reload();
}

document.getElementById('refresh-button').addEventListener('click', saveInputsAndRefresh);

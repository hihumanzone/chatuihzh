const chatApp = (() => {
    const dom = {
        chatHistory: document.getElementById('chat-history'),
        apiKeyInput: document.getElementById('api-key-input'),
        apiEndpointInput: document.getElementById('api-endpoint-input'),
        messageInput: document.getElementById('message-input'),
        modelMenu: document.getElementById('model-menu'),
        aiThinkingMsg: document.getElementById('ai-thinking'),
        systemRoleInput: document.getElementById('system-role-input'),
        sendButton: document.getElementById('send-button'),
        copyButton: document.getElementById('copy-button'),
        refreshButton: document.getElementById('refresh-button'),
        menuOptions: document.querySelectorAll('ul li'),
        modelHeading: document.querySelector('h1'),
    };

    const state = {
        apiKey: localStorage.getItem('apiKey') || '',
        apiEndpoint: localStorage.getItem('apiEndpoint') || '',
        selectedModel: localStorage.getItem('selectedModel') || 'gpt-3.5-turbo',
        systemRole: localStorage.getItem('systemRole') || '',
        messages: [{ role: 'system', content: localStorage.getItem('systemRole') || '', }],
    };

    const setLocalStorage = ({ key, value }) => localStorage.setItem(key, value);
    const toggleDisplay = element => element.style.display = element.style.display === 'none' ? 'block' : 'none';
    const createAndPopulateElement = ({ elementType, classes, content, attrs }) => {
        const element = document.createElement(elementType);
        classes.forEach(c => element.classList.add(c));
        element.innerHTML = content;
        for (const attr in attrs) { element.setAttribute(attr, attrs[attr]) }
        return element;
    };

    const setupEventListeners = () => {
        const handleInput = (event, element) => {
            event.preventDefault();
            element.value += '\n';
            element.style.height = `${element.scrollHeight}px`;
        };

        dom.messageInput.addEventListener('input', () => handleInput(event, dom.messageInput));
        dom.messageInput.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.shiftKey) handleInput(event, dom.messageInput);
        });

        dom.sendButton.addEventListener('click', sendMessage);
        dom.copyButton.addEventListener('click', copyLatestResponseToClipboard);
        dom.systemRoleInput.addEventListener('input', () => {
            setLocalStorage({ key: 'systemRole', value: dom.systemRoleInput.value });
            state.messages[0].content = dom.systemRoleInput.value;
        });

        dom.refreshButton.addEventListener('click', () => {
            setLocalStorage({ key: 'apiKey', value: dom.apiKeyInput.value.trim() });
            setLocalStorage({ key: 'apiEndpoint', value: dom.apiEndpointInput.value.trim() });
            location.reload();
        });
    };

    function selectModel(model) {
        dom.menuOptions.forEach((option) => option.classList.remove('selected'));
        const selectedModelOption = document.querySelector(`ul li[data-model="${model}"]`);
        if (selectedModelOption) { selectedModelOption.classList.add('selected') }
        state.selectedModel = model;
        setLocalStorage({ key: 'selectedModel', value: state.selectedModel });
        toggleDisplay(dom.modelMenu);
        updateModelHeading();
    }

    function updateModelHeading() {
        dom.modelHeading.textContent = `Chat with ${state.selectedModel}`;
    }

    async function getBotResponse(apiKey, apiEndpoint, message) {
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, };
        state.messages.push({ role: 'user', content: message });

        toggleDisplay(dom.aiThinkingMsg);
        const response = await fetch(apiEndpoint || 'https://free.churchless.tech/v1/chat/completions', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ model: state.selectedModel, messages: state.messages }),
        });
        toggleDisplay(dom.aiThinkingMsg);
        return response.json();
    }

    async function createAndAppendMessage(content, owner) {
        const message = createAndPopulateElement({
            elementType: 'div',
            classes: ['message', owner],
            content: parseResponse(content),
            attrs: owner === 'bot' && content.startsWith('>') ? { style: 'background-color:#222;border-color:#555' } : {}
        });
        dom.chatHistory.appendChild(message);
        dom.chatHistory.scrollTop = dom.chatHistory.scrollHeight;
        MathJax.Hub.Queue(['Typeset', MathJax.Hub, message]);
    }

    const parseResponse = (response) => {
        function parseSubResponse(regex, string, outerElement, innerElement) {
            return string.replace(regex, match => {
                return `<${outerElement} class="mathjax-latex">${innerElement}${match.slice(1, -1)}${innerElement}</${outerElement}>`
            });
        }
        return parseTables(parseSubResponse(/\$(.*?)\$/g, parseSubResponse(/\$\$(.*?)\$\$/g, response, 'span', '\\($1\\)'), 'span', '\\($1\\)'));
    }

    function parseTables(string) {
        return string.replace(/\n((?:\s*:?[\|:].*?:?\|\n)+)\n/g, function(match, table) {
            const rows = table.trim().split('\n');
            const tableElement = createAndPopulateElement({ elementType: 'table', classes: [], content: '' });

            const tableHeaderCells = rows[0].split('|').slice(1, -1);
            const tableHeader = createAndPopulateElement({ elementType: 'tr', classes: [], content: '' });
            tableHeaderCells.forEach(cell => tableHeader.appendChild(
                createAndPopulateElement({
                    elementType: 'th',
                    classes: ['table-header'],
                    content: cell.trim()
                })
            ));
            tableElement.appendChild(tableHeader);

            for (let i = 2; i < rows.length; i++) {
                const row = createAndPopulateElement({ elementType: 'tr', classes: [], content: '' });
                const tableCells = rows[i].split('|').slice(1, -1);
                tableCells.forEach(cell => row.appendChild(
                    createAndPopulateElement({
                        elementType: 'td',
                        classes: ['table-data'],
                        content: parseResponse(cell.trim())
                    })
                ));
                tableElement.appendChild(row);
            }

            return `\n${tableElement.outerHTML}\n`;
        });
    }

    async function sendMessage() {
        const message = dom.messageInput.value.trim();
        if (!message) { return alert('Please enter a message.') }
        setLocalStorage({ key: 'apiKey', value: state.apiKey });
        setLocalStorage({ key: 'apiEndpoint', value: state.apiEndpoint });
        createAndAppendMessage(message, 'user');
        dom.messageInput.value = '';
        dom.messageInput.style.height = 'auto';
        const jsonResponse = await getBotResponse(state.apiKey, state.apiEndpoint, message);
        const botResponse = jsonResponse.choices[0].message.content;
        state.messages.push({ role: 'assistant', content: botResponse });
        createAndAppendMessage(botResponse, 'bot');
    }

    function copyLatestResponseToClipboard() {
        const latestResponse = dom.chatHistory.lastElementChild.innerHTML;
        if (latestResponse) {
            document.execCommand('copy', false, latestResponse);
            alert('Text copied to clipboard');
        } else {
            alert('No text to copy');
        }
    }

    return {
        init: () => {
            dom.apiKeyInput.value = state.apiKey;
            dom.apiEndpointInput.value = state.apiEndpoint;
            dom.systemRoleInput.value = state.systemRole;
            selectModel(state.selectedModel);
            setupEventListeners();
            window.addEventListener('load', updateModelHeading);
        }
    };

})();

chatApp.init();

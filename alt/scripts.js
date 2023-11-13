const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-btn');
const apiEndpointInput = document.getElementById('api-endpoint');
const apiKeyInput = document.getElementById('api-key');

sendButton.addEventListener('click', async () => {
    const message = userInput.value.trim();
    const apiEndpoint = apiEndpointInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if(!message || !apiEndpoint || !apiKey) {
        alert('Please fill all fields.');
        return;
    }

    appendMessage('You', message);
    userInput.value = '';

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{"role": "user", "content": message}]
            })
        });
  
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {
            const data = await response.json();
            const botMessage = data.choices[0].message.content.trim();
            appendMessage('Assistant', botMessage);
        }
    } catch (error) {
        console.error('Fetching the OpenAI response failed', error);
        appendMessage('Error', 'Could not get a response.');
    }
});

function appendMessage(sender, message) {
    const msgDiv = document.createElement('div');
    msgDiv.textContent = `${sender}: ${message}`;
    chatBox.appendChild(msgDiv);

    // Scroll to the bottom every time a new message is added
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Import EventSource library
const EventSource = require("eventsource");

// Import React library and components
const React = require("react");
const ChatHistory = require("./ChatHistory");
const ChatInput = require("./ChatInput");
const ChatHeader = require("./ChatHeader");

// Define OpenAI API key and endpoint
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ENDPOINT = "https://chimeragpt.adventblocks.cc/v1/chat/completions";

// Define request body with model, messages, and stream parameters
const requestBody = {
  model: "gpt-3.5-turbo",
  messages: [
    { role: "user", content: "Say this is a test!" }
  ],
  stream: true // Set stream to true to enable streaming responses
};

// Create a React component for the chat UI
class Chat extends React.Component {
  constructor(props) {
    super(props);
    // Initialize the state with an empty messages array and a loading flag
    this.state = {
      messages: [],
      loading: false
    };
    // Bind the methods to the component instance
    this.handleUserMessage = this.handleUserMessage.bind(this);
    this.handleBotMessage = this.handleBotMessage.bind(this);
    this.handleBotPartialMessage = this.handleBotPartialMessage.bind(this);
  }

  // Method to handle user messages
  handleUserMessage(message) {
    // Add the user message to the state messages array
    this.setState((prevState) => ({
      messages: [...prevState.messages, { role: "user", content: message }]
    }));
    // Set the loading flag to true to indicate that the bot is typing
    this.setState({ loading: true });
    // Call the getBotResponse method with the user message
    this.getBotResponse(message);
  }

  // Method to handle bot messages
  handleBotMessage(message) {
    // Add the bot message to the state messages array
    this.setState((prevState) => ({
      messages: [...prevState.messages, { role: "bot", content: message }]
    }));
    // Set the loading flag to false to indicate that the bot is done typing
    this.setState({ loading: false });
  }

  // Method to handle bot partial messages
  handleBotPartialMessage(message) {
    // Update the last bot message in the state messages array with the partial message
    this.setState((prevState) => {
      const updatedMessages = [...prevState.messages];
      updatedMessages[updatedMessages.length - 1] = { role: "bot", content: message };
      return { messages: updatedMessages };
    });
  }
  // Method to get bot response using OpenAI API and EventSource
  getBotResponse(message) {
    // Create an event source object with the endpoint and headers
    const eventSource = new EventSource(OPENAI_ENDPOINT, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      method: "POST",
      body: JSON.stringify(requestBody)
    });

    // Create an event listener for data events
    eventSource.addEventListener("data", (event) => {
      // Parse the data chunk as JSON
      const data = JSON.parse(event.data);

      // Check if the data contains a token or a completion
      if (data.type === "token") {
        // Append the token to a partial text variable
        let partialText = partialText + data.data;
        // Call the handleBotPartialMessage method with the partial text
        this.handleBotPartialMessage(partialText);
      } else if (data.type === "completion") {
        // Append the completion to the partial text variable
        let partialText = partialText + data.data;
        // Call the handleBotMessage method with the final text
        this.handleBotMessage(partialText);
        // Close the event source connection
        eventSource.close();
      }
    });
  }

  // Render the chat UI using React components
  render() {
    return (
      <div className="chat-container">
        <ChatHeader model={requestBody.model} />
        <ChatHistory messages={this.state.messages} loading={this.state.loading} />
        <ChatInput onUserMessage={this.handleUserMessage} />
      </div>
    );
  }
}

// Export the Chat component
module.exports = Chat;
// Create a React component for the chat header
class ChatHeader extends React.Component {
  constructor(props) {
    super(props);
    // Bind the methods to the component instance
    this.toggleModelMenu = this.toggleModelMenu.bind(this);
    this.selectModel = this.selectModel.bind(this);
  }

  // Method to toggle the model menu visibility
  toggleModelMenu() {
    const modelMenu = document.getElementById("model-menu");
    modelMenu.style.display = modelMenu.style.display === "none" ? "block" : "none";
  }

  // Method to select a model from the menu
  selectModel(model) {
    // Update the request body with the selected model
    requestBody.model = model;
    // Toggle the model menu visibility
    this.toggleModelMenu();
  }

  // Render the chat header using React elements
  render() {
    return (
      <div className="chat-header">
        <h1>Chat with {this.props.model}</h1>
        <div className="model-selector" onClick={this.toggleModelMenu}>
          <span>Select a different model</span>
          <i className="fas fa-angle-down"></i>
        </div>
        <ul id="model-menu" style={{ display: "none" }}>
          <li data-model="gpt-3.5-turbo" onClick={() => this.selectModel("gpt-3.5-turbo")}>
            gpt-3.5-turbo
          </li>
          <li data-model="gpt-3.5-turbo-0613" onClick={() => this.selectModel("gpt-3.5-turbo-0613")}>
            gpt-3.5-turbo-0613
          </li>
          <li data-model="gpt-3.5-turbo-16k" onClick={() => this.selectModel("gpt-3.5-turbo-16k")}>
            gpt-3.5-turbo-16k
          </li>
          <li data-model="gpt-3.5-turbo-16k-poe" onClick={() => this.selectModel("gpt-3.5-turbo-16k-poe")}>
            gpt-3.5-turbo-16k-poe
          </li>
          <li data-model="gpt-3.5-turbo-16k-0613" onClick={() => this.selectModel("gpt-3.5-turbo-16k-0613")}>
            gpt-3.5-turbo-16k-0613
          </li>
          <li data-model="gpt-4" onClick={() => this.selectModel("gpt-4")}>
            gpt-4
          </li>
          <li data-model="gpt-4-poe" onClick={() => this.selectModel("gpt-4-poe")}>
            gpt-4-poe
          </li>
          <li data-model="gpt-4-0613" onClick={() => this.selectModel("gpt-4-0613")}>
            gpt-4-0613
          </li>
          <li data-model="gpt-4-32k" onClick={() => this.selectModel("gpt-4-32k")}>
            gpt-4-32k
          </li>
          <li data-model="gpt-4-32k-poe" onClick={() => this.selectModel("gpt-4-32k-poe")}>
            gpt-4-32k-poe
          </li>
          <li data-model="gpt-4-32k-poe" onClick={() => this.selectModel("claude-instant")}>
            claude-instant
          </li>
        </ul>
      </div>
    );
  }
}

// Export the ChatHeader component
module.exports = ChatHeader;
// Create a React component for the chat history
class ChatHistory extends React.Component {
  // Render the chat history using React elements
  render() {
    return (
      <div className="chat-history" id="chat-history">
        {this.props.messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            {this.parseResponse(message.content)}
          </div>
        ))}
        {this.props.loading && (
          <div className="message bot">
            <span className="typing-indicator"></span>
          </div>
        )}
      </div>
    );
  }

  // Method to parse the response and add markdown and mathjax elements
  parseResponse(response) {
    let parsedResponse = response;

    parsedResponse = parsedResponse.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
    parsedResponse = parsedResponse.replace(
      /\$\$(.*?)\$\$/g,
      '<span class="mathjax-latex">\\($1\\)</span>'
    );
    parsedResponse = parsedResponse.replace(
      /\$(.*?)\$/g,
      '<span class="mathjax-latex">\\($1\\)</span>'
    );
    parsedResponse = this.parseTables(parsedResponse);

    return parsedResponse;
  }

  // Method to parse the tables and create table elements
  parseTables(response) {
    const tableRegex = /\n((?:\s*:?[\|:].*\|\n)+)\n/g;
    return response.replace(tableRegex, this.createTable);
  }

  // Method to create a table element from a table string
  createTable(match, table) {
    const rows = table.trim().split("\n");
    const tableElement = document.createElement("table");

    const tableHeader = document.createElement("tr");
    const tableHeaderCells = rows[0].split("|").slice(1, -1);
    tableHeaderCells.forEach((cell) => {
      const th = document.createElement("th");
      th.classList.add("table-header");
      th.textContent = cell.trim();
      tableHeader.appendChild(th);
    });
    tableElement.appendChild(tableHeader);

    for (let i = 2; i < rows.length; i++) {
      const row = document.createElement("tr");
      const tableCells = rows[i].split("|").slice(1, -1);
      tableCells.forEach((cell) => {
        const td = document.createElement("td");
        td.classList.add("table-data");
        td.innerHTML = this.parseResponse(cell.trim());
        row.appendChild(td);
      });
      tableElement.appendChild(row);
    }

    return tableElement.outerHTML;
  }
}

// Export the ChatHistory component
module.exports = ChatHistory;
  

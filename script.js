const socket = io("http://localhost:3000");
const messageForm = document.getElementById("send-container");
const messageInput = document.getElementById("message-input");
const messageContainer = document.getElementById("message-container");

const nameDisplay = document.getElementById("name-display");

let hasJoined = false;

Swal.fire({
  title: "Welcome! Enter your name:",
  input: "text",
  inputPlaceholder: "Your name",
  confirmButtonText: "Join",
  allowOutsideClick: false,
  inputValidator: (value) => {
    if (!value) {
      return "You need to enter a name!";
    }
  },
}).then((result) => {
  if (result.isConfirmed) {
    socket.emit("new-user", result.value);
    nameDisplay.innerText = result.value;
    nameDisplay.style.color = "rgb(67, 121, 247)";
    document.title = "Connected as " + result.value;
    hasJoined = true;
    return result.value;
  }
});

socket.on("chat-history", (history) => {
  messageContainer.innerHTML = "";
  history.forEach((msg) => {
    const time = new Date(msg.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const message = `${msg.name}: ${msg.message}`;
    if (msg.name === nameDisplay.innerText) {
      appendClientMessage(message, time);
    } else {
      appendServerMessage(message, time);
    }
  });
  appendServerNotify("You joined");
});

socket.on("chat-message", (data) => {
  const time = new Date(data.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const message = `${data.name}: ${data.message}`;
  if (data.name === nameDisplay.innerText) {
    appendClientMessage(message, time);
  } else {
    appendServerMessage(message, time);
  }
});

socket.on("user-connected", (name) => {
  appendServerNotify(`${name} joined the room`);
});

socket.on("user-disconnected", (name) => {
  //make sure that the user has joined before displaying leave messages
  //prevents null name from being displayed
  if (hasJoined && name) {
    appendServerNotify(`${name} left the room`);
  }
});

socket.on("user-count", (count) => {
  const onlineCount = document.getElementById("online-count");
  if (onlineCount) {
    onlineCount.innerText = count;
  }
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value;
  socket.emit("send-chat-message", message);
  document.getElementById("message-input").value = "";
});

function appendClientMessage(message, timestamp = null) {
  const container = document.createElement("div");
  container.classList.add("message-container", "client-container");

  const bubble = document.createElement("div");
  bubble.classList.add("client-message");
  bubble.innerText = message;
  container.appendChild(bubble);

  if (timestamp) {
    const time = document.createElement("div");
    time.classList.add("timestamp");
    time.innerText = timestamp;
    container.appendChild(time);
  }

  messageContainer.appendChild(container);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

function appendServerMessage(message, timestamp = null) {
  const container = document.createElement("div");
  container.classList.add("message-container", "server-container");

  const bubble = document.createElement("div");
  bubble.classList.add("server-message");
  bubble.innerText = message;
  container.appendChild(bubble);

  if (timestamp) {
    const time = document.createElement("div");
    time.classList.add("timestamp");
    time.innerText = timestamp;
    container.appendChild(time);
  }

  messageContainer.appendChild(container);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

function appendServerNotify(message) {
  const messageElement = document.createElement("p");
  messageElement.classList.add("server-notification");
  messageElement.innerText = message;
  messageContainer.appendChild(messageElement);
  // auto scroll to bottom
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

const socket = io("http://localhost:3000");
const messageForm = document.getElementById("send-container");
const messageInput = document.getElementById("message-input");
const messageContainer = document.getElementById("message-container");

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
    appendMessage("You joined");
    socket.emit("new-user", result.value);
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
    appendMessage(`(${time}) ${msg.name}: ${msg.message}`);
  });
});

socket.on("chat-message", (data) => {
  const time = new Date(data.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  appendMessage(`(${time}) ${data.name}: ${data.message}`);
});

socket.on("user-connected", (name) => {
  appendMessage(`${name} joined the room`);
});

socket.on("user-disconnected", (name) => {
  appendMessage(`${name} left the room`);
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value;
  socket.emit("send-chat-message", message);
  document.getElementById("message-input").value = "";
});

function appendMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.innerText = message;
  messageContainer.appendChild(messageElement);
  // auto scroll to bottom
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

# Generic Chat Web Application

A simple yet sophisticated chat application made with Node.js, socket.io, SweetAlert2, and mySQL2. Features everything a normal chat application would have, such as chat history, user and server colors, and an authentication system. Hosted with Render and Github pages.

## Features

- **User Authentication**: Supports MySQL-based registration for new users and password verification for returning users.
- **Chat History**: Displays the latest 50 messages in chronological order for all users.
- **Profanity Filter**: Automatically replaces offensive words in messages with asterisks.
- **Message Timestamps**: Each message will have a timestamp for when it was sent.
- **Automatic Table Creation**: Creates MySQL tables for users and messages if they do not already exist.
- **User Notifications**: Broadcasts notifications when users join or leave the chat.
- **Message Styling**: Differentiates between the client’s messages and those from other users with unique styles.
- **Live User Count**: Tracks online users and updates the count dynamically.
- **Password Protection**: Implements login security with password verification and conflict alerts for usernames.
- **Interactive Prompts**: Uses SweetAlert for user-friendly input and alerts.
- **Mobile Friendly**: The app is responsive so it will work on small devices such as phones and tablets!

## Demo

[Live Demo](https://ericafk0001.github.io/generic-chat-app/)

## Screenshot

![Screenshot](https://cloud-jxdug2wm2-hack-club-bot.vercel.app/0image.png)

---

## Built With

- HTML, CSS, JavaScript
- Node.js
- socket.io
- SweetAlert2
- MySQL2

## Features to Add

- Timestamp includes date if it was sent more than a few days ago
- Better user bubbles
- Chat Bubble Animations
- Sounds
- Size Customizability

## Getting Started

Follow these steps to install and run the Node.js server for this project.

### **Prerequisites**

- Install [Node.js](https://nodejs.org) (LTS version recommended).
- Install [Git](https://git-scm.com) (optional, if cloning via terminal).

---

### **Installation**

- Ensure you have Node.js and npm installed by running:
  ```bash
  node -v
  npm -v
  ```

1. **Clone the Repository**

   ```bash
   git clone https://github.com/ericafk0001/generic-chat-app.git
   cd generic-chat-app
   ```

2. **Install Dependencies**
   Use `npm` (Node.js package manager) to install the required packages:
   ```bash
   npm install
   ```

---

### **Running the Server**

1. **Start the Server**
   Run the following command:

   ```bash
   npm start
   ```

2. **Access the Server**
   The server will run on `http://localhost:5500`

---

### **Configuration**

- Modify environment variables in the `.env` file.
- For development mode (hot reloads):

```bash
npm run dev
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

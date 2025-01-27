import * as dotenv from "dotenv";
import mysql from "mysql2/promise";
import { Server } from "socket.io";
import words from "profane-words";
import http from "http";
const PORT = process.env.PORT || 3000;
dotenv.config();

let connection;
const users = {};

async function connectMySQL() {
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT,
      ssl:
        process.env.TIDB_ENABLE_SSL === "true"
          ? {
              minVersion: "TLSv1.2",
              ca: process.env.TIDB_CA_PATH
                ? fs.readFileSync(process.env.TIDB_CA_PATH)
                : undefined,
            }
          : null,
    });

    // await connection.execute("DROP TABLE IF EXISTS messages");
    // await connection.execute("DROP TABLE IF EXISTS users");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        socket_id VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log("Successfully connected to MySQL and created tables!");
  } catch (err) {
    console.error("MySQL connection error:", err);
  }
}

async function saveMessage(name, message) {
  try {
    const timestamp = new Date();
    const filteredMessage = filterProfanity(message);
    await connection.execute(
      "INSERT INTO messages (name, message, timestamp) VALUES (?, ?, ?)",
      [name, filteredMessage, timestamp]
    );
    return { name, message: filteredMessage, timestamp };
  } catch (err) {
    console.error("Error saving message:", err);
    return null;
  }
}

async function loadChatHistory() {
  try {
    const [rows] = await connection.execute(
      "SELECT * FROM messages ORDER BY timestamp ASC LIMIT 50"
    );
    return rows;
  } catch (err) {
    console.error("Error loading chat history:", err);
    return [];
  }
}

async function verifyPassword(username, password) {
  try {
    const [rows] = await connection.execute(
      "SELECT password FROM users WHERE username = ?",
      [username]
    );
    return rows.length > 0 && rows[0].password === password;
  } catch (err) {
    console.error("Error verifying password:", err);
    return false;
  }
}

async function saveUser(username, socketId, password) {
  try {
    const [result] = await connection.execute(
      "INSERT INTO users (username, socket_id, password) VALUES (?, ?, ?)",
      [username, socketId, password]
    );
    return result.insertId;
  } catch (err) {
    console.error("Error saving user:", err);
    return null;
  }
}

async function checkUsername(username) {
  try {
    const [rows] = await connection.execute(
      "SELECT username FROM users WHERE username = ?",
      [username]
    );
    return rows.length > 0;
  } catch (err) {
    console.error("Error checking username:", err);
    return false;
  }
}

function filterProfanity(message) {
  return message
    .split(" ")
    .map((word) => {
      // Remove punctuation for checking
      const cleanWord = word.replace(/[^\w\s]/g, "");

      // Check if exact word is in profanity list
      if (words.includes(cleanWord.toLowerCase())) {
        const firstLetter = word[0];
        return firstLetter + "*".repeat(word.length - 1);
      }
      return word;
    })
    .join(" ");
}

await connectMySQL();

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200);
    res.end('OK');
    return;
  }
});

// Socket.IO Server Setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

setInterval(() => {
  http.get('http://generic-chat-app-km0c.onrender.com/')
    .on('error', err => console.error('Health check failed:', err));
}, 5 * 60 * 1000);

io.on("connection", (socket) => {
  console.log("user connected");
  let userCount = io.engine.clientsCount;

  io.emit("user-count", userCount);

  socket.on("new-user", async (data) => {
    const { username, password } = data;
    const userExists = await checkUsername(username);

    if (userExists) {
      console.log("User exists, attempting login");
      const validPassword = await verifyPassword(username, password);
      if (validPassword) {
        users[socket.id] = username;
        socket.emit("auth-success", username); // Pass username back
        loadChatHistory().then((history) =>
          socket.emit("chat-history", history)
        );
      } else {
        console.log("Invalid password");
        socket.emit("auth-failed");
      }
    } else {
      console.log("New user registration");
      // New user registration
      const userId = await saveUser(username, socket.id, password);
      if (userId) {
        users[socket.id] = username;
        socket.emit("auth-success", username); // Pass username back
        socket.broadcast.emit("user-connected", username);
        loadChatHistory().then((history) => {
          socket.emit("chat-history", history);
        });
      } else {
        console.log("Failed to save new user");
        socket.emit("auth-failed");
      }
    }
  });

  socket.on("send-chat-message", async (message) => {
    const name = users[socket.id];
    const savedMessage = await saveMessage(name, message);

    if (savedMessage) {
      const messageData = {
        message: savedMessage.message,
        name: savedMessage.name,
        timestamp: savedMessage.timestamp,
      };
      socket.broadcast.emit("chat-message", messageData);
      socket.emit("chat-message", messageData);
    }
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("user-disconnected", users[socket.id]);
    delete users[socket.id];
    io.emit("user-count", io.engine.clientsCount);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Socket.IO server ready`);
});

// Verify server is listening
server.on('listening', () => {
  console.log(`TCP server bound to port ${PORT}`);
});

// Add error handler
server.on('error', (err) => {
  console.error('Server error:', err);
});

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, async () => {
    console.log(
      `\n${signal} received. Closing MySQL connection and exiting...`
    );
    await connection.end();
    process.exit(0);
  });
});
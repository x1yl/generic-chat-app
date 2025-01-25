import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { Server } from 'socket.io';

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
      ssl: process.env.TIDB_ENABLE_SSL === 'true' ? {
        minVersion: 'TLSv1.2',
        ca: process.env.TIDB_CA_PATH ? fs.readFileSync(process.env.TIDB_CA_PATH) : undefined
     } : null,
    });

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log("Successfully connected to MySQL!");
  } catch (err) {
    console.error("MySQL connection error:", err);
  }
}

async function saveMessage(name, message) {
  try {
    await connection.execute(
      'INSERT INTO messages (name, message) VALUES (?, ?)',
      [name, message]
    );
    return {
      name,
      message,
      timestamp: new Date()
    };
  } catch (err) {
    console.error("Error saving message:", err);
    return null;
  }
}

async function loadChatHistory() {
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM messages ORDER BY timestamp ASC LIMIT 50'
    );
    return rows;
  } catch (err) {
    console.error("Error loading chat history:", err);
    return [];
  }
}

await connectMySQL();

// Socket.IO Server Setup
const io = new Server(3000, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("user connected");
  let userCount = io.engine.clientsCount;

  io.emit("user-count", userCount);

  socket.on("new-user", (name) => {
    users[socket.id] = name;
    socket.broadcast.emit("user-connected", name);
    io.emit("user-count", io.engine.clientsCount);

    //load chat only after user has joined
    loadChatHistory().then((history) => {
      socket.emit("chat-history", history);
    });
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

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, async () => {
    console.log(`\n${signal} received. Closing MySQL connection and exiting...`);
    await connection.end();
    process.exit(0);
  });
});
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://8percent:Lk83uldHQv2qwZtf@generic-chat-app.k3mec.mongodb.net/?retryWrites=true&w=majority&appName=generic-chat-app";

// MongoDB connection
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let messagesCollection;
const users = {};

async function connectMongo() {
  try {
    await client.connect();
    const db = client.db("chat-app");
    messagesCollection = db.collection("messages");
    console.log("Successfully connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

async function saveMessage(name, message) {
  try {
    const messageDoc = {
      name,
      message,
      timestamp: new Date(),
    };
    const result = await messagesCollection.insertOne(messageDoc);
    return messageDoc;
  } catch (err) {
    console.error("Error saving message:", err);
    return null;
  }
}

async function loadChatHistory() {
  try {
    return await messagesCollection
      .find({})
      .sort({ timestamp: 1 })
      .limit(50)
      .toArray();
  } catch (err) {
    console.error("Error loading chat history:", err);
    return [];
  }
}

connectMongo();

// Socket.IO Server Setup
const io = require("socket.io")(3000, {
  cors: {
    origin: "*", // Allow all origins; for production, specify the domain you want to allow.
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

// =========================================
// Imports
// =========================================
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// =========================================
// App Setup
// =========================================
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// =========================================
// Serve Public Folder
// =========================================
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html on root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =========================================
// Connected Users: username -> socket.id
// =========================================
const users = {};

// =========================================
// Helper: get current timestamp
// =========================================
const timestamp = () => new Date().toISOString().slice(11, 19);

// =========================================
// Socket.IO
// =========================================
io.on("connection", (socket) => {
  console.log(`[${timestamp()}] Connected: ${socket.id}`);

  // -----------------------------
  // Register User
  // -----------------------------
  socket.on("register-user", (username) => {
    // Validate username
    const trimmed = username.trim();
    if (!trimmed) {
      socket.emit("registration-error", "Username cannot be empty.");
      return;
    }
    if (trimmed.length > 20) {
      socket.emit("registration-error", "Username too long (max 20 chars).");
      return;
    }
    if (users[trimmed]) {
      socket.emit("registration-error", "Username already taken.");
      return;
    }

    // Register
    users[trimmed] = socket.id;
    socket.username = trimmed;

    console.log(`[${timestamp()}] ${trimmed} joined`);

    // Send updated user list to all clients
    io.emit("user-list", Object.keys(users));

    // Confirm registration to this client
    socket.emit("registration-success", trimmed);
  });

  // -----------------------------
  // Private Message
  // -----------------------------
  socket.on("private-message", (data) => {
    const { sender, receiver, message } = data;
    const receiverSocketId = users[receiver];

    if (!receiverSocketId) {
      socket.emit("message-error", `User "${receiver}" is not online.`);
      return;
    }

    io.to(receiverSocketId).emit("receive-message", {
      sender,
      message,
      timestamp: new Date().toISOString(),
    });
  });

  // -----------------------------
  // Typing Indicator
  // -----------------------------
  socket.on("typing", (data) => {
    const { sender, receiver, isTyping } = data;
    const receiverSocketId = users[receiver];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user-typing", { sender, isTyping });
    }
  });

  // -----------------------------
  // Disconnect
  // -----------------------------
  socket.on("disconnect", () => {
    if (socket.username) {
      delete users[socket.username];
      console.log(`[${timestamp()}] ${socket.username} left`);
      io.emit("user-list", Object.keys(users));
    } else {
      console.log(`[${timestamp()}] Unregistered socket disconnected: ${socket.id}`);
    }
  });
});

// =========================================
// Start Server
// =========================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[${timestamp()}] Server running on port ${PORT}`);
});
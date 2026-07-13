// =====================================
// Temporary Messenger - chat.js
// =====================================

// ------------------------------
// Socket & Auth
// ------------------------------
const socket = io();
const username = sessionStorage.getItem("username");

if (!username) {
    window.location.href = "/";
}

// Register with server
socket.emit("register-user", username);

socket.on("registration-error", (msg) => {
    alert(msg);
    sessionStorage.removeItem("username");
    window.location.href = "/";
});

socket.on("registration-success", () => {
    console.log("Registered as", username);
});

// ------------------------------
// DOM refs
// ------------------------------
const userList = document.getElementById("userList");
const userCount = document.getElementById("userCount");
const chatWith = document.getElementById("chatWith");
const currentUser = document.getElementById("currentUser");
const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const logoutBtn = document.getElementById("logoutBtn");
const typingIndicator = document.getElementById("typingIndicator");

currentUser.textContent = username;

// ------------------------------
// State
// ------------------------------
let selectedUser = "";
let typingTimeout = null;

// ------------------------------
// Helpers
// ------------------------------
function updateUserCount(count) {
    userCount.textContent = count > 0 ? `${count} user${count === 1 ? "" : "s"} available` : "No other users online";
}

function clearActiveUser() {
    document.querySelectorAll("#userList li").forEach(li => li.classList.remove("active"));
}

function setActiveUser(user) {
    if (!user) {
        selectedUser = "";
        chatWith.textContent = "Select a user to start chatting";
        messageInput.disabled = true;
        sendBtn.disabled = true;
        messages.innerHTML = `<div class="chat-empty visible"><strong>Welcome to Temporary Messenger</strong><p>Pick someone from the list to start a conversation.</p></div>`;
        return;
    }
    selectedUser = user;
    clearActiveUser();
    const item = document.querySelector(`#userList li[data-user="${user}"]`);
    if (item) {
        item.classList.add("active");
        item.classList.remove("unread");
    }
    chatWith.textContent = `Chat with ${user}`;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
    // Clear messages and show empty (will be filled when messages arrive)
    messages.innerHTML = `<div class="chat-empty visible"><strong>Start chatting with ${user}</strong><p>Send your first message!</p></div>`;
    // Remove typing indicator if present
    hideTyping();
}

function markUserUnread(user) {
    const item = document.querySelector(`#userList li[data-user="${user}"]`);
    if (item && item.dataset.user !== selectedUser) {
        item.classList.add("unread");
    }
}

function addMessage(sender, text, type, time) {
    // Remove empty placeholder if present
    const empty = messages.querySelector(".chat-empty");
    if (empty) empty.remove();

    const div = document.createElement("div");
    div.className = `message ${type}`;
    const displayName = type === "sent" ? "You" : sender;
    const timestamp = time ? new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    div.innerHTML = `
        <strong>${displayName}</strong>
        <p>${text}</p>
        <small>${timestamp}</small>
    `;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function renderUserList(users) {
    userList.innerHTML = "";
    const available = users.filter(u => u !== username);

    if (available.length === 0) {
        userList.innerHTML = '<li class="empty">No other users online</li>';
        updateUserCount(0);
        // If selected user was the only one, clear selection
        if (selectedUser && !users.includes(selectedUser)) {
            setActiveUser(null);
        }
        return;
    }

    updateUserCount(available.length);

    available.forEach(user => {
        const li = document.createElement("li");
        li.dataset.user = user;
        li.innerHTML = `<span>${user}</span><span class="status-dot"></span>`;
        li.addEventListener("click", () => setActiveUser(user));
        userList.appendChild(li);
    });

    // If selected user is still available, re-highlight
    if (selectedUser && available.includes(selectedUser)) {
        const item = document.querySelector(`#userList li[data-user="${selectedUser}"]`);
        if (item) item.classList.add("active");
    } else if (selectedUser) {
        // Selected user went offline
        setActiveUser(null);
    }
}

// ------------------------------
// Typing Indicator
// ------------------------------
function showTyping(user) {
    typingIndicator.style.display = "flex";
    typingIndicator.innerHTML = `<span>${user} is typing</span><span></span><span></span><span></span>`;
}

function hideTyping() {
    typingIndicator.style.display = "none";
    typingIndicator.innerHTML = "";
}

// ------------------------------
// Socket Events
// ------------------------------

// User list updates
socket.on("user-list", (users) => {
    renderUserList(users);
});

// Receive private message
socket.on("receive-message", (data) => {
    if (data.sender === selectedUser) {
        addMessage(data.sender, data.message, "received", data.timestamp);
    } else {
        markUserUnread(data.sender);
    }
});

// Message error (receiver offline, etc.)
socket.on("message-error", (msg) => {
    alert(msg);
});

// Typing events
socket.on("user-typing", ({ sender, isTyping }) => {
    if (sender === selectedUser) {
        if (isTyping) {
            showTyping(sender);
        } else {
            hideTyping();
        }
    }
});

// ------------------------------
// Sending Messages
// ------------------------------
function sendMessage() {
    const text = messageInput.value.trim();
    if (!selectedUser) {
        alert("Select a user first.");
        return;
    }
    if (!text) return;

    socket.emit("private-message", {
        sender: username,
        receiver: selectedUser,
        message: text,
    });

    addMessage("You", text, "sent");
    messageInput.value = "";
    messageInput.focus();

    // Stop typing indicator (if any)
    socket.emit("typing", { sender: username, receiver: selectedUser, isTyping: false });
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
        return;
    }

    // Typing indicator
    if (selectedUser) {
        socket.emit("typing", { sender: username, receiver: selectedUser, isTyping: true });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit("typing", { sender: username, receiver: selectedUser, isTyping: false });
        }, 1000);
    }
});

// ------------------------------
// Logout
// ------------------------------
logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("username");
    window.location.href = "/";
});

// ------------------------------
// Reconnection handling
// ------------------------------
socket.on("disconnect", () => {
    // Optionally show a message
    console.warn("Disconnected from server");
});

socket.on("reconnect", () => {
    console.log("Reconnected, re-registering...");
    socket.emit("register-user", username);
});

// ------------------------------
// Initial UI state
// ------------------------------
setActiveUser(null);
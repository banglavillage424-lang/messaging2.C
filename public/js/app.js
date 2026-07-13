// =====================================
// Temporary Messenger - app.js
// =====================================

const usernameInput = document.getElementById("username");
const joinBtn = document.getElementById("joinBtn");

function joinChat() {
    const username = usernameInput.value.trim();

    if (!username) {
        alert("Please enter a username.");
        usernameInput.focus();
        return;
    }
    if (username.length > 20) {
        alert("Username must be 20 characters or less.");
        usernameInput.focus();
        return;
    }
    if (/[^a-zA-Z0-9_]/.test(username)) {
        alert("Username can only contain letters, numbers, and underscores.");
        usernameInput.focus();
        return;
    }

    // Save and redirect
    sessionStorage.setItem("username", username);
    window.location.href = "chat.html";
}

joinBtn.addEventListener("click", joinChat);
usernameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") joinChat();
});

window.addEventListener("load", () => usernameInput.focus());
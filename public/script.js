// Connect to the server
const socket = io();

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const usersList = document.getElementById('users-list');
const userInfoDisplay = document.getElementById('user-info');

// Application state
let currentUser = null;

// Load chat history when page loads
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/messages');
        const messages = await response.json();
        
        // Display chat history
        messages.forEach(message => {
            displayMessage(message);
        });
        
        // Scroll to bottom of messages
        scrollToBottom();
        
    } catch (error) {
        console.error('Failed to load chat history:', error);
    }
});

// Join chat button click
joinBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        socket.emit('user_join', username);
    } else {
        socket.emit('user_join');
    }
});

// Send message button click
sendBtn.addEventListener('click', sendMessage);

// Send message on enter key
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Send message function
function sendMessage() {
    const content = messageInput.value.trim();
    
    if (content && currentUser) {
        socket.emit('send_message', { content });
        messageInput.value = '';
    }
}

// Socket event listeners
socket.on('user_joined', (user) => {
    currentUser = user;
    loginScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    userInfoDisplay.textContent = `Logged in as: ${user.username}`;
    messageInput.focus();
});

socket.on('active_users', (users) => {
    updateUsersList(users);
});

socket.on('message', (message) => {
    displayMessage(message);
    scrollToBottom();
});

// Helper functions
function updateUsersList(users) {
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.username;
        
        if (currentUser && user.id === currentUser.id) {
            li.textContent += ' (you)';
            li.style.fontWeight = 'bold';
        }
        
        usersList.appendChild(li);
    });
}

function displayMessage(message) {
    const messageDiv = document.createElement('div');
    const timestamp = new Date(message.timestamp);
    
    if (message.type === 'system') {
        // System message
        messageDiv.className = 'message system';
        messageDiv.innerHTML = `
            <div class="message-content">${message.content}</div>
            <div class="message-info">${formatTime(timestamp)}</div>
        `;
    } else {
        // User message
        const isOutgoing = currentUser && message.senderId === currentUser.id;
        messageDiv.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
        
        messageDiv.innerHTML = `
            <div class="message-info">${message.sender} • ${formatTime(timestamp)}</div>
            <div class="message-content">${message.content}</div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
} 
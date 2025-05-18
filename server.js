const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const Message = require('./models/message');
const fs = require('fs');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// File storage path for fallback
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// Initialize file storage if doesn't exist
if (!fs.existsSync(MESSAGES_FILE)) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify([]));
}

// Flag to track if MongoDB is available
let useMongoDb = false;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  useMongoDb = true;
}).catch(err => {
  console.error('MongoDB connection error:', err);
  console.log('Using file-based storage instead');
  useMongoDb = false;
});

// REST API endpoints for messages
app.get('/api/messages', async (req, res) => {
  try {
    if (useMongoDb) {
      const messages = await Message.find().sort({ timestamp: 1 }).limit(100);
      res.json(messages);
    } else {
      // Use file-based storage
      const fileContent = fs.readFileSync(MESSAGES_FILE, 'utf8');
      const messages = JSON.parse(fileContent);
      res.json(messages.slice(-100)); // Return last 100 messages
    }
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

// Active users
let users = [];

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  
  // User joins
  socket.on('user_join', (username) => {
    const user = {
      id: socket.id,
      username: username || `User_${socket.id.substr(0, 5)}`
    };
    
    users.push(user);
    
    // Send user info back to the client
    socket.emit('user_joined', user);
    
    // Send active users list to all clients
    io.emit('active_users', users);
    
    // Send system message
    const joinMessage = {
      type: 'system',
      sender: 'System',
      content: `${user.username} has joined the chat`,
      timestamp: new Date()
    };
    
    io.emit('message', joinMessage);
    
    // Save system message to database
    saveMessage(joinMessage);
  });
  
  // New message
  socket.on('send_message', async (messageData) => {
    const user = users.find(u => u.id === socket.id);
    if (!user) return;
    
    const message = {
      type: 'user',
      sender: user.username,
      senderId: user.id,
      content: messageData.content,
      timestamp: new Date()
    };
    
    // Broadcast message to all clients
    io.emit('message', message);
    
    // Save message to database
    saveMessage(message);
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    const userIndex = users.findIndex(u => u.id === socket.id);
    
    if (userIndex !== -1) {
      const user = users[userIndex];
      users.splice(userIndex, 1);
      
      // Send updated users list
      io.emit('active_users', users);
      
      // Send system message
      const leaveMessage = {
        type: 'system',
        sender: 'System',
        content: `${user.username} has left the chat`,
        timestamp: new Date()
      };
      
      io.emit('message', leaveMessage);
      
      // Save system message to database
      saveMessage(leaveMessage);
      
      console.log(`User disconnected: ${user.username}`);
    }
  });
});

// Helper function to save messages
async function saveMessage(message) {
  try {
    if (useMongoDb) {
      // Save to MongoDB
      const newMessage = new Message({
        type: message.type,
        sender: message.sender,
        senderId: message.senderId || null,
        content: message.content,
        timestamp: message.timestamp
      });
      
      await newMessage.save();
    } else {
      // Save to file
      const fileContent = fs.readFileSync(MESSAGES_FILE, 'utf8');
      const messages = JSON.parse(fileContent);
      messages.push(message);
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
    }
  } catch (err) {
    console.error('Error saving message:', err);
  }
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
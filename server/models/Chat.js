const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { 
    type: String, 
    enum: ['user', 'assistant'], 
    required: true 
  },
  content: { 
    type: String, 
    required: [true, 'Message content is required'],
    trim: true
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

const chatSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true // Add index for faster queries
  },
  title: {
    type: String,
    default: function() {
      // Auto-generate title from first user message
      const firstUserMessage = this.messages.find(msg => msg.role === 'user');
      if (firstUserMessage) {
        return firstUserMessage.content.substring(0, 50) + '...';
      }
      return 'New Chat';
    }
  },
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
chatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to add a message
chatSchema.methods.addMessage = function(role, content) {
  this.messages.push({
    role,
    content,
    timestamp: new Date()
  });
  this.updatedAt = Date.now();
  return this.save();
};

// Static method to find user's recent chats
chatSchema.statics.findUserChats = function(userId, limit = 10) {
  return this.find({ userId, isActive: true })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('title messages createdAt updatedAt');
};

// Static method to get or create a chat for user
chatSchema.statics.getOrCreateUserChat = async function(userId) {
  let chat = await this.findOne({ userId, isActive: true })
    .sort({ updatedAt: -1 });
  
  if (!chat) {
    chat = new this({ userId, messages: [] });
  }
  
  return chat;
};

module.exports = mongoose.model('Chat', chatSchema);
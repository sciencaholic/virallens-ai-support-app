const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const Chat = require('../models/Chat');
const { authenticateToken } = require('../auth');

const router = express.Router();

// Apply authentication to all chat routes
router.use(authenticateToken);

// Validation rules
const messageValidation = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters')
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Environment-aware AI configuration
const isDevelopment = process.env.NODE_ENV === 'development';

const AI_CONFIG = {
  apiUrl: process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
  model: process.env.AI_MODEL || 'google/gemma-3-4b-it:free',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS) || (isDevelopment ? 256 : 512),
  temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
  systemPrompt: 'You are a helpful customer support assistant. Be concise, friendly, and professional. Respond in a conversational tone and provide clear, actionable assistance.',
  typingDelay: isDevelopment ? 500 : 1500, // Shorter delay in development
  minTypingTime: isDevelopment ? 1000 : 2000, // Minimum typing time for realism
};

// Function to simulate typing delay
const simulateTyping = async (duration) => {
  return new Promise(resolve => setTimeout(resolve, duration));
};

// Function to call OpenRouter AI Service with typing simulation
const callAIService = async (messages, onTypingStart, onTypingEnd) => {
  try {
    console.log('🤖 Calling OpenRouter API with Gemma 3 4B...');
    
    // Check if API key exists
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    // Start typing indicator
    if (onTypingStart) onTypingStart();

    // Prepare messages for OpenRouter (OpenAI-compatible format)
    const formattedMessages = [
      {
        role: 'system',
        content: AI_CONFIG.systemPrompt
      },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const requestData = {
      model: AI_CONFIG.model,
      messages: formattedMessages,
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
      stream: false,
      // Optimize for Gemma 3 4B performance
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    };

    console.log('📤 Request data for Gemma 3 4B:', JSON.stringify(requestData, null, 2));
    
    // Simulate minimum typing time for better UX
    const startTime = Date.now();
    
    const response = await axios.post(
      AI_CONFIG.apiUrl,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'AI Customer Support - Gemma 3 4B'
        },
        timeout: 45000
      }
    );

    // Ensure minimum typing time for realistic feel
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, AI_CONFIG.minTypingTime - elapsedTime);
    
    if (remainingTime > 0) {
      await simulateTyping(remainingTime);
    }

    console.log('📥 OpenRouter Gemma 3 4B response:', response.data);

    // Extract the AI response from OpenRouter's response format
    const aiResponse = response.data?.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      console.error('❌ No response content from Gemma 3 4B');
      throw new Error('No response content received from AI service');
    }

    // End typing indicator
    if (onTypingEnd) onTypingEnd();

    return aiResponse.trim();

  } catch (error) {
    // End typing indicator on error
    if (onTypingEnd) onTypingEnd();
    
    console.error('💥 OpenRouter Gemma 3 4B API Error:', error.response?.data || error.message);
    console.error('📊 Error status:', error.response?.status);
    console.error('📋 Error headers:', error.response?.headers);
    
    // Enhanced error handling for better debugging
    if (error.response?.data?.error) {
      console.error('🔍 Detailed error:', error.response.data.error);
    }
    
    // Check for specific errors
    if (error.response?.status === 401) {
      throw new Error('Invalid API key - please check your OPENROUTER_API_KEY');
    } else if (error.response?.status === 402) {
      throw new Error('Insufficient credits - please check your OpenRouter account');
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded - please try again later');
    } else if (error.response?.status === 400) {
      const errorDetails = error.response?.data?.error?.message || 'Invalid request';
      throw new Error(`Invalid request to AI service: ${errorDetails}`);
    } else if (error.response?.status === 503) {
      throw new Error('Gemma 3 4B model is temporarily unavailable - please try again in a moment');
    } else if (error.message.includes('OPENROUTER_API_KEY is not configured')) {
      throw new Error('AI service not properly configured');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please try again');
    }
    
    throw new Error(`AI service temporarily unavailable: ${error.response?.status || error.message}`);
  }
};

router.post('/send', messageValidation, handleValidationErrors, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.userId;

    console.log('📨 Received message from user:', userId, message);

    // Get or create chat for user
    let chat = await Chat.getOrCreateUserChat(userId);

    // Add user message
    chat.messages.push({
      role: 'user',
      content: message
    });

    let assistantMessage;
    let typingStarted = false;

    try {
      // Prepare messages for AI (Gemma 3 4B supports large context, keep last 20 messages)
      const contextMessages = chat.messages.slice(-20).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log('🚀 Sending to Gemma 3 4B AI service with context length:', contextMessages.length);
      
      // Call AI service with typing callbacks
      assistantMessage = await callAIService(
        contextMessages,
        () => {
          typingStarted = true;
          console.log('⌨️ Typing indicator started');
        },
        () => {
          console.log('✅ Typing indicator ended');
        }
      );
      
      console.log('🎯 Received Gemma 3 4B AI response:', assistantMessage);

    } catch (aiError) {
      console.error('❌ Gemma 3 4B AI service failed:', aiError.message);
      
      // Provide user-friendly error messages based on the specific error
      if (aiError.message.includes('API key')) {
        assistantMessage = "I'm sorry, but our AI service is not properly configured. Please contact our support team for immediate assistance.";
      } else if (aiError.message.includes('credits')) {
        assistantMessage = "I'm sorry, but our AI service is temporarily unavailable due to credit limits. Please contact our support team for immediate assistance, or try again later.";
      } else if (aiError.message.includes('rate limit') || aiError.message.includes('Rate limit')) {
        assistantMessage = "I'm currently handling a lot of requests. Please try again in a few moments.";
      } else if (aiError.message.includes('timeout')) {
        assistantMessage = "I'm taking a bit longer to respond than usual. Please try sending your message again.";
      } else if (aiError.message.includes('temporarily unavailable')) {
        assistantMessage = "I'm temporarily unavailable right now. Please try again in a moment.";
      } else if (aiError.message.includes('not configured')) {
        assistantMessage = "I'm sorry, but our AI service is not properly set up. Please contact our support team for help.";
      } else {
        assistantMessage = "I'm sorry, I'm experiencing technical difficulties right now. Please try again in a moment, or contact our support team if the issue persists.";
      }
    }

    // Add AI response
    chat.messages.push({
      role: 'assistant',
      content: assistantMessage
    });

    // Update chat title if it's the first exchange
    if (chat.messages.length <= 2 && (!chat.title || chat.title === 'New Chat')) {
      chat.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    }

    await chat.save();

    console.log('💾 Chat saved successfully');

    res.json({
      message: assistantMessage,
      chatId: chat._id,
      messageCount: chat.messages.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Send message error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to send message',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/typing', async (req, res) => {
  try {
    const userId = req.userId;
    
    // Simulate typing delay based on environment
    await simulateTyping(AI_CONFIG.typingDelay);
    
    res.json({
      typing: true,
      userId: userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Typing simulation error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to simulate typing'
    });
  }
});

router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.userId;

    const chats = await Chat.findUserChats(userId, parseInt(limit));

    // Add metadata
    const chatHistory = chats.map(chat => ({
      _id: chat._id,
      title: chat.title || `Chat ${chat._id.toString().slice(-4)}`,
      messageCount: chat.messages.length,
      lastMessage: chat.messages[chat.messages.length - 1],
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    }));

    res.json({ 
      chats: chatHistory,
      page: parseInt(page),
      limit: parseInt(limit),
      total: chats.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to retrieve chat history'
    });
  }
});

router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const chat = await Chat.findOne({ _id: chatId, userId });

    if (!chat) {
      return res.status(404).json({
        error: 'Chat not found',
        message: 'The requested chat does not exist or you do not have access to it'
      });
    }

    res.json({ 
      chat,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to retrieve chat'
    });
  }
});

router.delete('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const chat = await Chat.findOne({ _id: chatId, userId });

    if (!chat) {
      return res.status(404).json({
        error: 'Chat not found',
        message: 'The requested chat does not exist or you do not have access to it'
      });
    }

    // Soft delete by setting isActive to false
    chat.isActive = false;
    await chat.save();

    res.json({ 
      message: 'Chat deleted successfully',
      chatId: chat._id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to delete chat'
    });
  }
});

router.post('/new', async (req, res) => {
  try {
    const userId = req.userId;

    const newChat = new Chat({
      userId,
      messages: [],
      title: 'New Chat'
    });

    await newChat.save();

    res.status(201).json({
      message: 'New chat created successfully',
      chat: {
        _id: newChat._id,
        title: newChat.title,
        createdAt: newChat.createdAt
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create new chat error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to create new chat'
    });
  }
});

module.exports = router;

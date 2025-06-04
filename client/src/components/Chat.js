import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const Chat = ({ token }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  // Enhanced typing indicator with realistic timing
  const showTypingIndicator = (duration = 3000) => {
    setTyping(true);
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Auto-hide typing indicator after duration
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, duration);
  };

  const hideTypingIndicator = () => {
    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const fetchChatHistory = async (preserveCurrentChat = false) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📚 Chat history response:', response.data);
      
      const chats = response.data?.chats || [];
      setChatHistory(chats);
      
      // Only load the most recent chat if we're not preserving current chat
      // and if there are no messages currently displayed
      if (!preserveCurrentChat && chats.length > 0 && messages.length === 0) {
        const mostRecentChat = chats[0];
        const chatMessages = mostRecentChat?.messages || [];
        setMessages(chatMessages);
        setCurrentChatId(mostRecentChat._id);
      }
    } catch (error) {
      console.error('💥 Error fetching chat history:', error);
      console.error('📊 Error response:', error.response?.data);
      setChatHistory([]);
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        setError('Too many requests. Please wait a moment before trying again.');
      }
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { 
      role: 'user', 
      content: input.trim(), 
      timestamp: new Date() 
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    // Show typing indicator immediately
    showTypingIndicator(10000); // 10 seconds max

    try {
      console.log('📤 Sending message:', input.trim());
      
      const response = await axios.post(
        `${API_BASE_URL}/chat/send`,
        { message: input.trim() },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 50000 // 50 second timeout
        }
      );

      console.log('📥 API Response:', response.data);

      // Hide typing indicator when response arrives
      hideTypingIndicator();

      const assistantMessage = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update current chat ID if we got one back
      if (response.data.chatId) {
        setCurrentChatId(response.data.chatId);
      }
      
      // Refresh chat history but preserve current conversation
      await fetchChatHistory(true);
      
    } catch (error) {
      console.error('💥 Error sending message:', error);
      console.error('📊 Error response:', error.response?.data);
      
      // Hide typing indicator on error
      hideTypingIndicator();
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      // Handle specific error types
      if (error.response?.status === 429) {
        errorMessage = 'You\'re sending messages too quickly. Please wait a moment and try again.';
        setError('Rate limit exceeded. Please slow down your requests.');
      } else if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
        setError('Authentication error. Please refresh the page and log in again.');
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'The request took too long. Please try again.';
        setError('Request timeout. The AI service might be busy.');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      const assistantErrorMessage = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, assistantErrorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const loadChat = async (chat) => {
    try {
      setLoading(true);
      
      // Fetch the full chat details to get all messages
      const response = await axios.get(`${API_BASE_URL}/chat/${chat._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const fullChat = response.data.chat;
      const chatMessages = fullChat?.messages || [];
      setMessages(chatMessages);
      setCurrentChatId(chat._id);
      setError('');
      
      console.log('📖 Loaded chat:', chat._id, 'with', chatMessages.length, 'messages');
    } catch (error) {
      console.error('💥 Error loading chat:', error);
      
      if (error.response?.status === 429) {
        setError('Too many requests. Please wait before loading another chat.');
      } else {
        // Fallback to the messages we have
        const chatMessages = chat?.messages || [];
        setMessages(chatMessages);
        setCurrentChatId(chat._id);
      }
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setError('');
    hideTypingIndicator();
    console.log('🆕 Started new chat');
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Now';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Enhanced typing indicator component
  const TypingIndicator = () => (
    <div className="message assistant">
      <div className="message-content typing">
        <div className="typing-container">
          <span className="typing-text">AI is typing</span>
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h3>Chat History</h3>
          <button 
            onClick={startNewChat} 
            className="new-chat-btn"
            disabled={loading}
          >
            New Chat
          </button>
        </div>
        
        {error && (
          <div className="error-banner">
            <span className="error-text">{error}</span>
            <button 
              className="error-close"
              onClick={() => setError('')}
            >
              ×
            </button>
          </div>
        )}
        
        <div className="chat-list">
          {chatHistory && chatHistory.map((chat, index) => (
            <div
              key={chat._id}
              className={`chat-item ${currentChatId === chat._id ? 'active' : ''} ${loading ? 'disabled' : ''}`}
              onClick={() => !loading && loadChat(chat)}
            >
              <div className="chat-preview">
                {chat.title || `Chat ${index + 1}`}
              </div>
              <div className="chat-date">
                {new Date(chat.createdAt).toLocaleDateString()}
              </div>
              <div className="chat-message-count">
                {chat.messageCount || chat.messages?.length || 0} messages
              </div>
            </div>
          ))}
          {(!chatHistory || chatHistory.length === 0) && (
            <div className="chat-item no-chats">
              <div className="chat-preview">No previous chats</div>
            </div>
          )}
        </div>
      </div>

      <div className="chat-main">
        <div className="messages-container">
          {(!messages || messages.length === 0) && (
            <div className="welcome-message">
              <h3>Welcome to AI Customer Support!</h3>
              <p>How can I help you today?</p>
            </div>
          )}
          
          {messages && messages.map((message, index) => (
            <div key={index} className={`message ${message.role} ${message.isError ? 'error' : ''}`}>
              <div className="message-content">
                {message.content}
              </div>
              <div className="message-time">
                {formatTime(message.timestamp)}
              </div>
            </div>
          ))}
          
          {typing && <TypingIndicator />}
          
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="message-form">
          <div className="input-container">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={loading ? "Sending..." : "Type your message..."}
              disabled={loading}
              className="message-input"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="send-btn"
            >
              {loading ? (
                <span className="loading-spinner">⟳</span>
              ) : (
                'Send'
              )}
            </button>
          </div>
          {input.length > 1800 && (
            <div className="character-count">
              {input.length}/2000 characters
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Chat;

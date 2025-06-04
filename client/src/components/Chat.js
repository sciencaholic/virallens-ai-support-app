import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const Chat = ({ token }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const fetchChatHistory = async (preserveCurrentChat = false) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Chat history response:', response.data);
      
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
      console.error('Error fetching chat history:', error);
      console.error('Error response:', error.response?.data);
      setChatHistory([]);
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

    try {
      console.log('Sending message:', input.trim());
      
      const response = await axios.post(
        `${API_BASE_URL}/chat/send`,
        { message: input.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('API Response:', response.data);

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
      console.error('Error sending message:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const loadChat = async (chat) => {
    try {
      // Fetch the full chat details to get all messages
      const response = await axios.get(`${API_BASE_URL}/chat/${chat._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const fullChat = response.data.chat;
      const chatMessages = fullChat?.messages || [];
      setMessages(chatMessages);
      setCurrentChatId(chat._id);
      
      console.log('Loaded chat:', chat._id, 'with', chatMessages.length, 'messages');
    } catch (error) {
      console.error('Error loading chat:', error);
      // Fallback to the messages we have
      const chatMessages = chat?.messages || [];
      setMessages(chatMessages);
      setCurrentChatId(chat._id);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    console.log('Started new chat');
  };

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h3>Chat History</h3>
          <button onClick={startNewChat} className="new-chat-btn">
            New Chat
          </button>
        </div>
        <div className="chat-list">
          {chatHistory && chatHistory.map((chat, index) => (
            <div
              key={chat._id}
              className={`chat-item ${currentChatId === chat._id ? 'active' : ''}`}
              onClick={() => loadChat(chat)}
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
              <h3>Welcome to Virallens AI Customer Support!</h3>
              <p>How can I help you today?</p>
            </div>
          )}
          
          {messages && messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-content">
                {message.content}
              </div>
              <div className="message-time">
                {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'Now'}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="message assistant">
              <div className="message-content typing">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="message-form">
          <div className="input-container">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              className="message-input"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="send-btn"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;

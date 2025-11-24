import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Styling/messages.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
        setUnreadCount(data.totalUnread);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_URL}/messages/conversations/${conversationId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
        // Update conversation list to reflect read status
        fetchConversations();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fetchConversations]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/messages/messages/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
    fetchUnreadCount();
    
    // Poll for new messages every 10 seconds
    const interval = setInterval(() => {
      if (selectedConversation) {
        fetchMessages(selectedConversation.conversation_id, true);
      }
      fetchUnreadCount();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchConversations, fetchMessages, fetchUnreadCount, selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleConversationClick = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.conversation_id);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_URL}/messages/conversations/${selectedConversation.conversation_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ messageText: newMessage })
        }
      );

      const data = await response.json();
      if (data.success) {
        setMessages([...messages, data.message]);
        setNewMessage('');
        fetchConversations(); // Update conversation list
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="messages-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      {/* Conversations Sidebar */}
      <div className="conversations-sidebar">
        <div className="sidebar-header">
          <h2>Messages</h2>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>

        {conversations.length === 0 ? (
          <div className="empty-state">
            <p>📭 No conversations yet</p>
            <small>Start a conversation by placing an order with a farmer</small>
          </div>
        ) : (
          <div className="conversations-list">
            {conversations.map((conv) => (
              <div
                key={conv.conversation_id}
                className={`conversation-item ${selectedConversation?.conversation_id === conv.conversation_id ? 'active' : ''} ${conv.unread_count > 0 ? 'unread' : ''}`}
                onClick={() => handleConversationClick(conv)}
              >
                <div className="conversation-avatar">
                  {conv.other_party_type === 'farmer' ? '🌾' : '🛒'}
                </div>
                <div className="conversation-details">
                  <div className="conversation-header">
                    <h4>{conv.other_party_name}</h4>
                    <span className="conversation-time">
                      {formatTimestamp(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="conversation-preview">
                    <p className={conv.unread_count > 0 ? 'unread-text' : ''}>
                      {conv.last_message || 'Start a conversation...'}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="unread-count">{conv.unread_count}</span>
                    )}
                  </div>
                  {conv.order_id && (
                    <div className="conversation-order">
                      Order #{conv.order_id}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="messages-area">
        {!selectedConversation ? (
          <div className="empty-chat-state">
            <div className="empty-chat-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the left to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-participant">
                <div className="participant-avatar">
                  {selectedConversation.other_party_type === 'farmer' ? '🌾' : '🛒'}
                </div>
                <div className="participant-info">
                  <h3>{selectedConversation.other_party_name}</h3>
                  {selectedConversation.subject && (
                    <p className="chat-subject">{selectedConversation.subject}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages List */}
            <div className="messages-list">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.message_id}
                    className={`message ${msg.is_own_message ? 'own-message' : 'other-message'}`}
                  >
                    <div className="message-bubble">
                      {!msg.is_own_message && (
                        <div className="message-sender">{msg.sender_name}</div>
                      )}
                      <div className="message-text">{msg.message_text}</div>
                      <div className="message-meta">
                        <span className="message-time">
                          {formatTimestamp(msg.created_at)}
                        </span>
                        {msg.is_own_message && msg.is_read && (
                          <span className="read-indicator" title="Read">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form className="message-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="message-input"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
                maxLength={5000}
              />
              <button
                type="submit"
                className="send-button"
                disabled={!newMessage.trim() || sending}
              >
                {sending ? '⏳' : '📤'} Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Messages;

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/client';
import '../styles/Chat.css';

interface ChatProps {
  playerId: string;
  playerName: string;
}

const Chat: React.FC<ChatProps> = ({ playerId, playerName }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load and subscribe to messages
  useEffect(() => {
    setIsLoading(true);
    
    // Load existing messages
    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(50);
          
        if (error) {
          console.error('Error loading messages:', error);
        } else {
          console.log(`Loaded ${data.length} messages`);
          setMessages(data || []);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Exception loading messages:', err);
        setIsLoading(false);
      }
    };
    
    loadMessages();
    
    // Subscribe to new messages
    const channel = supabase.channel('public:chat_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        console.log('New message received:', payload.new);
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });
      
    return () => {
      channel.unsubscribe();
    };
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Send a message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          player_id: playerId,
          player_name: playerName || `Player ${playerId.slice(-4)}`,
          content: newMessage
        });
        
      if (error) {
        console.error('Error sending message:', error);
        alert(`Error sending message: ${error.message}`);
      } else {
        setNewMessage('');
      }
    } catch (err) {
      console.error('Exception sending message:', err);
    }
  };
  
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <div className={`chat-widget ${isMinimized ? 'minimized' : ''}`}>
      <div className="chat-header">
        <span className="chat-title">Town Chat</span>
        <div className="chat-controls">
          <span className="message-count">{messages.length}</span>
          <button 
            onClick={toggleMinimize} 
            className="toggle-button"
          >
            {isMinimized ? '↑' : '↓'}
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          <div className="chat-messages">
            {isLoading ? (
              <div className="loading-message">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="empty-message">No messages yet. Be the first to say hello!</div>
            ) : (
              messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`message ${msg.player_id === playerId ? 'own-message' : 'other-message'}`}
                >
                  <div className="message-sender">
                    {msg.player_id === playerId ? 'You' : msg.player_name}
                  </div>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={sendMessage} className="message-form">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="message-input"
            />
            <button type="submit" className="send-button">
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default Chat; 
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/client';

interface ChatProps {
  playerId: string;
  playerName: string;
}

const Chat: React.FC<ChatProps> = ({ playerId, playerName }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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
  
  return (
    <div className="chat-container" style={{
      position: 'absolute',
      bottom: '10px',
      right: '10px',
      width: '300px',
      height: '300px',
      background: 'rgba(0,0,0,0.8)',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div className="chat-header" style={{
        padding: '10px 15px',
        background: 'rgba(0,0,0,0.5)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ 
          fontWeight: 'bold', 
          color: 'white',
          fontSize: '14px'
        }}>
          Town Chat
        </span>
        <span style={{ 
          fontSize: '12px', 
          color: '#aaa' 
        }}>
          {messages.length} messages
        </span>
      </div>
      
      <div className="messages" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {isLoading ? (
          <div style={{ 
            color: '#aaa', 
            textAlign: 'center', 
            margin: '20px 0',
            fontSize: '14px'
          }}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ 
            color: '#aaa', 
            textAlign: 'center', 
            margin: '20px 0',
            fontSize: '14px'
          }}>
            No messages yet. Be the first to say hello!
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{
              padding: '8px 12px',
              borderRadius: '12px',
              background: msg.player_id === playerId ? '#1e88e5' : '#424242',
              alignSelf: msg.player_id === playerId ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              color: 'white',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}>
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: '12px',
                marginBottom: '3px',
                color: msg.player_id === playerId ? 'white' : '#8bc34a'
              }}>
                {msg.player_id === playerId ? 'You' : msg.player_name}
              </div>
              <div style={{ fontSize: '14px' }}>{msg.content}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={sendMessage} style={{
        display: 'flex',
        padding: '10px',
        background: 'rgba(0,0,0,0.5)',
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '20px 0 0 20px',
            border: 'none',
            background: '#333',
            color: 'white',
            fontSize: '14px'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 15px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '0 20px 20px 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat; 
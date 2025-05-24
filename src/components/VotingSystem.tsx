import React, { useState, useEffect } from 'react';
import type { VoteEvent } from '../types/game';
import '../styles/VotingSystem.css';

// Mock vote events - in a real app, these would come from Supabase
const MOCK_EVENTS: VoteEvent[] = [
  { id: '1', name: 'Rain', votes: 0, active: true },
  { id: '2', name: 'Night Mode', votes: 0, active: true },
  { id: '3', name: 'Market Party', votes: 0, active: true },
];

interface VotingSystemProps {
  playerId: string;
  onVoteResult?: (event: VoteEvent) => void;
}

const VotingSystem: React.FC<VotingSystemProps> = ({ playerId, onVoteResult }) => {
  const [events, setEvents] = useState<VoteEvent[]>(MOCK_EVENTS);
  const [votedEvent, setVotedEvent] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  
  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      // Find winning event
      const winningEvent = [...events].sort((a, b) => b.votes - a.votes)[0];
      
      // Trigger callback with winning event
      if (onVoteResult && winningEvent) {
        onVoteResult(winningEvent);
      }
      
      // Reset votes and timer
      setEvents(MOCK_EVENTS);
      setVotedEvent(null);
      setTimeLeft(120);
      return;
    }
    
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft, events, onVoteResult]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Handle vote
  const handleVote = (eventId: string) => {
    if (votedEvent === eventId) {
      // Cancel vote
      setEvents(events.map(event => 
        event.id === eventId ? { ...event, votes: event.votes - 1 } : event
      ));
      setVotedEvent(null);
    } else if (votedEvent) {
      // Change vote
      setEvents(events.map(event => 
        event.id === eventId ? { ...event, votes: event.votes + 1 } : 
        event.id === votedEvent ? { ...event, votes: event.votes - 1 } : event
      ));
      setVotedEvent(eventId);
    } else {
      // New vote
      setEvents(events.map(event => 
        event.id === eventId ? { ...event, votes: event.votes + 1 } : event
      ));
      setVotedEvent(eventId);
    }
  };
  
  return (
    <div className="voting-system">
      <div className="voting-header">
        <h3>Event Voting</h3>
        <div className="voting-timer">{formatTime(timeLeft)}</div>
      </div>
      
      <div className="voting-events">
        {events.map(event => (
          <div 
            key={event.id} 
            className={`voting-event ${votedEvent === event.id ? 'voted' : ''}`}
            onClick={() => handleVote(event.id)}
          >
            <div className="event-name">{event.name}</div>
            <div className="event-votes">{event.votes} votes</div>
            <div className="vote-progress" style={{ width: `${(event.votes / Math.max(1, events.reduce((sum, e) => sum + e.votes, 0))) * 100}%` }}></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VotingSystem; 
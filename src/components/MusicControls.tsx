import React, { useState, useEffect } from 'react';
import audioPlayer from '../game/AudioPlayer';
import '../styles/MusicControls.css';

const MusicControls: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isAudioDisabled, setIsAudioDisabled] = useState(true); // Assume audio is disabled by default

  useEffect(() => {
    // Initialize audio on first user interaction
    const initAudio = () => {
      if (!audioInitialized) {
        try {
          audioPlayer.initAudio();
          setAudioInitialized(true);
          
          // Don't automatically play music since we're in disabled mode
          setIsPlaying(false);
          
          // Remove the event listeners once audio is initialized
          document.removeEventListener('click', initAudio);
          document.removeEventListener('keydown', initAudio);
        } catch (err) {
          console.warn('Could not initialize audio', err);
        }
      }
    };
    
    // Add event listeners for user interaction
    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
  }, [audioInitialized]);

  const handlePlayPause = () => {
    // Check if audio is disabled
    if (isAudioDisabled) {
      console.log('Audio is disabled - cannot play/pause');
      return;
    }
    
    if (!audioInitialized) {
      audioPlayer.initAudio();
      setAudioInitialized(true);
    }
    
    if (isPlaying) {
      audioPlayer.pauseMusic();
    } else {
      audioPlayer.playMusic();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check if audio is disabled
    if (isAudioDisabled) {
      console.log('Audio is disabled - cannot change volume');
      return;
    }
    
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    audioPlayer.setMusicVolume(newVolume / 100);
  };

  const handleMuteToggle = () => {
    // Check if audio is disabled
    if (isAudioDisabled) {
      console.log('Audio is disabled - cannot toggle mute');
      return;
    }
    
    if (!audioInitialized) {
      audioPlayer.initAudio();
      setAudioInitialized(true);
    }
    
    audioPlayer.toggleMute();
    setIsMuted(!isMuted);
  };

  // Enable audio for testing (this would normally be connected to actual audio files being loaded)
  const handleEnableAudio = () => {
    audioPlayer.enableAudio(!isAudioDisabled);
    setIsAudioDisabled(!isAudioDisabled);
  };

  return (
    <div className="music-controls">
      <div className="audio-status">
        {isAudioDisabled ? (
          <div className="audio-disabled-message">
            <span>🔇 Audio disabled</span>
            <button className="enable-audio-button" onClick={handleEnableAudio}>
              {isAudioDisabled ? "Enable Audio" : "Disable Audio"}
            </button>
          </div>
        ) : (
          <>
            <button className="music-button" onClick={handlePlayPause} disabled={isAudioDisabled}>
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button className="music-button" onClick={handleMuteToggle} disabled={isAudioDisabled}>
              {isMuted ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
              disabled={isAudioDisabled}
            />
            <button className="enable-audio-button" onClick={handleEnableAudio}>
              Disable Audio
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MusicControls; 
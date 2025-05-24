import { Howl } from 'howler';

class AudioPlayer {
  private bgMusic: Howl | null = null;
  private sfx: Record<string, Howl> = {};
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private isMuted: boolean = false;
  private audioAvailable: boolean = false;
  private isAudioDisabled: boolean = true; // Flag to completely disable audio

  constructor() {
    // Start with disabled audio by default
    this.audioAvailable = false;
    this.isAudioDisabled = true;
    
    console.log('Audio system initialized in disabled mode - no audio files available');
  }

  // Initialize audio after user interaction
  public initAudio() {
    if (this.isAudioDisabled) {
      // If audio is disabled, don't try to load files
      return;
    }
    
    if (this.audioAvailable) return; // Already initialized
    
    try {
      // Initialize background music with error handling
      this.bgMusic = new Howl({
        src: ['/audio/lofi-background.mp3'],
        loop: true,
        volume: this.musicVolume,
        autoplay: false,
        onloaderror: () => {
          console.warn('Background music file not found. Audio will be disabled.');
          this.audioAvailable = false;
        }
      });

      // Initialize sound effects with error handling
      this.sfx = {
        place: new Howl({
          src: ['/audio/place.mp3'],
          volume: this.sfxVolume,
          onloaderror: () => {
            console.warn('Place sound effect file not found.');
          }
        }),
        click: new Howl({
          src: ['/audio/click.mp3'],
          volume: this.sfxVolume,
          onloaderror: () => {
            console.warn('Click sound effect file not found.');
          }
        }),
      };
      
      this.audioAvailable = true;
    } catch (err) {
      console.warn('Error initializing audio:', err);
      this.audioAvailable = false;
    }
  }

  // Helper method to enable audio if files become available in the future
  public enableAudio(enable: boolean = true): void {
    this.isAudioDisabled = !enable;
    if (enable) {
      console.log('Audio system enabled - will try to load audio files if they exist');
      this.initAudio();
    } else {
      console.log('Audio system disabled');
      this.audioAvailable = false;
    }
  }

  public playMusic(): void {
    if (this.isAudioDisabled) return;
    
    if (!this.audioAvailable) {
      this.initAudio();
      if (!this.audioAvailable) return;
    }
    
    if (this.bgMusic && !this.bgMusic.playing()) {
      try {
        this.bgMusic.play();
      } catch (err) {
        console.warn('Error playing music:', err);
      }
    }
  }

  public pauseMusic(): void {
    if (this.isAudioDisabled || !this.audioAvailable) return;
    
    if (this.bgMusic && this.bgMusic.playing()) {
      try {
        this.bgMusic.pause();
      } catch (err) {
        console.warn('Error pausing music:', err);
      }
    }
  }

  public playSfx(name: string): void {
    if (this.isAudioDisabled) return;
    
    if (!this.audioAvailable) {
      this.initAudio();
      if (!this.audioAvailable) return;
    }
    
    if (this.sfx[name] && !this.isMuted) {
      try {
        this.sfx[name].play();
      } catch (err) {
        console.warn(`Error playing ${name} sound:`, err);
      }
    }
  }

  public setMusicVolume(volume: number): void {
    if (this.isAudioDisabled || !this.audioAvailable) return;
    
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.bgMusic) {
      this.bgMusic.volume(this.musicVolume);
    }
  }

  public setSfxVolume(volume: number): void {
    if (this.isAudioDisabled || !this.audioAvailable) return;
    
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    Object.values(this.sfx).forEach(sound => {
      sound.volume(this.sfxVolume);
    });
  }

  public mute(): void {
    if (this.isAudioDisabled || !this.audioAvailable) return;
    
    this.isMuted = true;
    if (this.bgMusic) {
      this.bgMusic.volume(0);
    }
    Object.values(this.sfx).forEach(sound => {
      sound.volume(0);
    });
  }

  public unmute(): void {
    if (this.isAudioDisabled || !this.audioAvailable) return;
    
    this.isMuted = false;
    if (this.bgMusic) {
      this.bgMusic.volume(this.musicVolume);
    }
    Object.values(this.sfx).forEach(sound => {
      sound.volume(this.sfxVolume);
    });
  }

  public toggleMute(): void {
    if (this.isAudioDisabled || !this.audioAvailable) return;
    
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }
}

// Export as singleton
const audioPlayer = new AudioPlayer();
export default audioPlayer; 
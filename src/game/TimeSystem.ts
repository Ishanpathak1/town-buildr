export type GameTime = {
  day: number;
  hour: number;
  minute: number;
  isDayTime: boolean;
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
};

// Initialize game time
export const initializeGameTime = (): GameTime => {
  return {
    day: 1,
    hour: 8, // Start at 8 AM
    minute: 0,
    isDayTime: true,
    timeOfDay: 'day'
  };
};

// Update game time (call this every second)
export const updateGameTime = (currentTime: GameTime): GameTime => {
  // Advance time (1 real second = 10 game minutes)
  let newMinute = currentTime.minute + 10;
  let newHour = currentTime.hour;
  let newDay = currentTime.day;
  
  if (newMinute >= 60) {
    newMinute = 0;
    newHour++;
    
    if (newHour >= 24) {
      newHour = 0;
      newDay++;
    }
  }
  
  // Determine time of day
  let timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
  let isDayTime: boolean;
  
  if (newHour >= 5 && newHour < 7) {
    timeOfDay = 'dawn';
    isDayTime = true;
  } else if (newHour >= 7 && newHour < 19) {
    timeOfDay = 'day';
    isDayTime = true;
  } else if (newHour >= 19 && newHour < 21) {
    timeOfDay = 'dusk';
    isDayTime = false;
  } else {
    timeOfDay = 'night';
    isDayTime = false;
  }
  
  return {
    day: newDay,
    hour: newHour,
    minute: newMinute,
    isDayTime,
    timeOfDay
  };
};

// Format game time for display
export const formatGameTime = (time: GameTime): string => {
  const hourDisplay = time.hour % 12 === 0 ? 12 : time.hour % 12;
  const amPm = time.hour < 12 ? 'AM' : 'PM';
  const minuteDisplay = time.minute.toString().padStart(2, '0');
  
  return `Day ${time.day} - ${hourDisplay}:${minuteDisplay} ${amPm}`;
}; 
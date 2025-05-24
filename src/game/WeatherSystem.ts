export type WeatherType = 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy';

export type Weather = {
  type: WeatherType;
  intensity: number; // 0-10
  duration: number; // In game hours
  timeRemaining: number; // In game hours
  effects: {
    visualFilter: string;
    scoreMultiplier: number;
  };
};

// Weather definitions
const WEATHER_TYPES: Record<WeatherType, Omit<Weather, 'timeRemaining'>> = {
  clear: {
    type: 'clear',
    intensity: 0,
    duration: 8,
    effects: {
      visualFilter: 'none',
      scoreMultiplier: 1.0
    }
  },
  cloudy: {
    type: 'cloudy',
    intensity: 3,
    duration: 6,
    effects: {
      visualFilter: 'brightness(0.9)',
      scoreMultiplier: 0.9
    }
  },
  rainy: {
    type: 'rainy',
    intensity: 6,
    duration: 4,
    effects: {
      visualFilter: 'brightness(0.8) saturate(1.2)',
      scoreMultiplier: 0.8
    }
  },
  stormy: {
    type: 'stormy',
    intensity: 9,
    duration: 2,
    effects: {
      visualFilter: 'brightness(0.7) contrast(1.1)',
      scoreMultiplier: 0.7
    }
  },
  snowy: {
    type: 'snowy',
    intensity: 7,
    duration: 5,
    effects: {
      visualFilter: 'brightness(1.1) contrast(0.9) saturate(0.8)',
      scoreMultiplier: 0.85
    }
  },
  foggy: {
    type: 'foggy',
    intensity: 5,
    duration: 3,
    effects: {
      visualFilter: 'brightness(0.95) contrast(0.9) blur(2px)',
      scoreMultiplier: 0.75
    }
  }
};

// Generate random weather
export const generateWeather = (): Weather => {
  const weatherTypes: WeatherType[] = ['clear', 'cloudy', 'rainy', 'stormy', 'snowy', 'foggy'];
  const weights = [0.5, 0.25, 0.1, 0.05, 0.05, 0.05]; // Clear weather is most common
  
  // Weighted random selection
  let random = Math.random();
  let cumulativeWeight = 0;
  let selectedType: WeatherType = 'clear';
  
  for (let i = 0; i < weatherTypes.length; i++) {
    cumulativeWeight += weights[i];
    if (random <= cumulativeWeight) {
      selectedType = weatherTypes[i];
      break;
    }
  }
  
  const baseWeather = WEATHER_TYPES[selectedType];
  
  return {
    ...baseWeather,
    timeRemaining: baseWeather.duration
  };
};

// Update weather based on game time
export const updateWeather = (currentWeather: Weather, gameHoursPassed: number): Weather => {
  const newTimeRemaining = currentWeather.timeRemaining - gameHoursPassed;
  
  // If weather has ended, generate new weather
  if (newTimeRemaining <= 0) {
    return generateWeather();
  }
  
  // Otherwise, update the time remaining
  return {
    ...currentWeather,
    timeRemaining: newTimeRemaining
  };
}; 
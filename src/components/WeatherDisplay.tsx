import React from 'react';
import type { Weather } from '../game/WeatherSystem';
import type { GameTime } from '../game/TimeSystem';
import { formatGameTime } from '../game/TimeSystem';
import '../styles/WeatherDisplay.css';

interface WeatherDisplayProps {
  weather: Weather;
  gameTime: GameTime;
}

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ weather, gameTime }) => {
  const getWeatherIcon = (type: Weather['type']) => {
    switch (type) {
      case 'clear': return gameTime.isDayTime ? '☀️' : '🌙';
      case 'cloudy': return gameTime.isDayTime ? '⛅' : '☁️';
      case 'rainy': return '🌧️';
      case 'stormy': return '⛈️';
      case 'snowy': return '❄️';
      case 'foggy': return '🌫️';
      default: return '☀️';
    }
  };
  
  const getWeatherDescription = (type: Weather['type']) => {
    switch (type) {
      case 'clear': return gameTime.isDayTime ? 'Clear skies' : 'Clear night';
      case 'cloudy': return 'Cloudy';
      case 'rainy': return 'Rainy';
      case 'stormy': return 'Thunderstorms';
      case 'snowy': return 'Snowy';
      case 'foggy': return 'Foggy';
      default: return 'Clear';
    }
  };
  
  return (
    <div className="weather-display" data-weather={weather.type}>
      <div className="time-display">
        {formatGameTime(gameTime)}
      </div>
      
      <div className="weather-info">
        <div className="weather-icon">
          {getWeatherIcon(weather.type)}
        </div>
        <div className="weather-details">
          <div className="weather-type">
            {getWeatherDescription(weather.type)}
          </div>
          <div className="weather-intensity">
            {Array(Math.ceil(weather.intensity / 2)).fill('•').join('')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherDisplay; 
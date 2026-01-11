import React, { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, Sun, CloudRain, AlertTriangle, MapPin, RefreshCw, Loader2, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FormattedContent } from '@/components/FormattedContent';

interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  condition: string;
  description: string;
  location: string;
  icon: string;
  forecast: Array<{
    day: string;
    high: number;
    low: number;
    condition: string;
    icon: string;
  }>;
  alerts: string[];
}

// OpenWeatherMap API - Free tier (1000 calls/day)
const WEATHER_API_KEY = '4d8fb5b93d4af21d66a2948710284366'; // Free demo key

const getWeatherIcon = (iconCode: string) => {
  // Map OpenWeatherMap icon codes to conditions
  if (iconCode.includes('01')) return 'sunny';
  if (iconCode.includes('02') || iconCode.includes('03') || iconCode.includes('04')) return 'cloudy';
  if (iconCode.includes('09') || iconCode.includes('10') || iconCode.includes('11')) return 'rainy';
  return 'cloudy';
};

const WeatherIcon: React.FC<{ condition: string; className?: string }> = ({ condition, className = 'h-8 w-8' }) => {
  switch (condition) {
    case 'sunny':
      return <Sun className={`${className} text-sun`} />;
    case 'rainy':
      return <CloudRain className={`${className} text-rain`} />;
    case 'cloudy':
    default:
      return <Cloud className={`${className} text-muted-foreground`} />;
  }
};

export const WeatherWidget: React.FC = () => {
  const { t, language } = useLanguage();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('Fetching location...');
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Use OpenWeatherMap's reverse geocoding for accurate location
  const getLocationName = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${WEATHER_API_KEY}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const { name, state, country } = data[0];
          // Return city, state if available, else city, country
          if (state) {
            return `${name}, ${state}, ${country}`;
          }
          return `${name}, ${country}`;
        }
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }
    return 'Unknown Location';
  };

  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch accurate location name using reverse geocoding
      const accurateLocation = await getLocationName(lat, lon);
      setLocationName(accurateLocation);

      // Fetch current weather
      const currentResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
      );
      
      if (!currentResponse.ok) throw new Error('Failed to fetch weather');
      const currentData = await currentResponse.json();

      // Fetch 5-day forecast
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
      );
      
      if (!forecastResponse.ok) throw new Error('Failed to fetch forecast');
      const forecastData = await forecastResponse.json();

      // Process forecast data - get daily highs/lows
      const dailyForecast: WeatherData['forecast'] = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const processedDays = new Set<string>();

      for (const item of forecastData.list) {
        const date = new Date(item.dt * 1000);
        const dayName = days[date.getDay()];
        
        if (!processedDays.has(dayName) && dailyForecast.length < 7) {
          processedDays.add(dayName);
          dailyForecast.push({
            day: dayName,
            high: Math.round(item.main.temp_max),
            low: Math.round(item.main.temp_min),
            condition: getWeatherIcon(item.weather[0].icon),
            icon: item.weather[0].icon,
          });
        }
      }

      // Generate smart alerts based on weather
      const alerts: string[] = [];
      const temp = currentData.main.temp;
      const humidity = currentData.main.humidity;
      const windSpeed = currentData.wind.speed * 3.6; // Convert m/s to km/h

      if (temp > 40) alerts.push('🌡️ Extreme heat warning - Provide shade for crops and increase irrigation');
      if (temp < 5) alerts.push('❄️ Frost warning - Protect sensitive crops');
      if (humidity > 85) alerts.push('💧 High humidity - Watch for fungal diseases');
      if (windSpeed > 50) alerts.push('💨 Strong winds expected - Secure farm equipment');
      if (currentData.weather[0].main === 'Rain') alerts.push('🌧️ Rain expected - Postpone pesticide application');

      const weatherData: WeatherData = {
        temperature: Math.round(currentData.main.temp),
        humidity: currentData.main.humidity,
        rainfall: currentData.rain?.['1h'] || 0,
        windSpeed: Math.round(windSpeed),
        condition: getWeatherIcon(currentData.weather[0].icon),
        description: currentData.weather[0].description,
        location: accurateLocation,
        icon: currentData.weather[0].icon,
        forecast: dailyForecast,
        alerts,
      };

      setWeather(weatherData);
      
      // Fetch AI recommendations
      fetchRecommendations(weatherData);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (weatherData: WeatherData) => {
    try {
      setLoadingRecommendations(true);
      setRecommendations(null);
      
      const { data, error } = await supabase.functions.invoke('weather-recommendations', {
        body: { weatherData, language },
      });

      if (error) {
        console.error('Recommendations error:', error);
        toast({
          title: t('error') || 'Error',
          description: t('failedToGetRecommendations') || 'Failed to get farming recommendations',
          variant: 'destructive',
        });
        return;
      }

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error('Recommendations fetch error:', err);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const getLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherData(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          console.error('Geolocation error:', err);
          // Default to a location in India if geolocation fails
          fetchWeatherData(25.3176, 82.9739); // Varanasi
          setLocationName('Varanasi, IN (Default)');
        }
      );
    } else {
      // Fallback to default location
      fetchWeatherData(25.3176, 82.9739);
      setLocationName('Varanasi, IN (Default)');
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  const handleRefresh = () => {
    getLocation();
  };

  if (loading) {
    return (
      <Card variant="glass" className="overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">{t('fetchingWeather') || 'Fetching weather data...'}</p>
          <p className="text-sm text-muted-foreground mt-2">{locationName}</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card variant="glass" className="overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="h-10 w-10 text-harvest mb-4" />
          <p className="text-muted-foreground">{error || 'Unable to load weather'}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('retry') || 'Retry'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="overflow-hidden">
      <CardHeader className="gradient-sky text-accent-foreground pb-8">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-accent-foreground">
            <Cloud className="h-5 w-5" />
            {t('todayWeather')}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-accent-foreground hover:bg-white/20"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <WeatherIcon condition={weather.condition} className="h-16 w-16" />
            <div>
              <div className="text-5xl font-bold">{weather.temperature}°C</div>
              <div className="text-sm opacity-80 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {weather.location}
              </div>
              <div className="text-xs opacity-70 capitalize mt-1">{weather.description}</div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {/* Current Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
            <Droplets className="h-5 w-5 text-rain mb-1" />
            <span className="text-xs text-muted-foreground">{t('humidity')}</span>
            <span className="font-bold">{weather.humidity}%</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
            <CloudRain className="h-5 w-5 text-rain mb-1" />
            <span className="text-xs text-muted-foreground">{t('rainfall')}</span>
            <span className="font-bold">{weather.rainfall}mm</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
            <Wind className="h-5 w-5 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">{t('windSpeed')}</span>
            <span className="font-bold">{weather.windSpeed} km/h</span>
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-3">{t('forecast') || '5-Day Forecast'}</h4>
          <div className="flex gap-2 overflow-x-auto scroll-hidden pb-2">
            {weather.forecast.map((day, i) => (
              <div 
                key={day.day + i} 
                className={`flex-shrink-0 flex flex-col items-center p-3 rounded-xl ${
                  i === 0 ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/50'
                }`}
              >
                <span className="text-xs font-medium">{day.day}</span>
                <WeatherIcon condition={day.condition} className="h-6 w-6 my-1" />
                <span className="text-xs font-bold">{day.high}°</span>
                <span className="text-xs text-muted-foreground">{day.low}°</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {weather.alerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-harvest" />
              {t('alerts')}
            </h4>
            {weather.alerts.map((alert, i) => (
              <div key={i} className="p-3 rounded-xl bg-harvest/10 border border-harvest/20 text-sm">
                {alert}
              </div>
            ))}
          </div>
        )}

        {/* AI Farming Recommendations */}
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            {t('farmingRecommendations') || 'AI Farming Recommendations'}
          </h4>
          {loadingRecommendations ? (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">{t('gettingRecommendations') || 'Getting recommendations...'}</span>
            </div>
          ) : recommendations ? (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <FormattedContent content={recommendations} />
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-muted/50 text-sm text-muted-foreground text-center">
              {t('noRecommendations') || 'No recommendations available'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

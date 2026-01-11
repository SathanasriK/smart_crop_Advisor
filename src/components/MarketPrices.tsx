import React, { useState } from 'react';
import { TrendingUp, TrendingDown, IndianRupee, MapPin, RefreshCw, Loader2, Calendar, Search, Navigation, ExternalLink, ChevronRight, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FormattedContent } from '@/components/FormattedContent';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface Market {
  name: string;
  price: number;
  distance: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface TrendData {
  day: string;
  date: string;
  price: number;
}

interface PredictionData {
  day: string;
  date: string;
  predictedPrice: number;
  confidence: string;
}

interface CropPrice {
  crop: string;
  currentPrice: number;
  previousPrice: number;
  unit: string;
  trend: string;
  markets: Market[];
  priceTrend: TrendData[];
  predictions: PredictionData[];
  recommendation: string;
}

interface MarketData {
  prices: CropPrice[];
  summary: string;
  queriedDate: string;
  location: string;
}

const POPULAR_CROPS = [
  'Wheat', 'Rice', 'Maize', 'Sugarcane', 'Cotton', 'Soybean', 
  'Groundnut', 'Mustard', 'Potato', 'Onion', 'Tomato', 'Chilli',
  'Turmeric', 'Ginger', 'Pulses', 'Jowar', 'Bajra', 'Ragi'
];

const getLanguageName = (code: string): string => {
  const languages: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    ta: 'Tamil',
    te: 'Telugu',
    mr: 'Marathi',
    gu: 'Gujarati',
    kn: 'Kannada',
    pa: 'Punjabi',
    bn: 'Bengali',
  };
  return languages[code] || 'English';
};

type Step = 'select-crops' | 'select-date' | 'select-location' | 'results';

export const MarketPrices: React.FC = () => {
  const { t, language } = useLanguage();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('select-crops');
  
  // Selection states
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [customCrop, setCustomCrop] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  // Results states
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropPrice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const toggleCrop = (crop: string) => {
    if (selectedCrops.includes(crop)) {
      setSelectedCrops(selectedCrops.filter(c => c !== crop));
    } else if (selectedCrops.length < 5) {
      setSelectedCrops([...selectedCrops, crop]);
    } else {
      toast.error('Maximum 5 crops can be selected');
    }
  };

  const addCustomCrop = () => {
    if (customCrop.trim() && !selectedCrops.includes(customCrop.trim())) {
      if (selectedCrops.length < 5) {
        setSelectedCrops([...selectedCrops, customCrop.trim()]);
        setCustomCrop('');
      } else {
        toast.error('Maximum 5 crops can be selected');
      }
    }
  };

  // Use reverse geocoding to get accurate location name
  const getLocationName = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lng}&limit=1&appid=4d8fb5b93d4af21d66a2948710284366`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const { name, state, country } = data[0];
          if (state) {
            return `${name}, ${state}`;
          }
          return `${name}, ${country}`;
        }
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }
    return 'Current Location';
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setCurrentCoords({ lat, lng });
          setUseCurrentLocation(true);
          
          // Get accurate location name
          const locationName = await getLocationName(lat, lng);
          setLocation(locationName);
          toast.success(`Location: ${locationName}`);
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Could not get current location');
        }
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  const getGoogleMapsDirectionsUrl = (market: Market) => {
    const destination = market.address || market.name;
    if (currentCoords) {
      return `https://www.google.com/maps/dir/${currentCoords.lat},${currentCoords.lng}/${encodeURIComponent(destination)}`;
    } else if (location) {
      return `https://www.google.com/maps/dir/${encodeURIComponent(location)}/${encodeURIComponent(destination)}`;
    }
    return `https://www.google.com/maps/search/${encodeURIComponent(destination)}`;
  };

  const fetchMarketPrices = async () => {
    if (selectedCrops.length === 0) {
      toast.error('Please select at least one crop');
      return;
    }

    setIsLoading(true);
    try {
      const dateRange = endDate 
        ? { startDate: format(startDate!, 'yyyy-MM-dd'), endDate: format(endDate, 'yyyy-MM-dd') }
        : { date: format(startDate!, 'yyyy-MM-dd') };

      const { data, error } = await supabase.functions.invoke('get-market-prices', {
        body: { 
          crops: selectedCrops,
          location: location || 'India',
          language: getLanguageName(language),
          ...dateRange,
          coordinates: currentCoords
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.prices) {
        setMarketData(data);
        setSelectedCrop(data.prices[0]);
        setCurrentStep('results');
      }
    } catch (error) {
      console.error('Market prices error:', error);
      toast.error(t('error') || 'Failed to fetch market prices. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndStartOver = () => {
    setCurrentStep('select-crops');
    setSelectedCrops([]);
    setStartDate(new Date());
    setEndDate(undefined);
    setLocation('');
    setMarketData(null);
    setSelectedCrop(null);
  };

  const hasMultipleDates = endDate !== undefined;
  const priceChange = selectedCrop ? selectedCrop.currentPrice - selectedCrop.previousPrice : 0;
  const priceChangePercent = selectedCrop ? ((priceChange / selectedCrop.previousPrice) * 100).toFixed(1) : '0';
  const isPositive = priceChange >= 0;

  // Step 1: Select Crops
  if (currentStep === 'select-crops') {
    return (
      <div className="space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              Select Agricultural Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose up to 5 crops to check market prices
            </p>
            
            {/* Selected crops */}
            {selectedCrops.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-primary/10 rounded-lg">
                {selectedCrops.map(crop => (
                  <Badge 
                    key={crop} 
                    variant="default" 
                    className="cursor-pointer hover:bg-destructive"
                    onClick={() => toggleCrop(crop)}
                  >
                    {crop} ✕
                  </Badge>
                ))}
              </div>
            )}

            {/* Popular crops grid */}
            <div className="grid grid-cols-3 gap-2">
              {POPULAR_CROPS.map(crop => (
                <Button
                  key={crop}
                  variant={selectedCrops.includes(crop) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleCrop(crop)}
                  className="text-xs"
                >
                  {crop}
                </Button>
              ))}
            </div>

            {/* Custom crop input */}
            <div className="flex gap-2">
              <Input
                placeholder="Add custom crop..."
                value={customCrop}
                onChange={(e) => setCustomCrop(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomCrop()}
              />
              <Button onClick={addCustomCrop} variant="outline">
                Add
              </Button>
            </div>

            <Button 
              className="w-full" 
              onClick={() => setCurrentStep('select-date')}
              disabled={selectedCrops.length === 0}
            >
              Next: Select Date
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Select Date
  if (currentStep === 'select-date') {
    return (
      <div className="space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Select Date or Period
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep('select-crops')}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a single date or a date range to see price trends
            </p>

            {/* Date selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      {startDate ? format(startDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">End Date (Optional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      {endDate ? format(endDate, 'PPP') : 'Select for range'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) => startDate ? date < startDate : false}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {endDate && (
              <Button variant="ghost" size="sm" onClick={() => setEndDate(undefined)}>
                Clear end date
              </Button>
            )}

            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              {endDate ? (
                <p>Showing prices from {format(startDate!, 'PP')} to {format(endDate, 'PP')} with trend graph</p>
              ) : (
                <p>Showing prices for {format(startDate!, 'PP')}</p>
              )}
            </div>

            <Button 
              className="w-full" 
              onClick={() => setCurrentStep('select-location')}
            >
              Next: Select Location
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Select Location
  if (currentStep === 'select-location') {
    return (
      <div className="space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Select Location
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep('select-date')}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your location or use current location to find nearby markets
            </p>

            {/* Current location button */}
            <Button 
              variant={useCurrentLocation ? 'default' : 'outline'} 
              className="w-full"
              onClick={getCurrentLocation}
            >
              <Navigation className="h-4 w-4 mr-2" />
              Use Current Location
              {useCurrentLocation && currentCoords && ' ✓'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or enter manually</span>
              </div>
            </div>

            {/* Manual location input */}
            <Input
              placeholder="Enter city, district or state (e.g., Varanasi, UP)"
              value={useCurrentLocation ? '' : location}
              onChange={(e) => {
                setLocation(e.target.value);
                setUseCurrentLocation(false);
              }}
              disabled={useCurrentLocation}
            />

            {/* Popular locations */}
            <div className="flex flex-wrap gap-2">
              {['Delhi NCR', 'Mumbai', 'Varanasi, UP', 'Indore, MP', 'Ahmedabad, Gujarat'].map(loc => (
                <Badge 
                  key={loc}
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => {
                    setLocation(loc);
                    setUseCurrentLocation(false);
                  }}
                >
                  {loc}
                </Badge>
              ))}
            </div>

            <Button 
              className="w-full" 
              onClick={fetchMarketPrices}
              disabled={isLoading || (!location && !useCurrentLocation)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching Prices...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Get Market Prices
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 4: Results
  if (!marketData || !selectedCrop) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No market prices available</p>
          <Button onClick={resetAndStartOver} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{marketData.location}</span>
          {' • '}
          <span>{marketData.queriedDate}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchMarketPrices} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={resetAndStartOver} variant="ghost" size="sm">
            New Search
          </Button>
        </div>
      </div>

      {/* Crop Selection Tabs */}
      <div className="flex gap-2 overflow-x-auto scroll-hidden pb-2">
        {marketData.prices.map((crop) => {
          const change = crop.currentPrice - crop.previousPrice;
          const isUp = change >= 0;
          
          return (
            <Button
              key={crop.crop}
              variant={selectedCrop.crop === crop.crop ? 'default' : 'outline'}
              onClick={() => setSelectedCrop(crop)}
              className="flex-shrink-0"
            >
              {crop.crop}
              {isUp ? (
                <TrendingUp className="h-4 w-4 ml-1 text-growth" />
              ) : (
                <TrendingDown className="h-4 w-4 ml-1 text-destructive" />
              )}
            </Button>
          );
        })}
      </div>

      {/* Price Overview Card */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            {t('marketPrices')} - {selectedCrop.crop}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Price */}
          <div className="flex items-end justify-between">
            <div>
              <span className="text-sm text-muted-foreground">Current Price</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">₹{selectedCrop.currentPrice.toLocaleString()}</span>
                <span className="text-muted-foreground">/ {selectedCrop.unit}</span>
              </div>
            </div>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              isPositive ? 'bg-growth/20 text-growth' : 'bg-destructive/20 text-destructive'
            }`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isPositive ? '+' : ''}{priceChangePercent}%
            </div>
          </div>

          {/* Price Trend Chart - Show when date range selected */}
          {hasMultipleDates && selectedCrop.priceTrend && selectedCrop.priceTrend.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Price Trend ({format(startDate!, 'PP')} - {format(endDate!, 'PP')})</h4>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedCrop.priceTrend}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                      }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Price']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fill="url(#priceGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 5-Day Price Prediction */}
          {selectedCrop.predictions && selectedCrop.predictions.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                5-Day Price Prediction
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedCrop.predictions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                      }}
                      formatter={(value: number, name: string) => [
                        `₹${value.toLocaleString()}`, 
                        name === 'predictedPrice' ? 'Predicted Price' : name
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predictedPrice" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{ fill: 'hsl(var(--secondary))', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedCrop.predictions.map((pred, i) => (
                  <div key={i} className="text-xs bg-muted/50 px-3 py-1.5 rounded-lg">
                    <span className="font-medium">{pred.day}</span>: ₹{pred.predictedPrice.toLocaleString()}
                    <span className="text-muted-foreground ml-1">({pred.confidence})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Markets with Map Links */}
          {selectedCrop.markets && selectedCrop.markets.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Nearby Markets
              </h4>
              <div className="space-y-3">
                {selectedCrop.markets.map((market, i) => {
                  const isBest = selectedCrop.markets.reduce((max, m) => m.price > max.price ? m : max, selectedCrop.markets[0]).name === market.name;
                  
                  return (
                    <div 
                      key={market.name}
                      className={`p-4 rounded-xl flex items-center justify-between ${
                        isBest ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <MapPin className={`h-5 w-5 flex-shrink-0 ${isBest ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{market.name}</p>
                          <p className="text-sm text-muted-foreground">{market.distance}</p>
                          {market.address && (
                            <p className="text-xs text-muted-foreground truncate">{market.address}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold">₹{market.price.toLocaleString()}</p>
                          {isBest && (
                            <span className="text-xs text-growth">Best price</span>
                          )}
                        </div>
                        <a
                          href={getGoogleMapsDirectionsUrl(market)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                          title="Get directions"
                        >
                          <Navigation className="h-4 w-4 text-primary" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {selectedCrop.recommendation && (
            <div className="p-4 rounded-xl gradient-sunrise text-secondary-foreground">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold mb-2">{t('recommendations')}</p>
                  <div className="text-sm opacity-90">
                    <FormattedContent content={selectedCrop.recommendation} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Market Summary */}
          {marketData.summary && (
            <div className="p-4 rounded-xl bg-muted/50">
              <FormattedContent content={marketData.summary} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

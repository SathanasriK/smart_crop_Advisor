import React, { useState } from 'react';
import { FlaskConical, Leaf, Droplets, Info, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FormattedContent } from '@/components/FormattedContent';

interface SoilData {
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture: number;
}

interface SoilAnalysis {
  soilHealth: string;
  fertilizer: {
    name: string;
    npkRatio: string;
    amount: string;
    applicationMethod: string;
  };
  crops: Array<{
    name: string;
    suitability: string;
    reason: string;
  }>;
  improvements: string[];
  advice: string;
  warnings: string[];
}

export const SoilAnalyzer: React.FC = () => {
  const { t, language } = useLanguage();
  const [soilData, setSoilData] = useState<SoilData>({
    ph: 6.5,
    nitrogen: 50,
    phosphorus: 40,
    potassium: 45,
    moisture: 35,
  });
  const [analysis, setAnalysis] = useState<SoilAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getLanguageName = (code: string): string => {
    const languageNames: Record<string, string> = {
      en: 'English',
      hi: 'Hindi',
      te: 'Telugu',
      ta: 'Tamil',
      kn: 'Kannada',
      mr: 'Marathi',
      bn: 'Bengali',
      gu: 'Gujarati',
      pa: 'Punjabi',
    };
    return languageNames[code] || 'English';
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-soil', {
        body: { 
          ...soilData,
          language: getLanguageName(language)
        }
      });

      if (error) throw error;

      if (data.analysis) {
        setAnalysis(data.analysis);
      } else {
        toast.error('Could not analyze soil data. Please try again.');
      }
    } catch (error: any) {
      console.error('Soil analysis error:', error);
      toast.error(error.message || 'Failed to analyze soil. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health?.toLowerCase()) {
      case 'good':
        return 'text-green-600 bg-green-100';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-100';
      case 'poor':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSuitabilityColor = (suitability: string) => {
    switch (suitability?.toLowerCase()) {
      case 'high':
        return 'bg-leaf/20 text-leaf';
      case 'medium':
        return 'bg-harvest/20 text-harvest';
      case 'low':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-soil" />
            {t('soilHealth')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* pH Level */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">{t('soilPH')}</Label>
              <span className="text-lg font-bold text-primary">{soilData.ph.toFixed(1)}</span>
            </div>
            <Slider
              value={[soilData.ph]}
              onValueChange={([v]) => setSoilData(prev => ({ ...prev, ph: v }))}
              min={4}
              max={10}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Acidic (4)</span>
              <span>Neutral (7)</span>
              <span>Alkaline (10)</span>
            </div>
          </div>

          {/* NPK Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-leaf" />
                {t('nitrogen')} (kg/ha)
              </Label>
              <Input
                type="number"
                value={soilData.nitrogen}
                onChange={(e) => setSoilData(prev => ({ ...prev, nitrogen: +e.target.value }))}
                min={0}
                max={200}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-harvest" />
                {t('phosphorus')} (kg/ha)
              </Label>
              <Input
                type="number"
                value={soilData.phosphorus}
                onChange={(e) => setSoilData(prev => ({ ...prev, phosphorus: +e.target.value }))}
                min={0}
                max={200}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                {t('potassium')} (kg/ha)
              </Label>
              <Input
                type="number"
                value={soilData.potassium}
                onChange={(e) => setSoilData(prev => ({ ...prev, potassium: +e.target.value }))}
                min={0}
                max={200}
              />
            </div>
          </div>

          {/* Moisture */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Droplets className="h-4 w-4 text-rain" />
                {t('moisture')}
              </Label>
              <span className="font-bold">{soilData.moisture}%</span>
            </div>
            <Slider
              value={[soilData.moisture]}
              onValueChange={([v]) => setSoilData(prev => ({ ...prev, moisture: v }))}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <Button 
            variant="farmer" 
            className="w-full" 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              t('analyze')
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <Card variant="elevated" className="border-primary/20 animate-scale-in">
          <CardHeader className="gradient-earth text-primary-foreground rounded-t-2xl">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5" />
                {t('recommendations')}
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${getHealthColor(analysis.soilHealth)}`}>
                {analysis.soilHealth?.toUpperCase()} SOIL
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Fertilizer Recommendation */}
            <div className="p-4 rounded-xl bg-leaf/10">
              <h4 className="font-medium text-leaf mb-3">Recommended Fertilizer</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Name</span>
                  <p className="font-bold text-primary">{analysis.fertilizer.name}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">NPK Ratio</span>
                  <p className="font-bold text-primary">{analysis.fertilizer.npkRatio}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Amount</span>
                  <p className="font-medium">{analysis.fertilizer.amount}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Application</span>
                  <p className="font-medium">{analysis.fertilizer.applicationMethod}</p>
                </div>
              </div>
            </div>

            {/* Suitable Crops */}
            {analysis.crops && analysis.crops.length > 0 && (
              <div className="p-4 rounded-xl bg-muted/50">
                <span className="text-xs text-muted-foreground mb-2 block">Suitable Crops</span>
                <div className="space-y-2">
                  {analysis.crops.map((crop, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-background rounded-lg">
                      <div>
                        <span className="font-medium">{crop.name}</span>
                        <div className="text-xs text-muted-foreground">
                          <FormattedContent content={crop.reason} />
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getSuitabilityColor(crop.suitability)}`}>
                        {crop.suitability}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements */}
            {analysis.improvements && analysis.improvements.length > 0 && (
              <div className="p-4 rounded-xl bg-primary/5">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Soil Improvements
                </h4>
                <ul className="text-sm space-y-2">
                  {analysis.improvements.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <FormattedContent content={item} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {analysis.warnings && analysis.warnings.length > 0 && (
              <div className="p-4 rounded-xl bg-harvest/10 border border-harvest/20">
                <h4 className="font-medium flex items-center gap-2 mb-2 text-harvest">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings
                </h4>
                <ul className="text-sm space-y-2">
                  {analysis.warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-harvest mt-1">•</span>
                      <FormattedContent content={warning} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Advice */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex gap-2 items-start">
                <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <FormattedContent content={analysis.advice} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

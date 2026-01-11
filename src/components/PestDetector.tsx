import React, { useState, useCallback } from 'react';
import { Upload, Camera, Bug, AlertTriangle, CheckCircle, Leaf, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FormattedContent } from '@/components/FormattedContent';

interface Detection {
  detected: boolean;
  name: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'unknown';
  symptoms: string[];
  treatment: string[];
  prevention: string[];
  additionalInfo?: string;
}

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

export const PestDetector: React.FC = () => {
  const { t, language } = useLanguage();
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detection, setDetection] = useState<Detection | null>(null);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setDetection(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!image) return;
    
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-pest', {
        body: { imageBase64: image, language: getLanguageName(language) }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.detection) {
        setDetection(data.detection);
      }
    } catch (error) {
      console.error('Pest analysis error:', error);
      toast.error(t('error') || 'Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setDetection(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-growth/20 text-growth border-growth/30';
      case 'medium': return 'bg-secondary/20 text-secondary border-secondary/30';
      case 'high': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityLabel = (severity: string) => {
    return severity.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-leaf" />
            {t('pestDetection')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!image ? (
            <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <Camera className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium mb-1">{t('uploadImage')}</p>
                  <p className="text-sm text-muted-foreground">Take a photo of the affected leaf</p>
                </div>
                <div className="flex gap-3">
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button variant="outline" asChild>
                      <span className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </span>
                    </Button>
                  </label>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button variant="default" asChild>
                      <span className="cursor-pointer">
                        <Camera className="h-4 w-4 mr-2" />
                        Camera
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden">
                <img src={image} alt="Uploaded crop" className="w-full h-64 object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={clearImage}
                >
                  <X className="h-4 w-4" />
                </Button>
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
                    {t('loading')}
                  </>
                ) : (
                  t('analyze')
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detection Results */}
      {detection && detection.detected && (
        <Card variant="elevated" className="animate-slide-in-bottom">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-harvest" />
                Detection Result
              </CardTitle>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(detection.severity)}`}>
                {getSeverityLabel(detection.severity)} Severity
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Disease Info */}
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-lg">{detection.name}</h4>
                <span className="text-sm text-muted-foreground">
                  {detection.confidence}% confidence
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="h-2 rounded-full gradient-earth transition-all duration-500"
                  style={{ width: `${detection.confidence}%` }}
                />
              </div>
            </div>

            {/* Symptoms */}
            {detection.symptoms.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-harvest" />
                  Symptoms Identified
                </h4>
                <ul className="space-y-2">
                  {detection.symptoms.map((symptom, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-harvest mt-1.5 flex-shrink-0" />
                      <FormattedContent content={symptom} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Treatment */}
            {detection.treatment.length > 0 && (
              <div className="p-4 rounded-xl bg-growth/5 border border-growth/20">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-growth">
                  <CheckCircle className="h-4 w-4" />
                  Treatment Recommendations
                </h4>
                <ul className="space-y-3">
                  {detection.treatment.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="font-bold text-growth flex-shrink-0">{i + 1}.</span>
                      <FormattedContent content={item} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prevention */}
            {detection.prevention.length > 0 && (
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-accent">
                  <Leaf className="h-4 w-4" />
                  Prevention Tips
                </h4>
                <ul className="space-y-3">
                  {detection.prevention.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="font-bold text-accent flex-shrink-0">{i + 1}.</span>
                      <FormattedContent content={item} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Info */}
            {detection.additionalInfo && (
              <div className="p-4 rounded-xl bg-muted/50">
                <FormattedContent content={detection.additionalInfo} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Detection */}
      {detection && !detection.detected && (
        <Card variant="elevated" className="animate-slide-in-bottom">
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-growth mx-auto mb-4" />
            <h4 className="font-semibold text-lg mb-2">No Pest or Disease Detected</h4>
            <p className="text-muted-foreground">Your plant appears to be healthy!</p>
            {detection.additionalInfo && (
              <p className="text-sm mt-4 text-muted-foreground">{detection.additionalInfo}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

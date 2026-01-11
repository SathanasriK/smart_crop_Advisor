import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { language } = useLanguage();

  const langCodes: Record<string, string> = {
    en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN', mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN',
  };

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported'); return; }
    
    recognitionRef.current = new SR();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = langCodes[language] || 'en-IN';
    
    recognitionRef.current.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) onTranscript(e.results[i][0].transcript);
      }
    };
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.start();
    setIsListening(true);
  }, [language, onTranscript]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return (
    <Button variant={isListening ? 'destructive' : 'voice'} size="icon-lg" onClick={isListening ? () => { recognitionRef.current?.stop(); setIsListening(false); } : startListening}>
      {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
    </Button>
  );
};

export const TextToSpeech: React.FC<{ text: string }> = ({ text }) => {
  const [speaking, setSpeaking] = useState(false);
  const { language } = useLanguage();
  
  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = language === 'en' ? 'en-IN' : `${language}-IN`;
    u.onend = () => setSpeaking(false);
    setSpeaking(true);
    speechSynthesis.speak(u);
  };

  return (
    <Button variant="ghost" size="icon" onClick={speaking ? () => { speechSynthesis.cancel(); setSpeaking(false); } : speak}>
      <Volume2 className={`h-4 w-4 ${speaking ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
    </Button>
  );
};

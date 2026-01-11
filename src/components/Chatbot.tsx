import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { VoiceInput, TextToSpeech } from '@/components/VoiceInput';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FormattedContent } from '@/components/FormattedContent';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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

export const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    setMessages([{ id: '1', role: 'assistant', content: `${t('greeting')}! ${t('howCanIHelp')}` }]);
  }, [language, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMsg]);
    const messageText = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { message: messageText, language: getLanguageName(language) }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response. Please try again.');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'gradient-earth text-primary-foreground'
            }`}>
              {msg.role === 'user' ? <User className="h-5 w-5" /> : <Leaf className="h-5 w-5" />}
            </div>
            <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
              {msg.role === 'user' ? (
                <p className="text-sm">{msg.content}</p>
              ) : (
                <FormattedContent content={msg.content} />
              )}
              {msg.role === 'assistant' && <div className="mt-2 flex justify-end"><TextToSpeech text={msg.content} /></div>}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-earth flex items-center justify-center text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </div>
            <div className="chat-bubble chat-bubble-bot flex gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t bg-card p-4 flex items-center gap-3">
        <VoiceInput onTranscript={setInputValue} />
        <div className="flex-1 relative">
          <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={t('askQuestion')} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
          <Button size="icon" onClick={handleSend} disabled={!inputValue.trim()} className="absolute right-1 top-1/2 -translate-y-1/2">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

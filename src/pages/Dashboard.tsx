import React, { useState } from 'react';
import { Home, MessageCircle, Leaf, Bug, BarChart3, LogIn, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { WeatherWidget } from '@/components/WeatherWidget';
import { Chatbot } from '@/components/Chatbot';
import { SoilAnalyzer } from '@/components/SoilAnalyzer';
import { PestDetector } from '@/components/PestDetector';
import { MarketPrices } from '@/components/MarketPrices';
import { toast } from '@/hooks/use-toast';

type Tab = 'home' | 'chat' | 'soil' | 'pest' | 'market' | 'profile';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tabs = [
    { id: 'home' as Tab, icon: Home, label: t('dashboard') },
    { id: 'chat' as Tab, icon: MessageCircle, label: t('chatbot') },
    { id: 'soil' as Tab, icon: Leaf, label: t('soilHealth') },
    { id: 'pest' as Tab, icon: Bug, label: t('pestDetection') },
    { id: 'market' as Tab, icon: BarChart3, label: t('marketPrices') },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold font-heading mb-2">{t('greeting')}! 🌾</h1>
              <p className="text-muted-foreground">{t('howCanIHelp')}</p>
            </div>
            <WeatherWidget />
            <div className="grid grid-cols-2 gap-4">
              {tabs.slice(1).map((tab) => (
                <Button
                  key={tab.id}
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </Button>
              ))}
            </div>
          </div>
        );
      case 'chat':
        return <div className="h-[calc(100vh-180px)]"><Chatbot /></div>;
      case 'soil':
        return <SoilAnalyzer />;
      case 'pest':
        return <PestDetector />;
      case 'market':
        return <MarketPrices />;
      default:
        return null;
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: t('logoutSuccess') || 'Logged Out',
      description: t('logoutMessage') || 'You have been logged out successfully.',
    });
    navigate('/auth');
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full gradient-earth flex items-center justify-center">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold font-heading text-lg">Kisan Mitra</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t('logout') || 'Logout'}</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleLogin} className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">{t('login') || 'Login'}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6 pb-24">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t safe-area-pb">
        <div className="container flex justify-around py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
                activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <tab.icon className={`h-6 w-6 ${activeTab === tab.id ? 'scale-110' : ''} transition-transform`} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;

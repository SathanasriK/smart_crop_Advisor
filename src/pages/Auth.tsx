import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Mail, Lock, User, Phone, MapPin, Languages, Wheat, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { toast } from '@/hooks/use-toast';

type AuthMode = 'login' | 'register';

const Auth: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const { t, languages } = useLanguage();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    location: '',
    preferredLanguage: 'en',
    cropType: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
        toast({
          title: t('loginSuccess') || 'Login Successful',
          description: t('welcomeBack') || 'Welcome back to Krishi Mitra!',
        });
      } else {
        await register({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone,
          location: formData.location,
          preferredLanguage: formData.preferredLanguage,
          cropType: formData.cropType,
        });
        toast({
          title: t('registrationSuccess') || 'Registration Successful',
          description: t('accountCreated') || 'Your account has been created!',
        });
      }
      navigate('/');
    } catch (error) {
      toast({
        title: t('error') || 'Error',
        description: mode === 'login' 
          ? (t('loginError') || 'Invalid email or password')
          : (t('registrationError') || 'Registration failed. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <Leaf className="h-6 w-6 text-primary" />
          </div>
          <span className="font-bold text-xl text-primary">Krishi Mitra</span>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card variant="glass" className="backdrop-blur-xl">
            <CardHeader className="text-center pb-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="mx-auto p-4 rounded-full bg-primary/10 mb-4"
              >
                <Leaf className="h-10 w-10 text-primary" />
              </motion.div>
              <CardTitle className="text-2xl">
                {mode === 'login' ? (t('welcomeBack') || 'Welcome Back') : (t('createAccount') || 'Create Account')}
              </CardTitle>
              <CardDescription>
                {mode === 'login' 
                  ? (t('loginDescription') || 'Sign in to access your crop advisory')
                  : (t('registerDescription') || 'Join Krishi Mitra for smart farming')
                }
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <>
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('fullName') || 'Full Name'}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name"
                          placeholder={t('enterName') || 'Enter your name'}
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('phone') || 'Phone Number'}</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <Label htmlFor="location">{t('location') || 'Location'}</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="location"
                          placeholder={t('enterLocation') || 'Your village/city, State'}
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    {/* Preferred Language */}
                    <div className="space-y-2">
                      <Label>{t('preferredLanguage') || 'Preferred Language'}</Label>
                      <Select
                        value={formData.preferredLanguage}
                        onValueChange={(value) => handleInputChange('preferredLanguage', value)}
                      >
                        <SelectTrigger>
                          <Languages className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.name} ({lang.nativeName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Crop Type */}
                    <div className="space-y-2">
                      <Label htmlFor="cropType">{t('cropType') || 'Main Crops'}</Label>
                      <div className="relative">
                        <Wheat className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="cropType"
                          placeholder={t('enterCrops') || 'Rice, Wheat, Sugarcane...'}
                          value={formData.cropType}
                          onChange={(e) => handleInputChange('cropType', e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email') || 'Email'}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="farmer@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password') || 'Password'}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="farmer" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      {t('pleaseWait') || 'Please wait...'}
                    </div>
                  ) : (
                    mode === 'login' ? (t('signIn') || 'Sign In') : (t('createAccount') || 'Create Account')
                  )}
                </Button>
              </form>

              {/* Toggle Mode */}
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">
                  {mode === 'login' 
                    ? (t('noAccount') || "Don't have an account?")
                    : (t('hasAccount') || 'Already have an account?')
                  }
                </span>{' '}
                <button
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-primary font-semibold hover:underline"
                >
                  {mode === 'login' ? (t('signUp') || 'Sign Up') : (t('signIn') || 'Sign In')}
                </button>
              </div>

              {/* Demo Login */}
              {mode === 'login' && (
                <div className="mt-4 p-3 rounded-xl bg-muted/50 text-center text-sm">
                  <p className="text-muted-foreground mb-2">{t('demoCredentials') || 'Demo Credentials:'}</p>
                  <p className="font-mono text-xs">Email: ramesh@example.com</p>
                  <p className="font-mono text-xs">Password: any password</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p>© 2024 Krishi Mitra - Smart Crop Advisory System</p>
      </footer>
    </div>
  );
};

export default Auth;

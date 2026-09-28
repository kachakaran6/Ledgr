import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowRightIcon, EyeIcon, EyeOffIcon } from './icons';
import { InlineSpinner } from './LoadingFeedback';

export const AuthGate: React.FC = () => {
  const { login, signup } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await signup({ email, password, name });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-5 animate-in fade-in-50 zoom-in-95 duration-300">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-heading font-semibold tracking-tight text-foreground">
            Ledgr
          </h1>
          <p className="text-xs text-muted-foreground">
            Record and audit your past work history
          </p>
        </div>

        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="space-y-1 pb-3">
            <Tabs value={mode} onValueChange={(v) => { setMode(v as 'login' | 'signup'); setError(null); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="space-y-3.5">
            {error && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    required
                    disabled={isSubmitting}
                    className="h-9 text-xs bg-background"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  disabled={isSubmitting}
                  className="h-9 text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    disabled={isSubmitting}
                    className="h-9 text-xs pr-10 bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-3.5 w-3.5" />
                    ) : (
                      <EyeIcon className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                {mode === 'signup' && (
                  <p className="text-[10px] text-muted-foreground">Minimum 8 characters</p>
                )}
              </div>

              <Button
                type="submit"
                variant="default"
                className="w-full gap-1.5 font-medium h-9 text-xs mt-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <InlineSpinner size="xs" />
                    <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

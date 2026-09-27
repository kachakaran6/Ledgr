import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { SparklesIcon, LockIcon, ArrowRightIcon, EyeIcon, EyeOffIcon } from './icons';

export const AuthGate: React.FC = () => {
  const { login, signup, loginDemo } = useAuth();

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

  const handleDemo = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await loginDemo();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6 animate-in fade-in-50 zoom-in-95 duration-300">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-md mb-2">
            <span className="font-extrabold text-xl tracking-tighter">L</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            LogPast <span className="text-primary font-normal text-lg">Ledger</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Past-Only Work Log & Client Audit System
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Badge variant="outline" className="text-[11px] gap-1 font-mono">
              <LockIcon className="h-3 w-3 text-primary" />
              <span>RLS Scoped</span>
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              Offline-First PWA
            </Badge>
          </div>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="space-y-1 pb-4">
            <Tabs value={mode} onValueChange={(v) => { setMode(v as 'login' | 'signup'); setError(null); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
            </Tabs>
            <CardDescription className="text-center text-xs pt-2">
              {mode === 'login'
                ? 'Enter your credentials to access your work log'
                : 'Register a new isolated workspace'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="default"
              className="w-full gap-2 font-medium"
              onClick={handleDemo}
              disabled={isSubmitting}
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Instant Demo Access (One-Click)</span>
            </Button>

            <div className="relative flex items-center justify-center">
              <Separator />
              <span className="absolute bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Or with password
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
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
                  placeholder="alex@company.com"
                  required
                  disabled={isSubmitting}
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
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="secondary"
                className="w-full gap-1.5 font-medium mt-2"
                disabled={isSubmitting}
              >
                <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create Workspace'}</span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t border-border/60 py-3 text-xs text-muted-foreground">
            Strict 3-layer past-date validation enforced
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

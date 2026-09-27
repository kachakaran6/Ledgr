import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { SparklesIcon, ArrowRightIcon } from './icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, signup, loginDemo } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setIsSubmitting(true);
    try {
      await loginDemo();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-1">
          <DialogTitle>
            {mode === 'login' ? 'Sign In to LogPast' : 'Create an Account'}
          </DialogTitle>
          <DialogDescription>
            Postgres RLS & JWT Scoped Data Isolation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Tabs value={mode} onValueChange={(v) => { setMode(v as 'login' | 'signup'); setError(null); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>
          </Tabs>

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
              Or with email
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
                placeholder="you@company.com"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isSubmitting}
              />
            </div>

            <Button
              type="submit"
              variant="secondary"
              className="w-full gap-1.5 font-medium mt-2"
              disabled={isSubmitting}
            >
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Mail, Lock, User, Loader2, ArrowLeft, Users } from 'lucide-react';
import { z } from 'zod';

type SignUpRole = 'student' | 'teacher';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');
const roleSchema = z.enum(['student', 'teacher'], { required_error: 'Please select a role' });

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, isLoading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  // Sign Up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpRole, setSignUpRole] = useState<SignUpRole | ''>('');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const validateSignIn = () => {
    const newErrors: Record<string, string> = {};
    
    try {
      emailSchema.parse(signInEmail);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.signInEmail = e.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(signInPassword);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.signInPassword = e.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignUp = () => {
    const newErrors: Record<string, string> = {};
    
    try {
      nameSchema.parse(signUpName);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.signUpName = e.errors[0].message;
      }
    }
    
    try {
      emailSchema.parse(signUpEmail);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.signUpEmail = e.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(signUpPassword);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.signUpPassword = e.errors[0].message;
      }
    }
    
    if (signUpPassword !== signUpConfirmPassword) {
      newErrors.signUpConfirmPassword = 'Passwords do not match';
    }

    try {
      roleSchema.parse(signUpRole);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.signUpRole = e.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignIn()) return;
    
    setIsLoading(true);
    const { error } = await signIn(signInEmail, signInPassword);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrors({ signInEmail: 'Invalid email or password' });
      } else {
        setErrors({ signInEmail: error.message });
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignUp()) return;
    
    setIsLoading(true);
    const { error } = await signUp(signUpEmail, signUpPassword, signUpName, signUpRole as SignUpRole);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('already registered')) {
        setErrors({ signUpEmail: 'This email is already registered. Please sign in instead.' });
      } else {
        setErrors({ signUpEmail: error.message });
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">ExamPro</h1>
            <p className="text-muted-foreground mt-1">Universal CBT Platform</p>
          </div>

          <Card className="border-0 shadow-lg">
            <Tabs defaultValue="signin" className="w-full">
              <CardHeader className="pb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent>
                {/* Sign In Tab */}
                <TabsContent value="signin" className="mt-0">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10"
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                        />
                      </div>
                      {errors.signInEmail && (
                        <p className="text-sm text-destructive">{errors.signInEmail}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                        />
                      </div>
                      {errors.signInPassword && (
                        <p className="text-sm text-destructive">{errors.signInPassword}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* Sign Up Tab */}
                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          className="pl-10"
                          value={signUpName}
                          onChange={(e) => setSignUpName(e.target.value)}
                        />
                      </div>
                      {errors.signUpName && (
                        <p className="text-sm text-destructive">{errors.signUpName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-role">I am a</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                        <Select value={signUpRole} onValueChange={(value: SignUpRole) => setSignUpRole(value)}>
                          <SelectTrigger id="signup-role" className="pl-10">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {errors.signUpRole && (
                        <p className="text-sm text-destructive">{errors.signUpRole}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10"
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                        />
                      </div>
                      {errors.signUpEmail && (
                        <p className="text-sm text-destructive">{errors.signUpEmail}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                        />
                      </div>
                      {errors.signUpPassword && (
                        <p className="text-sm text-destructive">{errors.signUpPassword}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={signUpConfirmPassword}
                          onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                        />
                      </div>
                      {errors.signUpConfirmPassword && (
                        <p className="text-sm text-destructive">{errors.signUpConfirmPassword}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;

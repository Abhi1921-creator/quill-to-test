import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Building2, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const JoinInstitute = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinedInstitute, setJoinedInstitute] = useState<{ name: string } | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter an invite code');
      return;
    }

    setIsSubmitting(true);

    try {
      // Find institute by invite code
      const { data: institute, error: findError } = await supabase
        .from('institutes')
        .select('id, name')
        .eq('invite_code', code)
        .single();

      if (findError || !institute) {
        toast.error('Invalid invite code. Please check and try again.');
        setIsSubmitting(false);
        return;
      }

      // Update user's profile with institute_id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ institute_id: institute.id })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setJoinedInstitute({ name: institute.name });
      toast.success(`Successfully joined ${institute.name}!`);
    } catch (error: any) {
      console.error('Error joining institute:', error);
      toast.error(error.message || 'Failed to join institute');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (joinedInstitute) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-bold">ExamPro</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-lg">
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to {joinedInstitute.name}!</h2>
              <p className="text-muted-foreground mb-6">
                You've successfully joined the institute. You can now access exams and resources.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (profile?.institute_id) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-bold">ExamPro</span>
            </div>
            
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-lg">
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Already a Member</h2>
              <p className="text-muted-foreground mb-6">
                You're already part of an institute. To join a different one, please contact support.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">ExamPro</span>
          </div>
          
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Join an Institute</CardTitle>
            <CardDescription>
              Enter the invite code provided by your coaching institute or school to join.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  placeholder="e.g., ABC12345"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  disabled={isSubmitting}
                  className="text-center text-lg tracking-widest font-mono"
                  maxLength={8}
                />
                <p className="text-xs text-muted-foreground text-center">
                  The code is 8 characters long and provided by your institute admin.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Institute'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default JoinInstitute;

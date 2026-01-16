import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Building2, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CreateInstitute = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    if (!name.trim()) {
      toast.error('Please enter an institute name');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('institutes')
        .insert({
          name: name.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Institute created successfully! You are now the admin.');
      navigate('/institute/users');
    } catch (error: any) {
      console.error('Error creating institute:', error);
      toast.error(error.message || 'Failed to create institute');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <CardTitle className="text-2xl">Create Your Institute</CardTitle>
            <CardDescription>
              Set up your coaching institute or school. You'll become the admin and can invite teachers and students.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Institute Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., ABC Coaching Center"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">What happens next?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>You'll become the Institute Admin</li>
                  <li>An invite code will be generated automatically</li>
                  <li>Share the code with teachers and students to join</li>
                  <li>Promote students to teachers as needed</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Institute'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateInstitute;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  GraduationCap, 
  ArrowLeft, 
  Loader2, 
  Users, 
  UserPlus,
  ShieldCheck,
  Search,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface InstituteMember {
  id: string;
  full_name: string | null;
  email: string | null;
  isTeacher: boolean;
}

interface Institute {
  id: string;
  name: string;
  invite_code: string | null;
}

const InstituteUsers = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, hasRole } = useAuth();
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [members, setMembers] = useState<InstituteMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const isAdmin = hasRole('institute_admin') || hasRole('super_admin');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && profile?.institute_id && isAdmin) {
      fetchInstituteData();
    } else if (!authLoading && user && !profile?.institute_id) {
      setIsLoading(false);
    } else if (!authLoading && user && !isAdmin) {
      navigate('/dashboard');
    }
  }, [user, profile, authLoading, isAdmin]);

  const fetchInstituteData = async () => {
    if (!profile?.institute_id) return;

    try {
      // Fetch institute details
      const { data: instituteData, error: instituteError } = await supabase
        .from('institutes')
        .select('id, name, invite_code')
        .eq('id', profile.institute_id)
        .single();

      if (instituteError) throw instituteError;
      setInstitute(instituteData);

      // Fetch all profiles in the institute
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('institute_id', profile.institute_id);

      if (profilesError) throw profilesError;

      // Fetch teacher roles for this institute
      const { data: teacherRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher')
        .eq('institute_id', profile.institute_id);

      if (rolesError) throw rolesError;

      const teacherIds = new Set(teacherRoles?.map(r => r.user_id) || []);

      const membersWithRoles: InstituteMember[] = (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        isTeacher: teacherIds.has(p.id),
      }));

      setMembers(membersWithRoles);
    } catch (error) {
      console.error('Error fetching institute data:', error);
      toast.error('Failed to load institute data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromoteToTeacher = async (userId: string) => {
    if (!profile?.institute_id) return;
    setProcessingUserId(userId);

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'teacher',
          institute_id: profile.institute_id,
        });

      if (error) throw error;

      setMembers(prev => prev.map(m => 
        m.id === userId ? { ...m, isTeacher: true } : m
      ));
      toast.success('User promoted to teacher');
    } catch (error: any) {
      console.error('Error promoting user:', error);
      toast.error(error.message || 'Failed to promote user');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleRevokeTeacher = async (userId: string) => {
    if (!profile?.institute_id) return;
    setProcessingUserId(userId);

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'teacher')
        .eq('institute_id', profile.institute_id);

      if (error) throw error;

      setMembers(prev => prev.map(m => 
        m.id === userId ? { ...m, isTeacher: false } : m
      ));
      toast.success('Teacher access revoked');
    } catch (error: any) {
      console.error('Error revoking teacher access:', error);
      toast.error(error.message || 'Failed to revoke access');
    } finally {
      setProcessingUserId(null);
    }
  };

  const copyInviteCode = async () => {
    if (!institute?.invite_code) return;
    await navigator.clipboard.writeText(institute.invite_code);
    setCodeCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = !searchQuery || 
      m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || 
      (roleFilter === 'teacher' && m.isTeacher) ||
      (roleFilter === 'student' && !m.isTeacher);

    return matchesSearch && matchesRole;
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!profile?.institute_id) {
    return (
      <div className="min-h-screen bg-background">
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
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Institute Yet</h2>
              <p className="text-muted-foreground mb-6">
                Create an institute to start managing teachers and students.
              </p>
              <Button onClick={() => navigate('/institute/create')}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Institute
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
            <div>
              <span className="text-xl font-display font-bold">ExamPro</span>
              <span className="hidden md:inline-block ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
                Institute Admin
              </span>
            </div>
          </div>
          
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">{institute?.name}</h1>
          <p className="text-muted-foreground">
            Manage your institute members and their roles.
          </p>
        </div>

        {/* Invite Code Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Invite Code</CardTitle>
            <CardDescription>
              Share this code with teachers and students to join your institute.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-3 bg-muted rounded-lg text-xl font-mono tracking-widest text-center">
                {institute?.invite_code || '--------'}
              </code>
              <Button variant="outline" size="icon" onClick={copyInviteCode}>
                {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Members ({members.length})</CardTitle>
                <CardDescription>
                  View and manage institute members. Promote students to teachers.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="teacher">Teachers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {members.length === 0 
                  ? 'No members yet. Share your invite code to get started.'
                  : 'No members match your search.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.full_name || 'Unnamed User'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.email}
                      </TableCell>
                      <TableCell>
                        {member.isTeacher ? (
                          <Badge variant="default" className="bg-success/10 text-success hover:bg-success/20">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Teacher
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Student</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.id !== user.id && (
                          member.isTeacher ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled={processingUserId === member.id}
                                >
                                  {processingUserId === member.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Revoke Teacher'
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Revoke Teacher Access?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove teacher privileges from {member.full_name || member.email}. 
                                    They will no longer be able to create or manage exams.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRevokeTeacher(member.id)}>
                                    Revoke Access
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePromoteToTeacher(member.id)}
                              disabled={processingUserId === member.id}
                            >
                              {processingUserId === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Make Teacher
                                </>
                              )}
                            </Button>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default InstituteUsers;

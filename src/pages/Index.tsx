import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  GraduationCap, 
  FileText, 
  Shield, 
  BarChart3, 
  Clock, 
  Users,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Upload
} from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: Upload,
      title: 'AI-Powered PDF Extraction',
      description: 'Upload any exam PDF and our AI automatically extracts questions, options, and detects question types.',
    },
    {
      icon: FileText,
      title: 'Multi-Section Exams',
      description: 'Configure complex exam patterns with multiple sections, each with its own timing and marking scheme.',
    },
    {
      icon: Shield,
      title: 'Secure Proctoring',
      description: 'Browser-level proctoring with tab switch detection, violation tracking, and auto-submission.',
    },
    {
      icon: BarChart3,
      title: 'Deep Analytics',
      description: 'Comprehensive performance analysis with section-wise breakdown, time management insights, and rankings.',
    },
    {
      icon: Clock,
      title: 'Flexible Timing',
      description: 'Configure overall test duration or section-wise timers with automatic submission on expiry.',
    },
    {
      icon: Users,
      title: 'Multi-Tenant Platform',
      description: 'Perfect for coaching institutes, schools, and organizations to manage their own exams and students.',
    },
  ];

  const examTypes = [
    { name: 'SSC', description: 'SSC CGL, CHSL, MTS' },
    { name: 'Banking', description: 'IBPS, SBI, RBI' },
    { name: 'Engineering', description: 'JEE, GATE' },
    { name: 'Medical', description: 'NEET, AIIMS' },
    { name: 'UPSC', description: 'Civil Services' },
    { name: 'Custom', description: 'Any exam pattern' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">ExamPro</span>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button onClick={() => navigate('/auth')}>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered Exam Platform
          </div>
          
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight">
            One Platform.{' '}
            <span className="gradient-text">Every Competitive Exam.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Convert any exam PDF into a secure online test with AI. Conduct proctored exams 
            and provide deep analytics for SSC, Banking, Engineering, Medical, and more.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-lg px-8" onClick={() => navigate('/auth')}>
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl font-display font-bold text-foreground">10K+</div>
              <div className="text-sm text-muted-foreground">Exams Conducted</div>
            </div>
            <div>
              <div className="text-3xl font-display font-bold text-foreground">500+</div>
              <div className="text-sm text-muted-foreground">Institutes</div>
            </div>
            <div>
              <div className="text-3xl font-display font-bold text-foreground">1M+</div>
              <div className="text-sm text-muted-foreground">Students</div>
            </div>
          </div>
        </div>
      </section>

      {/* Exam Types */}
      <section className="py-16 px-4 bg-card">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold mb-4">Supports All Exam Patterns</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pre-configured templates for popular competitive exams, or create your own custom pattern.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
            {examTypes.map((exam) => (
              <Card key={exam.name} className="text-center hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="text-lg font-display font-semibold text-foreground">{exam.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{exam.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold mb-4">Powerful Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create, conduct, and analyze competitive exams at scale.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 bg-card">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Get started in just 4 simple steps</p>
          </div>
          
          <div className="space-y-8">
            {[
              { step: '01', title: 'Upload Your PDF', description: 'Upload any competitive exam PDF. Our AI extracts questions, options, and correct answers automatically.' },
              { step: '02', title: 'Configure Exam', description: 'Set exam type, sections, timing, marking scheme, and other parameters using our intuitive interface.' },
              { step: '03', title: 'Conduct Test', description: 'Students take the exam in a secure, proctored environment with real-time monitoring.' },
              { step: '04', title: 'Analyze Results', description: 'Get comprehensive analytics, rankings, and detailed performance insights instantly.' },
            ].map((item, index) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-display font-bold text-primary-foreground">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-xl font-display font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="gradient-primary border-0 text-center p-8 md:p-12">
            <CardContent className="pt-0">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
                Ready to Transform Your Exams?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of institutes and educators using ExamPro to conduct smarter, more secure exams.
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                className="text-lg px-8"
                onClick={() => navigate('/auth')}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold">ExamPro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 ExamPro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'institute_admin', 'teacher', 'student');

-- Create exam_type enum
CREATE TYPE public.exam_type AS ENUM ('ssc', 'banking', 'engineering', 'medical', 'upsc', 'custom');

-- Create exam_status enum
CREATE TYPE public.exam_status AS ENUM ('draft', 'published', 'archived');

-- Create question_type enum
CREATE TYPE public.question_type AS ENUM ('single_correct', 'multiple_correct', 'true_false', 'numeric');

-- Create session_status enum
CREATE TYPE public.session_status AS ENUM ('in_progress', 'submitted', 'auto_submitted', 'terminated');

-- Create institutes table
CREATE TABLE public.institutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  invite_code TEXT UNIQUE DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  institute_id UUID REFERENCES public.institutes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, institute_id)
);

-- Create exams table
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  exam_type exam_type NOT NULL DEFAULT 'custom',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_marks NUMERIC(10,2) DEFAULT 0,
  passing_marks NUMERIC(10,2),
  negative_marking BOOLEAN DEFAULT false,
  negative_marks_per_question NUMERIC(5,2) DEFAULT 0,
  shuffle_questions BOOLEAN DEFAULT false,
  shuffle_options BOOLEAN DEFAULT false,
  show_result_immediately BOOLEAN DEFAULT false,
  max_attempts INTEGER DEFAULT 1,
  status exam_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create exam_sections table
CREATE TABLE public.exam_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  marks_per_question NUMERIC(5,2) DEFAULT 1,
  negative_marks_per_question NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES public.exam_sections(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL DEFAULT 'single_correct',
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer JSONB,
  explanation TEXT,
  marks NUMERIC(5,2) DEFAULT 1,
  negative_marks NUMERIC(5,2) DEFAULT 0,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create exam_sessions table
CREATE TABLE public.exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  time_remaining_seconds INTEGER,
  current_question_index INTEGER DEFAULT 0,
  current_section_index INTEGER DEFAULT 0,
  status session_status NOT NULL DEFAULT 'in_progress',
  violations_count INTEGER DEFAULT 0,
  violation_logs JSONB DEFAULT '[]',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

-- Create responses table
CREATE TABLE public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer JSONB,
  is_marked_for_review BOOLEAN DEFAULT false,
  is_visited BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER DEFAULT 0,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);

-- Create results table
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  attempted INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  total_marks NUMERIC(10,2) NOT NULL DEFAULT 0,
  marks_obtained NUMERIC(10,2) NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  accuracy NUMERIC(5,2) DEFAULT 0,
  time_taken_seconds INTEGER DEFAULT 0,
  section_wise_scores JSONB DEFAULT '{}',
  rank INTEGER,
  percentile NUMERIC(5,2),
  is_published BOOLEAN DEFAULT false,
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create answer_keys table (for uploaded answer keys)
CREATE TABLE public.answer_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL UNIQUE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_keys ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _institute_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        _institute_id IS NULL 
        OR institute_id = _institute_id 
        OR institute_id IS NULL
      )
  )
$$;

-- Create function to get user's institute
CREATE OR REPLACE FUNCTION public.get_user_institute(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institute_id FROM public.profiles WHERE id = _user_id
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email
  );
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_institutes_updated_at BEFORE UPDATE ON public.institutes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_responses_updated_at BEFORE UPDATE ON public.responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_answer_keys_updated_at BEFORE UPDATE ON public.answer_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles in institute" ON public.profiles FOR SELECT USING (
  public.has_role(auth.uid(), 'institute_admin', institute_id) OR
  public.has_role(auth.uid(), 'super_admin')
);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Institute admins can manage roles in their institute" ON public.user_roles FOR ALL USING (
  public.has_role(auth.uid(), 'institute_admin', institute_id)
);

-- RLS Policies for institutes
CREATE POLICY "Anyone can view institutes" ON public.institutes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create institutes" ON public.institutes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Institute admins can update their institute" ON public.institutes FOR UPDATE USING (
  public.has_role(auth.uid(), 'institute_admin', id) OR public.has_role(auth.uid(), 'super_admin')
);

-- RLS Policies for exams
CREATE POLICY "Anyone can view published exams" ON public.exams FOR SELECT USING (
  status = 'published' OR 
  created_by = auth.uid() OR
  public.has_role(auth.uid(), 'institute_admin', institute_id) OR
  public.has_role(auth.uid(), 'teacher', institute_id)
);
CREATE POLICY "Teachers and admins can create exams" ON public.exams FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'institute_admin', institute_id) OR
  public.has_role(auth.uid(), 'teacher', institute_id) OR
  public.has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "Exam creators and admins can update exams" ON public.exams FOR UPDATE USING (
  created_by = auth.uid() OR
  public.has_role(auth.uid(), 'institute_admin', institute_id) OR
  public.has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "Exam creators and admins can delete exams" ON public.exams FOR DELETE USING (
  created_by = auth.uid() OR
  public.has_role(auth.uid(), 'institute_admin', institute_id) OR
  public.has_role(auth.uid(), 'super_admin')
);

-- RLS Policies for exam_sections
CREATE POLICY "Users can view sections of accessible exams" ON public.exam_sections FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND (
    status = 'published' OR 
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'institute_admin', institute_id)
  ))
);
CREATE POLICY "Exam creators can manage sections" ON public.exam_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND (
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'institute_admin', institute_id) OR
    public.has_role(auth.uid(), 'super_admin')
  ))
);

-- RLS Policies for questions
CREATE POLICY "Users can view questions of accessible exams" ON public.questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND (
    status = 'published' OR 
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'institute_admin', institute_id)
  ))
);
CREATE POLICY "Exam creators can manage questions" ON public.questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND (
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'institute_admin', institute_id) OR
    public.has_role(auth.uid(), 'super_admin')
  ))
);

-- RLS Policies for exam_sessions
CREATE POLICY "Students can view own sessions" ON public.exam_sessions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can create own sessions" ON public.exam_sessions FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own sessions" ON public.exam_sessions FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "Admins can view all sessions" ON public.exam_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND (
    public.has_role(auth.uid(), 'institute_admin', institute_id) OR
    public.has_role(auth.uid(), 'super_admin')
  ))
);

-- RLS Policies for responses
CREATE POLICY "Students can manage own responses" ON public.responses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.exam_sessions WHERE id = session_id AND student_id = auth.uid())
);
CREATE POLICY "Admins can view all responses" ON public.responses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.exam_sessions es
    JOIN public.exams e ON e.id = es.exam_id
    WHERE es.id = session_id AND (
      public.has_role(auth.uid(), 'institute_admin', e.institute_id) OR
      public.has_role(auth.uid(), 'super_admin')
    )
  )
);

-- RLS Policies for results
CREATE POLICY "Students can view own published results" ON public.results FOR SELECT USING (
  student_id = auth.uid() AND is_published = true
);
CREATE POLICY "Admins can manage all results" ON public.results FOR ALL USING (
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND (
    public.has_role(auth.uid(), 'institute_admin', institute_id) OR
    public.has_role(auth.uid(), 'super_admin') OR
    created_by = auth.uid()
  ))
);

-- RLS Policies for answer_keys
CREATE POLICY "Exam creators and admins can manage answer keys" ON public.answer_keys FOR ALL USING (
  EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND (
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'institute_admin', institute_id) OR
    public.has_role(auth.uid(), 'super_admin')
  ))
);
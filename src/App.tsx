import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateExam from "./pages/CreateExam";
import TakeExam from "./pages/TakeExam";
import AvailableExams from "./pages/AvailableExams";
import AnswerKeyUpload from "./pages/AnswerKeyUpload";
import ExamResults from "./pages/ExamResults";
import ManageAnswerKeys from "./pages/ManageAnswerKeys";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/exams/create" element={<CreateExam />} />
            <Route path="/exams/:examId/take" element={<TakeExam />} />
            <Route path="/exams/:examId/answer-key" element={<AnswerKeyUpload />} />
            <Route path="/exams/answer-keys" element={<ManageAnswerKeys />} />
            <Route path="/exams" element={<AvailableExams />} />
            <Route path="/results/:sessionId" element={<ExamResults />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

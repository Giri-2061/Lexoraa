import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "./hooks/useAuth";
import { AuthCallback } from "./components/AuthCallback";
import PageTransition from "./components/PageTransition";
import Index from "./pages/Index";
import About from "./pages/About";
import Testimonials from "./pages/Testimonials";
import MockTests from "./pages/MockTests";
import Contact from "./pages/Contact";
import WritingTest from "./pages/WritingTest";
import ListeningTest from "./pages/ListeningTest";
import ListeningCambridge08 from "./pages/ListeningCambridge08";
import ReadingTest from "./pages/ReadingTest";
import ReadingCambridge08 from "./pages/ReadingCambridge08";
import SpeakingTest from "./pages/SpeakingTest";
import SpeakingCambridge08 from "./pages/SpeakingCambridge08";
import WritingCambridge08 from "./pages/WritingCambridge08";
import Auth from "./pages/Auth";
import CheckEmail from "./pages/CheckEmail";
import EmailVerified from "./pages/EmailVerified";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ScoreCalculator from "./pages/ScoreCalculator";
import Classrooms from "./pages/Classrooms";
import ClassroomDetail from "./pages/ClassroomDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <InnerRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

function InnerRoutes() {
  const location = useLocation();

  return (
    <>
      <AuthCallback />
      <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><MockTests /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/auth/check-email" element={<PageTransition><CheckEmail /></PageTransition>} />
        <Route path="/auth/verified" element={<PageTransition><EmailVerified /></PageTransition>} />
        <Route path="/auth/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/auth/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/score-calculator" element={<PageTransition><ScoreCalculator /></PageTransition>} />
        <Route path="/classrooms" element={<PageTransition><Classrooms /></PageTransition>} />
        <Route path="/classrooms/:classroomId" element={<PageTransition><ClassroomDetail /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        <Route path="/testimonials" element={<PageTransition><Testimonials /></PageTransition>} />
        <Route path="/mock-tests" element={<PageTransition><MockTests /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
  <Route path="/test/writing" element={<PageTransition><WritingTest /></PageTransition>} />
  <Route path="/listening/cambridge-08" element={<PageTransition><ListeningCambridge08 /></PageTransition>} />
  <Route path="/reading/cambridge-08" element={<PageTransition><ReadingCambridge08 /></PageTransition>} />
  <Route path="/writing/cambridge-08" element={<PageTransition><WritingCambridge08 /></PageTransition>} />
  <Route path="/speaking/cambridge-08" element={<PageTransition><SpeakingCambridge08 /></PageTransition>} />
  <Route path="/test/listening/:testId" element={<PageTransition><ListeningTest /></PageTransition>} />
  <Route path="/test/reading/:testId" element={<PageTransition><ReadingTest /></PageTransition>} />
  <Route path="/test/writing/:testId" element={<PageTransition><WritingTest /></PageTransition>} />
  <Route path="/test/speaking/:testId" element={<PageTransition><SpeakingTest /></PageTransition>} />
  <Route path="/test/listening" element={<PageTransition><ListeningTest /></PageTransition>} />
  <Route path="/test/reading" element={<PageTransition><ReadingTest /></PageTransition>} />
  <Route path="/test/speaking" element={<PageTransition><SpeakingTest /></PageTransition>} />
  {/* convenience routes matching older URLs */}
  <Route path="/writing-test" element={<PageTransition><WritingTest /></PageTransition>} />
  <Route path="/listening-test" element={<PageTransition><ListeningTest /></PageTransition>} />
  <Route path="/reading-test" element={<PageTransition><ReadingTest /></PageTransition>} />
  <Route path="/speaking-test" element={<PageTransition><SpeakingTest /></PageTransition>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
    </>
  );
}

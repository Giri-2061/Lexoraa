import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TestimonialsSection from "@/components/home/TestimonialsSection";

const Testimonials = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 text-center">Testimonials</h1>
          <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto">
            Real success stories from our students who achieved their goals
          </p>
        </div>
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Testimonials;

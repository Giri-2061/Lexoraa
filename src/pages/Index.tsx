import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import ExpertiseSection from "@/components/home/ExpertiseSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import MapSection from "@/components/home/MapSection";

// Configuration flags to show/hide sections
const SHOW_SECTIONS = {
  hero: false,
  expertise: false,
  testimonials: false,
  map: false,
  footer: false,
};

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-16">
        {SHOW_SECTIONS.hero && <HeroSection />}
        {SHOW_SECTIONS.expertise && <ExpertiseSection />}
        {SHOW_SECTIONS.testimonials && <TestimonialsSection />}
        {SHOW_SECTIONS.map && <MapSection />}
      </main>
      {SHOW_SECTIONS.footer && <Footer />}
    </div>
  );
};

export default Index;

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Award, Users, Globe, TrendingUp } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-6 text-center">About The IELTS GHAR</h1>
            
            <div className="prose prose-lg max-w-none mb-12">
              <p className="text-lg text-muted-foreground text-center mb-8">
                We are a premier IELTS preparation and study abroad consultancy dedicated to transforming dreams into reality.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <Card className="p-6 border-border">
                <Award className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">10+ Years Experience</h3>
                <p className="text-muted-foreground">Expert instructors with proven track records in IELTS preparation.</p>
              </Card>
              <Card className="p-6 border-border">
                <Users className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">5000+ Students</h3>
                <p className="text-muted-foreground">Successfully guided students to achieve their target scores.</p>
              </Card>
              <Card className="p-6 border-border">
                <Globe className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Global Partnerships</h3>
                <p className="text-muted-foreground">Collaborations with universities in UK, USA, Canada, and Australia.</p>
              </Card>
              <Card className="p-6 border-border">
                <TrendingUp className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">95% Success Rate</h3>
                <p className="text-muted-foreground">Students achieving their target band scores on first attempt.</p>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;

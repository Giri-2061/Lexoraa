import { Card } from "@/components/ui/card";
import { BookOpen, Globe, Users, Award } from "lucide-react";

const expertiseItems = [
  {
    icon: BookOpen,
    title: "IELTS Preparation",
    description: "Comprehensive coaching across Listening, Reading, Writing, and Speaking with experienced instructors."
  },
  {
    icon: BookOpen,
    title: "Mini Library",
    description: "A curated mini-library and reading space to support self-study and group learning."
  },
  {
    icon: Users,
    title: "Community Programs",
    description: "Exploring community lives through events and study groups rooted in local engagement."
  },
  {
    icon: Award,
    title: "Co-working & Reading Space",
    description: "Comfortable co-working and reading spaces to help students focus and collaborate."
  }
];

const ExpertiseSection = () => {
  return (
    <section className="py-20 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">Our Expertise</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive services to guide you through every step of your international education journey
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {expertiseItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-2 border-border bg-card group"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ExpertiseSection;

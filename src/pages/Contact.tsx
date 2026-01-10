import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Send, Github, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message sent!",
      description: "We'll get back to you as soon as possible.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-6 text-center">Contact Us</h1>
            <p className="text-lg text-muted-foreground text-center mb-12">
              Get in touch with our team for personalized guidance
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Info */}
              <div>
                <h2 className="text-2xl font-semibold text-card-foreground mb-6">Get In Touch</h2>
                <div className="space-y-4">
                  <Card className="p-4 border-border flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Address</h3>
                      <p className="text-muted-foreground">Chardobato, 07 Banepa, Kavre</p>
                    </div>
                  </Card>
                  <Card className="p-4 border-border flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Phone</h3>
                      <a href="tel:+9779767364658" className="text-muted-foreground hover:text-primary">011-66-5060, +977 9767364658</a>
                    </div>
                  </Card>
                  <Card className="p-4 border-border flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      <a href="mailto:learningloungenepal@gmail.com" className="text-muted-foreground hover:text-primary">learningloungenepal@gmail.com</a>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Contact Form */}
              <Card className="p-6 border-border">
                <h2 className="text-2xl font-semibold text-card-foreground mb-6">Send Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <Input placeholder="Your name" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input type="email" placeholder="your@email.com" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <Input type="tel" placeholder="+977 9741740551" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Message</label>
                    <Textarea placeholder="How can we help you?" rows={5} required />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </form>
              </Card>
            </div>

            {/* Developer / Team Section */}
            <div className="mt-12">
              <h2 className="text-3xl font-semibold text-card-foreground mb-3 text-center">Team Lexora</h2>
              <p className="text-center text-muted-foreground mb-8">Team Lexora built this project and are handling overall system advancements.</p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Member Card */}
                {[
                  { name: 'Aayush Dahal' },
                  { name: 'Parichit Giri' },
                  { name: 'Aryan Koju' },
                  { name: 'Rupak Karki' },
                ].map((m) => (
                  <Card key={m.name} className="p-4 flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-3">
                      <span className="text-xl font-medium text-muted-foreground">{m.name.split(' ').map(n=>n[0]).join('')}</span>
                    </div>
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-sm text-muted-foreground mb-3">Developer</div>
                    <div className="flex gap-3">
                      <a href="#" aria-label={`GitHub for ${m.name}`} className="p-2 rounded hover:bg-muted inline-flex">
                        <Github className="w-5 h-5" />
                      </a>
                      <a href="#" aria-label={`Instagram for ${m.name}`} className="p-2 rounded hover:bg-muted inline-flex">
                        <Instagram className="w-5 h-5" />
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;

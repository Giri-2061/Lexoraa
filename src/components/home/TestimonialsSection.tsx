import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Quote, Star, ArrowLeft, ArrowRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

const testimonials = [
  {
    name: "Aayush Dahal",
    country: "Nepal",
    score: "8.5",
    image: "",
    text: "IELTS Pro transformed my preparation journey. The mock tests were incredibly accurate, and the personalized feedback helped me achieve a band score of 8.5. Highly recommended!"
  },
  {
    name: "Parichit Giri",
    country: "Nepal",
    score: "8.0",
    image: "",
    text: "The instructors at IELTS Pro are exceptional. Their speaking practice sessions boosted my confidence tremendously. I scored 8.0 overall and got admission to my dream university!"
  },
  {
    name: "Aryan Koju",
    country: "Nepal",
    score: "7.5",
    image: "",
    text: "Outstanding visa guidance and university counseling. Not only did I achieve my target IELTS score of 7.5, but the team also helped me plan my study abroad path."
  }
];

const TestimonialsSection = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center', dragFree: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-2">Student Success Stories</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Hear from students who achieved their goals with our guidance</p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Embla viewport */}
          <div className="embla" ref={emblaRef}>
            <div className="embla__container flex gap-6 px-4 touch-pan-y">
              {testimonials.map((t, idx) => {
                const isActive = idx === selectedIndex;
                return (
                  <div key={idx} className="embla__slide flex-[0_0_70%] md:flex-[0_0_33%]">
                    <Card className={`p-6 transition-transform duration-300 ${isActive ? 'scale-100 z-20' : 'scale-95 opacity-70'}`}>
                      <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Quote className="w-16 h-16 text-accent" />
                      </div>
                      <div className="flex gap-3 mb-4">
                        <Avatar className="w-12 h-12 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{t.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-card-foreground">{t.name}</p>
                          <p className="text-sm text-muted-foreground">{t.country} • Band {t.score}</p>
                        </div>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">"{t.text}"</p>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="absolute top-1/2 -translate-y-1/2 left-2 flex items-center gap-2">
            <button onClick={scrollPrev} aria-label="Previous" className="w-10 h-10 rounded-full bg-card shadow flex items-center justify-center hover:bg-primary/10">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-2">
            <button onClick={scrollNext} aria-label="Next" className="w-10 h-10 rounded-full bg-card shadow flex items-center justify-center hover:bg-primary/10">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Scroll hint */}
          <div className="mt-4 text-center text-sm text-muted-foreground">Swipe left or right to see more — it's a loop</div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

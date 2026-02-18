import { cn } from '@/lib/utils';
import { TestimonialCard, type TestimonialAuthor } from '@/components/ui/testimonial-card';

interface TestimonialsSectionProps {
  title: string;
  description: string;
  testimonials: Array<{ author: TestimonialAuthor; text: string; href?: string }>;
  className?: string;
}

export function TestimonialsSection({
  title,
  description,
  testimonials,
  className,
}: TestimonialsSectionProps) {
  return (
    <section className={cn('bg-black text-white', 'py-12 sm:py-20 md:py-24 px-0', className)}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:gap-12">
        <div className="flex flex-col items-center gap-4 px-4 sm:gap-6">
          <h2 className="max-w-[720px] text-3xl font-extrabold leading-tight sm:text-5xl sm:leading-tight">
            {title}
          </h2>
          <p className="max-w-[680px] text-sm font-medium text-slate-300 sm:text-lg">{description}</p>
        </div>

        <div className="w-full px-4 sm:hidden">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
            {testimonials.map((testimonial, i) => (
              <TestimonialCard key={`m-${i}`} {...testimonial} className="min-w-[84%] snap-center" />
            ))}
          </div>
        </div>

        <div className="relative hidden w-full flex-col items-center justify-center overflow-hidden sm:flex">
          <div className="group flex overflow-hidden p-2 [--gap:1rem] [gap:var(--gap)] flex-row [--duration:40s]">
            <div className="flex shrink-0 justify-around [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused]">
              {[...Array(3)].map((_, setIndex) =>
                testimonials.map((testimonial, i) => (
                  <TestimonialCard key={`${setIndex}-${i}`} {...testimonial} />
                )),
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-black" />
        </div>
      </div>
    </section>
  );
}

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
    <section className={cn('bg-transparent text-white', 'px-4 py-10 sm:py-14', className)}>
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-800 bg-slate-950/70 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{title}</h2>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">{description}</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {testimonials.slice(0, 6).map((testimonial, i) => (
            <TestimonialCard key={`t-${i}`} {...testimonial} className="w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}

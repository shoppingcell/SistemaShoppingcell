import React from 'react';

export type TestimonialAuthor = {
  name: string;
  handle?: string;
  avatar?: string;
};

export function TestimonialCard({ author, text, href, className }: any) {
  return (
    <article className={className}>
      <div className="rounded-lg border border-white/6 bg-white/5 p-4 text-left">
        <div className="flex items-center gap-3">
          {author?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatar} alt={author.name} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-slate-700" />
          )}
          <div>
            <div className="font-semibold text-white">{author?.name}</div>
            <div className="text-xs text-slate-400">{author?.handle}</div>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-200">{text}</p>
      </div>
    </article>
  );
}

export default TestimonialCard;

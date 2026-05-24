'use client';

import { useState } from 'react';
import type { CommunityImage } from '@prisma/client';
import { imageUrl } from '@/lib/images';

export function CommunityGallery({ images, alt }: { images: CommunityImage[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;
  const current = images[active];
  const heroSrc = imageUrl(current, 1600) ?? '/placeholder.svg';

  return (
    <div>
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-sand-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroSrc}
          alt={current.alt ?? alt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {images.slice(0, 10).map((img, i) => {
            const thumbSrc = imageUrl(img, 300) ?? '/placeholder.svg';
            return (
              <li key={img.id}>
                <button
                  type="button"
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === active}
                  onClick={() => setActive(i)}
                  className={`relative aspect-[4/3] w-full overflow-hidden rounded-md border ${
                    i === active ? 'border-brand-600' : 'border-brand-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbSrc}
                    alt={img.alt ?? alt}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

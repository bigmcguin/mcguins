'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { CommunityImage } from '@prisma/client';

export function CommunityGallery({ images, alt }: { images: CommunityImage[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;
  const current = images[active];

  return (
    <div>
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-sand-100">
        <Image
          src={cloudinaryUrl(current.publicId, 1600)}
          alt={current.alt ?? alt}
          fill
          priority
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {images.slice(0, 10).map((img, i) => (
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
                <Image
                  src={cloudinaryUrl(img.publicId, 300)}
                  alt={img.alt ?? alt}
                  fill
                  sizes="100px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function cloudinaryUrl(publicId: string, width: number) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloud) return '/placeholder.svg';
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;
}

// Resolves an image source URL for a CommunityImage row. Prefers Cloudinary
// (which gives us automatic resize, format negotiation, and a CDN) but falls
// back to an external URL when that's all we have.

type ImageRow = {
  publicId: string | null;
  externalUrl: string | null;
};

export function imageUrl(img: ImageRow, width: number): string | null {
  if (img.publicId) {
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD ?? '';
    return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,w_${width}/${img.publicId}`;
  }
  if (img.externalUrl) return img.externalUrl;
  return null;
}

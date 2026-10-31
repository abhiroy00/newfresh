import { PixelRatio } from 'react-native';

/**
 * Ask Cloudinary for a copy sized for the screen instead of the ~2 MB
 * original PNG, which loads so slowly on mobile data that the product screen
 * looks blank. `c_limit` only ever shrinks — never crops or upscales — so the
 * whole image is kept. Non-Cloudinary URLs are returned unchanged.
 */
export function cdnImage(url: string | undefined | null, displayWidth: number): string {
  if (!url) return '';
  const marker = '/image/upload/';
  const i = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || i === -1) return url;
  const w = Math.min(2000, Math.round(PixelRatio.getPixelSizeForLayoutSize(displayWidth)));
  const rest = url.slice(i + marker.length);
  // Don't stack transformations on a URL that already has some.
  if (/^(c_|w_|h_|q_|f_)/.test(rest)) return url;
  return `${url.slice(0, i + marker.length)}c_limit,w_${w},q_auto,f_auto/${rest}`;
}

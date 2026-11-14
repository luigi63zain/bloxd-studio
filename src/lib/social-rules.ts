export const REWARD_COINS = { reaction: 1, use: 2, remix: 5 } as const;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export function mediaKind(file: { type: string; size: number }): 'image' | 'video' {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw new Error('Choose a file up to 20 MB');
  if (['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) return 'image';
  if (['video/mp4', 'video/webm', 'video/ogg'].includes(file.type)) return 'video';
  throw new Error('Choose a PNG, JPG, GIF, WebP, MP4, WebM or Ogg file');
}
export function giftAmount(value: string): number {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 1 || amount > 1000000) throw new Error('Enter 1 to 1,000,000 ULTRACOINS');
  return amount;
}

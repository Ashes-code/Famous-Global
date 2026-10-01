// ============================================================
//  Supabase client + shared helpers
//  Fill in the two values below from:
//  Supabase Dashboard → Project Settings → API
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://rdjvczjiynmmyabjtofl.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkanZjemppeW5tbXlhYmp0b2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NDI5MTEsImV4cCI6MjEwNjQxODkxMX0.4ojGi0PvQibLUWR9ZIwmUIWKSwOxFTpbTaBI1Wvr398';

export const BUCKET = 'media';

export const isConfigured =
  !SUPABASE_URL.includes('YOUR_') && !SUPABASE_ANON_KEY.includes('YOUR_');

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Detect which platform a pasted video URL belongs to.
export function detectPlatform(url = '') {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  return 'other';
}

// Pull a YouTube video id out of the common URL shapes.
export function youtubeId(url = '') {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

// Public URL for an uploaded file path in the media bucket.
export function publicUrl(path) {
  if (!supabase || !path) return '';
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Format a number as Naira.
export function formatNaira(value) {
  if (value === null || value === undefined || value === '') return '';
  return '\u20A6' + Number(value).toLocaleString('en-NG');
}

// Build the "Chat to order" WhatsApp link for a gadget.
export function whatsappOrderLink(item) {
  const price = item.price ? ' (' + formatNaira(item.price) + ')' : '';
  const text = `Hello Famous Global, I'd like to order: ${item.name}${price}`;
  return 'https://wa.me/2347055337315?text=' + encodeURIComponent(text);
}

// Small unique id helper for storage filenames.
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

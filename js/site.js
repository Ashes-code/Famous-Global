// ============================================================
//  Public site renderer
//  Fetches items from Supabase and renders the portfolio grids.
//  If not configured / empty / offline, the static fallback
//  markup already in index.html is left untouched.
// ============================================================

import {
  supabase, isConfigured, detectPlatform, youtubeId,
  formatNaira, whatsappOrderLink
} from './supabase.js';

const videoGrid = document.getElementById('videoGrid');
const graphicGrid = document.getElementById('graphicGrid');
const gadgetGrid = document.getElementById('gadgetGrid');

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const WHATSAPP_ICON = '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

function youtubeThumb(url) {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}

// Build an embeddable player URL for a video item, or null if not possible.
function embedFor(item) {
  const url = item.video_url || '';
  const platform = item.platform || detectPlatform(url);
  if (platform === 'youtube') {
    const id = youtubeId(url);
    return id ? { src: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`, ratio: '16:9' } : null;
  }
  if (platform === 'tiktok') {
    const m = url.match(/video\/(\d+)/);
    return m ? { src: `https://www.tiktok.com/embed/v2/${m[1]}`, ratio: '16:9' } : null;
  }
  if (platform === 'instagram') {
    const m = url.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    const kind = url.includes('/reel/') ? 'reel' : 'p';
    return m ? { src: `https://www.instagram.com/${kind}/${m[1]}/embed`, ratio: '16:9' } : null;
  }
  return null;
}

function openImage(el) {
  const img = el.querySelector('img');
  if (window.FGLightbox) window.FGLightbox.openImage(el.getAttribute('data-src'), img ? img.alt : '');
}

// ---------- graphics ----------
function renderGraphics(items) {
  if (!items.length) return;
  graphicGrid.innerHTML = items.map((item) => `
    <button type="button" data-src="${esc(item.image_url)}" aria-label="View ${esc(item.name)}"
      class="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-line bg-[#111] transition duration-300 hover:border-gold focus:outline-none focus:ring-2 focus:ring-gold/50">
      <img src="${esc(item.image_url)}" alt="${esc(item.name)}" loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]">
      <span class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent px-4 pb-3 pt-12">
        <span class="block truncate text-sm font-bold text-white">${esc(item.name)}</span>
      </span>
      <span class="pointer-events-none absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/60 text-white opacity-0 transition group-hover:opacity-100">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
      </span>
    </button>`).join('');
  graphicGrid.querySelectorAll('[data-src]').forEach((el) => el.addEventListener('click', () => openImage(el)));
}

// ---------- gadgets ----------
function renderGadgets(items) {
  if (!items.length) return;
  gadgetGrid.innerHTML = items.map((item) => `
    <div class="flash-card flex flex-col overflow-hidden rounded-2xl border border-line bg-panel transition duration-300 hover:-translate-y-1 hover:border-gold/40">
      <button type="button" data-src="${esc(item.image_url)}" aria-label="View ${esc(item.name)}" class="group relative aspect-square w-full overflow-hidden bg-[#111]">
        <img src="${esc(item.image_url)}" alt="${esc(item.name)}" loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]">
      </button>
      <div class="flex flex-1 flex-col p-4">
        ${item.category ? `<span class="mb-1 text-[10px] font-bold uppercase tracking-[.15em] text-neutral-500">${esc(item.category)}</span>` : ''}
        <h3 class="font-bold">${esc(item.name)}</h3>
        ${item.description ? `<p class="mt-1 text-sm text-neutral-500">${esc(item.description)}</p>` : ''}
        ${item.price != null ? `<p class="mt-3 text-lg font-black text-gold-light">${esc(formatNaira(item.price))}</p>` : ''}
        <a href="${esc(whatsappOrderLink(item))}" target="_blank" rel="noopener"
          class="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-gold bg-gold px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-gold-light">
          ${WHATSAPP_ICON} Chat to order
        </a>
      </div>
    </div>`).join('');
  gadgetGrid.querySelectorAll('[data-src]').forEach((el) => el.addEventListener('click', () => openImage(el)));
}

// ---------- videos ----------
function renderVideos(items) {
  if (!items.length) return;
  videoGrid.innerHTML = items.map((item) => {
    const cover = item.image_url || youtubeThumb(item.video_url);
    const platform = (item.platform || detectPlatform(item.video_url) || 'video').toUpperCase();
    return `
    <button type="button" data-video data-url="${esc(item.video_url || '')}" data-platform="${esc(item.platform || '')}"
      class="flash-card group relative block min-h-[330px] w-full overflow-hidden rounded-2xl border border-line bg-[#111] text-left">
      ${cover
        ? `<img src="${esc(cover)}" alt="${esc(item.name)}" loading="lazy" class="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]">`
        : `<span class="absolute inset-0 flex min-h-[330px] items-center justify-center text-sm text-neutral-600">${esc(item.name)}</span>`}
      <span class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent"></span>
      <span class="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur transition duration-300 group-hover:scale-110 group-hover:border-gold/60 group-hover:text-gold-light">
        <svg class="ml-1 h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </span>
      <span class="absolute bottom-4 left-4 right-4">
        <span class="block text-sm font-bold text-white">${esc(item.name)}</span>
        <span class="mt-1 inline-block rounded bg-black/60 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gold-light">${esc(platform)}</span>
      </span>
    </button>`;
  }).join('');

  videoGrid.querySelectorAll('[data-video]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      const embed = embedFor({ video_url: url, platform: btn.dataset.platform });
      if (embed && window.FGLightbox) {
        window.FGLightbox.openVideo(embed.src, embed.ratio);
      } else if (url) {
        window.open(url, '_blank', 'noopener');
      }
    });
  });
}

// ---------- load ----------
async function load() {
  if (!isConfigured || !supabase) return;
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    const all = data || [];
    renderVideos(all.filter((i) => i.type === 'video'));
    renderGraphics(all.filter((i) => i.type === 'graphic' && i.image_url));
    renderGadgets(all.filter((i) => i.type === 'gadget' && i.image_url));
  } catch (err) {
    console.warn('Famous Global: showing static fallback —', err.message);
  }
}

load();

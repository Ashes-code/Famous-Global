import {
  supabase, isConfigured, BUCKET, detectPlatform, youtubeId,
  publicUrl, formatNaira, uid
} from './supabase.js';

// ---------- element refs ----------
const $ = (id) => document.getElementById(id);

const loginView = $('loginView');
const dashboardView = $('dashboardView');
const configWarning = $('configWarning');
const loginForm = $('loginForm');
const loginError = $('loginError');
const logoutBtn = $('logoutBtn');
const viewSiteBtn = $('viewSiteBtn');

const itemForm = $('itemForm');
const editId = $('editId');
const nameEl = $('name');
const descEl = $('description');
const priceEl = $('price');
const catEl = $('category');
const catList = $('categoryList');
const videoEl = $('videoUrl');
const platformHint = $('platformHint');
const imageEl = $('image');
const imageHint = $('imageHint');
const previewWrap = $('previewWrap');
const preview = $('preview');
const formTitle = $('formTitle');
const submitBtn = $('submitBtn');
const cancelEditBtn = $('cancelEdit');
const formError = $('formError');

const adminList = $('adminList');
const listTitle = $('listTitle');
const emptyState = $('emptyState');
const toasts = $('toasts');

// ---------- state ----------
const LABELS = { graphic: 'Graphics', gadget: 'Gadgets', video: 'Videos' };
const SINGULAR = { graphic: 'graphic', gadget: 'gadget', video: 'video' };
const DEFAULT_CATEGORIES = ['Power bank', 'Smart watch', 'Air pods', 'Headphones', 'Earpiece & chargers'];

let currentTab = 'graphic';
let items = [];
let editing = null;
let sortable = null;

// ---------- helpers ----------
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Format a price string with thousands separators (e.g. 1500000 -> 1,500,000).
function formatPrice(value) {
  let s = String(value).replace(/[^\d.]/g, '');
  const parts = s.split('.');
  let whole = parts[0].replace(/^0+(?=\d)/, '');
  if (!whole && parts.length > 1) whole = '0';
  whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let out = whole;
  if (parts.length > 1) out += '.' + parts.slice(1).join('').slice(0, 2);
  return out;
}

// Strip separators back to a number, or null when empty.
function parsePrice(value) {
  const clean = String(value).replace(/,/g, '').trim();
  return clean === '' ? null : Number(clean);
}

function toast(message, isError = false) {
  const el = document.createElement('div');
  el.className = 'pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ' +
    (isError ? 'border-red-500/40 bg-red-950/80 text-red-200' : 'border-gold/40 bg-[#12100a]/90 text-gold-light');
  el.textContent = message;
  toasts.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
  setTimeout(() => el.remove(), 3000);
}

function showError(msg) {
  formError.textContent = msg;
  formError.classList.remove('hidden');
}
function friendly(err) {
  const m = (err && err.message) || String(err || '');
  if (m.includes('public.items') || m.includes('schema cache')) {
    return 'Database not set up yet — run supabase/schema.sql in the Supabase SQL Editor, then reload.';
  }
  if (m.includes('Bucket not found') || m.includes('NoSuchBucket')) {
    return 'Storage bucket missing — run supabase/schema.sql in the Supabase SQL Editor, then reload.';
  }
  return m || 'Something went wrong.';
}
function clearError() {
  formError.textContent = '';
  formError.classList.add('hidden');
}
function setFormBusy(busy) {
  submitBtn.disabled = busy;
  submitBtn.classList.toggle('opacity-60', busy);
}

function coverFor(item) {
  if (item.image_url) return item.image_url;
  if (item.type === 'video' && item.platform === 'youtube') {
    const yid = youtubeId(item.video_url);
    if (yid) return `https://img.youtube.com/vi/${yid}/hqdefault.jpg`;
  }
  return '';
}

// ---------- auth ----------
function showLogin() {
  loginView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
  logoutBtn.classList.add('hidden');
  viewSiteBtn.classList.add('hidden');
  viewSiteBtn.classList.remove('inline-block');
}
function showDashboard() {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  viewSiteBtn.classList.remove('hidden');
  viewSiteBtn.classList.add('inline-block');
  setTab(currentTab);
  refreshCategories();
}

async function initAuth() {
  if (!isConfigured) {
    configWarning.classList.remove('hidden');
    showLogin();
    return;
  }
  const { data } = await supabase.auth.getSession();
  data.session ? showDashboard() : showLogin();
  supabase.auth.onAuthStateChange((_event, session) => {
    session ? showDashboard() : showLogin();
  });
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  if (!supabase) {
    loginError.textContent = 'Supabase is not configured yet. See js/supabase.js.';
    loginError.classList.remove('hidden');
    return;
  }
  const btn = loginForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  const { error } = await supabase.auth.signInWithPassword({
    email: $('email').value.trim(),
    password: $('password').value
  });
  btn.disabled = false;
  if (error) {
    loginError.textContent = error.message;
    loginError.classList.remove('hidden');
  } else {
    loginForm.reset();
  }
});

logoutBtn.addEventListener('click', () => supabase && supabase.auth.signOut());

// ---------- tabs ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => setTab(btn.dataset.tab));
});

function setTab(tab) {
  currentTab = tab;
  cancelEdit();
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('bg-gold', active);
    btn.classList.toggle('text-ink', active);
    btn.classList.toggle('text-neutral-300', !active);
  });
  listTitle.textContent = LABELS[tab];
  updateFormFor();
  loadItems();
}

function updateFormFor() {
  const isVideo = currentTab === 'video';
  const isGadget = currentTab === 'gadget';
  document.querySelector('[data-field="desc"]').classList.toggle('hidden', !isGadget);
  document.querySelector('[data-field="price"]').classList.toggle('hidden', !isGadget);
  document.querySelector('[data-field="category"]').classList.toggle('hidden', !isGadget);
  document.querySelector('[data-field="video"]').classList.toggle('hidden', !isVideo);

  const label = SINGULAR[currentTab];
  formTitle.textContent = (editing ? 'Edit ' : 'Add ') + label;
  submitBtn.textContent = editing ? 'Save changes' : 'Add ' + label;

  if (isVideo) {
    imageHint.textContent = 'Cover image — optional for YouTube (auto), recommended for TikTok / Instagram.';
  } else {
    imageHint.textContent = 'JPG or PNG, up to 8MB.';
  }
}

// ---------- load + render ----------
async function loadItems() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('type', currentTab)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) { toast(friendly(error), true); return; }
  items = data || [];
  renderList();
}

function renderList() {
  adminList.innerHTML = '';
  emptyState.classList.toggle('hidden', items.length > 0);
  const isGadget = currentTab === 'gadget';

  items.forEach((item) => {
    const cover = coverFor(item);
    const card = document.createElement('div');
    card.setAttribute('data-id', item.id);
    card.className = 'overflow-hidden rounded-xl border border-line bg-panel';
    card.innerHTML = `
      <div class="aspect-square bg-[#111]">
        ${cover
          ? `<img src="${esc(cover)}" alt="" loading="lazy" class="h-full w-full object-cover">`
          : `<div class="grid h-full place-items-center text-xs text-neutral-600">No image</div>`}
      </div>
      <div class="p-3">
        <p class="truncate text-sm font-bold">${esc(item.name)}</p>
        ${isGadget && item.category ? `<p class="mt-0.5 truncate text-xs text-neutral-500">${esc(item.category)}</p>` : ''}
        ${isGadget && item.price != null ? `<p class="mt-1 text-xs font-bold text-gold-light">${esc(formatNaira(item.price))}</p>` : ''}
        <div class="mt-3 flex gap-2">
          <button data-action="edit" class="flex-1 rounded-lg border border-line px-2 py-1.5 text-xs font-bold text-neutral-300 transition hover:border-gold/40 hover:text-gold-light">Edit</button>
          <button data-action="delete" class="rounded-lg border border-line px-2 py-1.5 text-xs font-bold text-neutral-300 transition hover:border-red-500/50 hover:text-red-300">Delete</button>
        </div>
      </div>`;
    adminList.appendChild(card);
  });
}

adminList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.closest('[data-id]').getAttribute('data-id');
  const item = items.find((i) => i.id === id);
  if (!item) return;
  if (btn.dataset.action === 'edit') startEdit(item);
  if (btn.dataset.action === 'delete') deleteItem(item);
});

// ---------- reorder ----------
function initSortable() {
  if (sortable || !window.Sortable) return;
  sortable = window.Sortable.create(adminList, {
    animation: 150,
    filter: 'button',
    ghostClass: 'opacity-40',
    onEnd: async () => {
      const ids = [...adminList.querySelectorAll('[data-id]')].map((el) => el.getAttribute('data-id'));
      try {
        await Promise.all(ids.map((id, index) =>
          supabase.from('items').update({ sort_order: index }).eq('id', id)
        ));
        toast('Order saved.');
      } catch {
        toast('Could not save order.', true);
      }
    }
  });
}

// ---------- categories ----------
async function refreshCategories() {
  if (!supabase) return;
  const { data } = await supabase.from('items').select('category').eq('type', 'gadget');
  const set = new Set(DEFAULT_CATEGORIES);
  (data || []).forEach((r) => { if (r.category) set.add(r.category); });
  catList.innerHTML = [...set].map((c) => `<option value="${esc(c)}"></option>`).join('');
}

// ---------- create / edit ----------
function startEdit(item) {
  editing = item;
  editId.value = item.id;
  nameEl.value = item.name || '';
  descEl.value = item.description || '';
  priceEl.value = item.price != null ? formatPrice(item.price) : '';
  catEl.value = item.category || '';
  videoEl.value = item.video_url || '';
  updatePlatformHint();
  imageEl.value = '';
  if (item.image_url) {
    preview.src = item.image_url;
    previewWrap.classList.remove('hidden');
  } else {
    previewWrap.classList.add('hidden');
  }
  updateFormFor();
  cancelEditBtn.classList.remove('hidden');
  clearError();
  itemForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEdit() {
  editing = null;
  editId.value = '';
  itemForm.reset();
  previewWrap.classList.add('hidden');
  preview.removeAttribute('src');
  cancelEditBtn.classList.add('hidden');
  clearError();
  updateFormFor();
}

cancelEditBtn.addEventListener('click', cancelEdit);

imageEl.addEventListener('change', () => {
  const file = imageEl.files[0];
  if (!file) { previewWrap.classList.add('hidden'); return; }
  preview.src = URL.createObjectURL(file);
  previewWrap.classList.remove('hidden');
});

function updatePlatformHint() {
  const url = videoEl.value.trim();
  if (!url) { platformHint.textContent = 'Platform detected automatically.'; return; }
  platformHint.textContent = 'Detected: ' + detectPlatform(url);
}
videoEl.addEventListener('input', updatePlatformHint);

// Price: live thousands separators, no wheel / arrow-key stepping.
priceEl.addEventListener('input', () => {
  priceEl.value = formatPrice(priceEl.value);
});
priceEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
});
priceEl.addEventListener('wheel', (e) => {
  if (document.activeElement === priceEl) e.preventDefault();
}, { passive: false });

async function uploadImage(file, folder) {
  if (!file.type.startsWith('image/')) { showError('Please choose an image file.'); return null; }
  if (file.size > 8 * 1024 * 1024) { showError('Image must be under 8MB.'); return null; }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${folder}/${uid()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000', upsert: false, contentType: file.type
  });
  if (error) { showError(friendly(error)); return null; }
  return { url: publicUrl(path), path };
}

itemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  if (!supabase) return;

  const type = currentTab;
  const id = editId.value;
  const name = nameEl.value.trim();
  if (!name) return showError('Please enter a name.');

  setFormBusy(true);
  try {
    let imageUrl = editing ? editing.image_url : null;
    let storagePath = editing ? editing.storage_path : null;

    const file = imageEl.files[0];
    if (file) {
      const folder = type === 'video' ? 'covers' : (type === 'graphic' ? 'graphics' : 'gadgets');
      const up = await uploadImage(file, folder);
      if (!up) { setFormBusy(false); return; }
      if (editing && editing.storage_path && editing.storage_path !== up.path) {
        await supabase.storage.from(BUCKET).remove([editing.storage_path]);
      }
      imageUrl = up.url;
      storagePath = up.path;
    }

    const payload = {
      type,
      name,
      description: type === 'gadget' ? (descEl.value.trim() || null) : null,
      price: type === 'gadget' ? parsePrice(priceEl.value) : null,
      category: type === 'gadget' ? (catEl.value.trim() || null) : null,
      image_url: imageUrl,
      storage_path: storagePath,
      video_url: type === 'video' ? (videoEl.value.trim() || null) : null,
      platform: type === 'video' ? detectPlatform(videoEl.value.trim()) : null
    };

    if ((type === 'graphic' || type === 'gadget') && !payload.image_url) {
      setFormBusy(false); return showError('Please choose an image.');
    }
    if (type === 'video' && !payload.video_url) {
      setFormBusy(false); return showError('Please paste a video link.');
    }

    if (id) {
      const { error } = await supabase.from('items').update(payload).eq('id', id);
      if (error) throw error;
      toast('Saved changes.');
    } else {
      const { data: rows } = await supabase
        .from('items').select('sort_order').eq('type', type)
        .order('sort_order', { ascending: false }).limit(1);
      const next = rows && rows.length ? (rows[0].sort_order || 0) + 1 : 0;
      const { error } = await supabase.from('items').insert({ ...payload, sort_order: next });
      if (error) throw error;
      toast('Added.');
    }
    cancelEdit();
    await loadItems();
    refreshCategories();
  } catch (err) {
    showError(friendly(err));
  } finally {
    setFormBusy(false);
  }
});

async function deleteItem(item) {
  if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
  try {
    if (item.storage_path) {
      await supabase.storage.from(BUCKET).remove([item.storage_path]);
    }
    const { error } = await supabase.from('items').delete().eq('id', item.id);
    if (error) throw error;
    toast('Deleted.');
    await loadItems();
  } catch (err) {
    toast(friendly(err), true);
  }
}

// ---------- boot ----------
initAuth();
initSortable();
updateFormFor();

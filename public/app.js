const input = document.getElementById('discord-id-input');
const btn = document.getElementById('lookup-btn');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const tagEl = document.getElementById('result-tag');
const idEl = document.getElementById('result-id');
const usernameEl = document.getElementById('result-username');
const createdEl = document.getElementById('result-created');
const badgesEl = document.getElementById('result-badges');
const avatarEl = document.getElementById('result-avatar');
const avatarLinkEl = document.getElementById('avatar-link');
const bannerWrapEl = document.getElementById('result-banner-wrap');
const bannerEl = document.getElementById('result-banner');
const bannerLinkEl = document.getElementById('banner-link');

function setStatus(text, type = '') {
  statusEl.textContent = text || '';
  statusEl.className = `status ${type}`.trim();
}

async function lookup() {
  const id = input.value.trim();
  if (!/^\d{17,20}$/.test(id)) {
    setStatus('Please enter a valid Discord ID (17-20 digits).', 'error');
    resultEl.classList.add('hidden');
    return;
  }

  setStatus('Looking up user...', '');
  btn.disabled = true;

  try {
    const resp = await fetch(`/api/user/${id}`);
    const data = await resp.json();

    if (!resp.ok) {
      setStatus(data.error || 'Lookup failed.', 'error');
      resultEl.classList.add('hidden');
      return;
    }

    setStatus('User found.', 'ok');

    // Kart başlığı: önce global name, yoksa username, o da yoksa tag
    tagEl.textContent = data.globalName || data.username || data.tag;
    idEl.textContent = data.id;
    usernameEl.textContent = data.username;
    createdEl.textContent = data.createdAtHuman;

    // Rozetleri PNG ikon olarak göster
    badgesEl.innerHTML = '';
    if (Array.isArray(data.badgeImages) && data.badgeImages.length) {
      data.badgeImages.forEach((url) => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'badge';
        img.className = 'badge-icon';
        badgesEl.appendChild(img);
      });
    } else {
      badgesEl.textContent = 'None';
    }

    avatarEl.src = data.avatarUrl;
    avatarLinkEl.href = data.avatarUrl;

    if (data.bannerUrl) {
      bannerEl.src = data.bannerUrl;
      bannerLinkEl.href = data.bannerUrl;
      bannerWrapEl.classList.remove('hidden');
    } else {
      bannerWrapEl.classList.add('hidden');
    }

    resultEl.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    setStatus('Request failed. Check console.', 'error');
    resultEl.classList.add('hidden');
  } finally {
    btn.disabled = false;
  }
}

btn.addEventListener('click', lookup);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') lookup();
});

// Click-to-copy for ID and Username
function attachCopyHandlers() {
  document.querySelectorAll('.copyable').forEach((el) => {
    el.addEventListener('click', async () => {
      const text = el.textContent.trim();
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setStatus('Copied to clipboard.', 'ok');
        setTimeout(() => setStatus('', ''), 1200);
      } catch {
        setStatus('Could not copy to clipboard.', 'error');
      }
    });
  });
}

// Re-attach copy handlers after each successful lookup
document.addEventListener('DOMContentLoaded', () => {
  attachCopyHandlers();
});

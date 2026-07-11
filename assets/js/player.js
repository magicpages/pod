// Pod — custom JS audio player. Hydrates the markup from partials/audio-player.hbs.
// Waveform bars are generated client-side from a deterministic per-src hash.

const SPEEDS = [1, 1.25, 1.5, 1.75, 2, 0.75];
const WAVEFORM_BAR_COUNT = 60;

function format(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// Mulberry32 PRNG — deterministic per src, so the waveform shape is stable.
function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Resolution order: explicit data-src → pod:audio= codeinjection override →
// first <audio> in the post body → first <audio> in the stashed post html.
function resolveAudioSrc(playerEl) {
  const explicit = playerEl.getAttribute('data-src');
  if (explicit) return explicit;

  const meta = document.querySelector('[data-pod-meta]');
  if (meta) {
    const m = (meta.textContent || '').match(/<!--\s*pod:audio=([^>]+?)\s*-->/);
    if (m) return m[1].trim();
  }

  const inPost = document.querySelector('.post-content audio[src]');
  if (inPost) {
    // Hide the inline <audio> so the post body doesn't render two players.
    const src = inPost.getAttribute('src');
    const figure = inPost.closest('figure');
    (figure || inPost).style.display = 'none';
    return src;
  }
  const stash = document.querySelector('[data-pod-html]');
  if (stash) {
    const m = (stash.textContent || '').match(/<audio[^>]+src=["']([^"']+)["']/);
    if (m) return m[1];
  }

  return null;
}

class PodPlayer {
  constructor(root) {
    this.root = root;
    this.src = resolveAudioSrc(root);
    if (!this.src) {
      console.warn('pod-player: no audio source found, hiding player');
      root.style.display = 'none';
      return;
    }
    root.setAttribute('data-src', this.src);

    this.audio = new Audio();
    // preload=none until the user interacts — keeps LCP fast on episode
    // pages even when the mp3 is multi-MB. Escalate to 'metadata' on first
    // hover/focus (so duration shows when about to play), to 'auto' on play.
    this.audio.preload = 'none';
    this.audio.src = this.src;

    const escalate = () => {
        if (this.audio.preload !== 'none') return;
        this.audio.preload = 'metadata';
    };
    root.addEventListener('pointerenter', escalate, { once: true, passive: true });
    root.addEventListener('focusin', escalate, { once: true });

    this.toggleBtn = root.querySelector('[data-pod-toggle]');
    this.scrub = root.querySelector('[data-pod-scrub]');
    this.currentEl = root.querySelector('[data-pod-current]');
    this.totalEl = root.querySelector('[data-pod-total]');
    this.speedBtn = root.querySelector('[data-pod-speed]');
    this.downloadLink = root.querySelector('[data-pod-download]');
    if (this.downloadLink) this.downloadLink.href = this.src;

    this.speedIndex = 0;
    this.bars = [];

    this.#renderWaveform();
    this.#bind();
  }

  #renderWaveform() {
    if (!this.scrub) return;
    this.scrub.innerHTML = '';

    const rand = seededRandom(hashStringToSeed(this.src));
    for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
      const bar = document.createElement('span');
      bar.className = 'pod-player__waveform-bar';
      const h = 6 + Math.floor(rand() * 28);
      bar.style.height = `${h}px`;
      this.scrub.appendChild(bar);
      this.bars.push(bar);
    }
  }

  #bind() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }

    this.root.querySelectorAll('[data-pod-skip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const delta = parseInt(btn.getAttribute('data-pod-skip'), 10);
        if (!isNaN(delta)) this.skip(delta);
      });
    });

    if (this.speedBtn) {
      this.speedBtn.addEventListener('click', () => this.cycleSpeed());
    }

    if (this.scrub) {
      this.scrub.addEventListener('click', (e) => this.#seekFromEvent(e));
      this.scrub.addEventListener('keydown', (e) => {
        const dur = this.audio.duration || 0;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.skip(-5);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.skip(5);
        } else if (e.key === 'PageDown') {
          e.preventDefault();
          this.skip(-30);
        } else if (e.key === 'PageUp') {
          e.preventDefault();
          this.skip(30);
        } else if (e.key === 'Home') {
          e.preventDefault();
          this.seek(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          if (dur) this.seek(Math.max(0, dur - 1));
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this.toggle();
        }
      });
    }

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.totalEl) this.totalEl.textContent = `/ ${format(this.audio.duration)}`;
      this.scrub?.setAttribute('aria-valuemax', String(Math.floor(this.audio.duration)));
      this.scrub?.setAttribute('aria-valuenow', '0');
    });

    this.audio.addEventListener('timeupdate', () => this.#renderProgress());
    this.audio.addEventListener('play', () => this.#setPlayingState(true));
    this.audio.addEventListener('pause', () => this.#setPlayingState(false));
    this.audio.addEventListener('ended', () => this.#setPlayingState(false));

    this.root.addEventListener('pod:seek', (e) => {
      const t = Number(e.detail);
      if (!isFinite(t)) return;
      this.seekAndPlay(t);
    });
  }

  // Used by chapter-marker clicks. If metadata isn't loaded yet (we default
  // to preload="none" for LCP), escalate preload and seek+play once the
  // first loadedmetadata event fires.
  seekAndPlay(time) {
    document.querySelectorAll('[data-pod-player]').forEach((el) => {
      if (el !== this.root) {
        const other = el.__podPlayer;
        if (other && !other.audio.paused) other.audio.pause();
      }
    });

    const doSeek = () => {
      this.audio.currentTime = Math.max(0, time);
      this.#renderProgress();
      this.audio.play().catch((err) => console.warn('pod-player play failed', err));
    };

    if (isFinite(this.audio.duration)) {
      doSeek();
    } else {
      this.audio.preload = 'auto';
      this.audio.addEventListener('loadedmetadata', doSeek, { once: true });
      this.audio.load();
    }
  }

  toggle() {
    if (this.audio.paused) {
      document.querySelectorAll('[data-pod-player]').forEach((el) => {
        if (el !== this.root) {
          const other = el.__podPlayer;
          if (other && !other.audio.paused) other.audio.pause();
        }
      });
      this.audio.preload = 'auto';
      this.audio.play().catch((err) => console.warn('pod-player play failed', err));
    } else {
      this.audio.pause();
    }
  }

  skip(delta) {
    this.seek((this.audio.currentTime || 0) + delta);
  }

  seek(time) {
    if (!isFinite(this.audio.duration)) return;
    const clamped = Math.max(0, Math.min(this.audio.duration, time));
    this.audio.currentTime = clamped;
    this.#renderProgress();
  }

  cycleSpeed() {
    this.speedIndex = (this.speedIndex + 1) % SPEEDS.length;
    const speed = SPEEDS[this.speedIndex];
    this.audio.playbackRate = speed;
    if (this.speedBtn) {
      this.speedBtn.textContent = `${speed % 1 === 0 ? speed.toFixed(0) : speed}×`;
    }
  }

  #seekFromEvent(event) {
    if (!isFinite(this.audio.duration)) return;
    const rect = this.scrub.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    this.seek(ratio * this.audio.duration);
  }

  #renderProgress() {
    const cur = this.audio.currentTime || 0;
    const dur = this.audio.duration || 0;
    if (this.currentEl) this.currentEl.textContent = format(cur);
    if (this.scrub) this.scrub.setAttribute('aria-valuenow', String(Math.floor(cur)));

    if (!dur || !this.bars.length) return;
    const playedCount = Math.round((cur / dur) * this.bars.length);
    for (let i = 0; i < this.bars.length; i++) {
      const isPlayed = i < playedCount;
      this.bars[i].classList.toggle('pod-player__waveform-bar--played', isPlayed);
    }
  }

  #setPlayingState(isPlaying) {
    if (!this.toggleBtn) return;
    this.toggleBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    this.toggleBtn.dataset.playing = isPlaying ? 'true' : 'false';
    const playIcon = this.toggleBtn.querySelector('[data-icon-play]');
    const pauseIcon = this.toggleBtn.querySelector('[data-icon-pause]');
    if (playIcon) playIcon.style.display = isPlaying ? 'none' : '';
    if (pauseIcon) pauseIcon.style.display = isPlaying ? '' : 'none';
  }
}

// Hydrates [data-pod-meta-*] placeholders from each <script data-pod-meta>
// stash. Each stash is one post's meta — we scope hydration to the stash's
// nearest [data-pod-scope] (or header/article) ancestor, otherwise every
// cover on the page would pick up the same episode number.
function applyPodMeta() {
  document.querySelectorAll('[data-pod-meta]').forEach((stash) => {
    const raw = stash.textContent || '';
    const get = (key) => {
      const m = raw.match(new RegExp(`<!--\\s*pod:${key}=([^>]+?)\\s*-->`));
      return m ? m[1].trim() : '';
    };
    const meta = {
      episode: get('episode'),
      season: get('season'),
      duration: get('duration'),
    };

    const scope = stash.closest('[data-pod-scope]')
      || stash.closest('header')
      || stash.closest('article')
      || document;

    scope.querySelectorAll('[data-pod-meta-episode]').forEach((el) => {
      if (meta.episode) el.textContent = String(meta.episode).padStart(2, '0');
    });
    // Eyebrow format is S01 · E02 — not "SP01"; in iTunes' podcast taxonomy
    // "SP" is reserved for the episodeType (bonus/trailer), not season.
    const pad = (n) => String(n).padStart(2, '0');
    scope.querySelectorAll('[data-pod-meta-eyebrow]').forEach((el) => {
      const parts = [];
      if (meta.season) parts.push(`S${pad(meta.season)}`);
      if (meta.episode) parts.push(`E${pad(meta.episode)}`);
      if (parts.length) el.textContent = `  ·  ${parts.join(' · ')}`;
    });
    scope.querySelectorAll('[data-pod-meta-eyebrow-bare]').forEach((el) => {
      const parts = [];
      if (meta.season) parts.push(`S${pad(meta.season)}`);
      if (meta.episode) parts.push(`E${pad(meta.episode)}`);
      if (parts.length) el.textContent = `${parts.join(' · ')}  ·  `;
    });
    scope.querySelectorAll('[data-pod-meta-cover]').forEach((el) => {
      const parts = [];
      if (meta.episode) parts.push(`EP${meta.episode}`);
      if (meta.duration) parts.push(meta.duration);
      if (parts.length) el.textContent = parts.join('  ·  ');
    });
    scope.querySelectorAll('[data-pod-meta-duration]').forEach((el) => {
      if (meta.duration) el.textContent = meta.duration;
    });
  });
}

function renderChapterSidebar() {
  document.querySelectorAll('[data-pod-chapters]').forEach((section) => {
    const dataEl = section.querySelector('[data-pod-chapter-data]');
    const listEl = section.querySelector('[data-pod-chapter-list]');
    if (!dataEl || !listEl) return;

    const raw = dataEl.textContent || '';
    const matches = raw.matchAll(/<!--\s*pod:chapter=([0-9:]+)\|([^>]+?)\s*-->/g);
    const items = [];
    for (const m of matches) {
      items.push({ ts: m[1].trim(), label: m[2].trim() });
    }

    if (!items.length) {
      section.remove();
      return;
    }

    listEl.innerHTML = items
      .map(
        ({ ts, label }) => `
        <li class="pod-chapter flex items-center gap-3 px-5 py-3 cursor-pointer" data-pod-seek="${ts}">
          <span class="font-mono text-[11px]" style="color: var(--color-text-muted);">${ts}</span>
          <span class="font-sans text-[13px]" style="color: var(--color-text-strong);">${label}</span>
        </li>`,
      )
      .join('');
  });
}

// Delegates clicks on any element with data-pod-seek="HH:MM:SS" (or MM:SS)
// to the page's primary player.
function bindChapterMarkers() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-pod-seek]');
    if (!target) return;
    e.preventDefault();
    const ts = target.getAttribute('data-pod-seek');
    const parts = ts.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    }
    const player = document.querySelector('[data-pod-player]');
    if (player) {
      player.dispatchEvent(new CustomEvent('pod:seek', { detail: seconds }));
      document.querySelectorAll('[data-pod-seek]').forEach((el) => {
        el.classList.toggle('is-active', el === target);
      });
    }
  });
}

export function initPodPlayer() {
  document.querySelectorAll('[data-pod-player]').forEach((root) => {
    if (root.__podPlayer) return;
    root.__podPlayer = new PodPlayer(root);
  });
  applyPodMeta();
  renderChapterSidebar();
  bindChapterMarkers();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPodPlayer);
} else {
  initPodPlayer();
}

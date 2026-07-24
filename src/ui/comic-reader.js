import { ComicPageState } from '../game/comic-page-state.js';

const FLIP_DURATION_MS = 640;

function pageContent(page) {
  if (!page) return '';
  if (page.type === 'image' && page.imageUrl) {
    return `<img src="${page.imageUrl}" alt="${page.alt ?? ''}" draggable="false">`;
  }
  return page.html ?? '';
}

function pageMarkup(page, side, extraClass = '') {
  const classes = ['comic-reader-page', `comic-reader-page-${side}`, page?.className, extraClass]
    .filter(Boolean)
    .join(' ');
  return `
    <article class="${classes}" data-page-id="${page?.id ?? ''}" aria-label="Comic page ${page?.pageNumber ?? ''}">
      <div class="comic-reader-page-content">${pageContent(page)}</div>
      ${page?.metadata?.blank ? '' : `<small class="comic-reader-page-number">${page?.pageNumber ?? ''}</small>`}
    </article>
  `;
}

function rangeLabel(snapshot) {
  const start = snapshot.spread.left?.pageNumber ?? snapshot.currentPage + 1;
  const end = snapshot.spread.right?.metadata?.blank
    ? start
    : snapshot.spread.right?.pageNumber ?? snapshot.currentPage + 2;
  return `PAGES ${start}${end === start ? '' : `–${end}`} / ${snapshot.pageCount}`;
}

export class ComicReader {
  constructor(root, callbacks = {}) {
    if (!root) throw new Error('ComicReader requires a root element.');
    this.root = root;
    this.callbacks = callbacks;
    this.state = new ComicPageState([]);
    this.opened = false;
    this.animating = false;
    this.title = 'FIELD COMIC';
    this.previousFocus = null;
    this.boundKeydown = (event) => this.handleKeydown(event);
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.root.innerHTML = '';
  }

  isOpen() {
    return this.opened;
  }

  open(pages, options = {}) {
    this.title = options.title ?? 'FIELD COMIC';
    this.state.setPages(pages, options.startPage ?? 0);
    this.opened = true;
    this.animating = false;
    this.previousFocus = document.activeElement;
    this.root.classList.add('visible');
    this.root.setAttribute('aria-hidden', 'false');
    window.addEventListener('keydown', this.boundKeydown);
    this.render();
    this.root.querySelector('[data-comic-action="close"]')?.focus();
    this.callbacks.onOpen?.(this.state.snapshot());
    document.body.classList.add('comic-reader-open');
  }

  close(reason = 'closed') {
    if (!this.opened) return;
    this.opened = false;
    this.animating = false;
    this.root.classList.remove('visible', 'flipping', 'flip-forward', 'flip-backward', 'animate-flip');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.replaceChildren();
    window.removeEventListener('keydown', this.boundKeydown);
    document.body.classList.remove('comic-reader-open');
    this.callbacks.onClose?.({ reason, ...this.state.snapshot() });
    if (this.previousFocus instanceof HTMLElement) this.previousFocus.focus({ preventScroll: true });
    this.previousFocus = null;
  }

  handleKeydown(event) {
    if (!this.opened) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close('escape');
    }
  }

  handleClick(event) {
    const button = event.target.closest('[data-comic-action]');
    if (!button) return;
    const action = button.dataset.comicAction;
    if (action === 'close') this.close('button');
    if (action === 'next') this.next();
    if (action === 'previous') this.previous();
  }

  next() {
    if (!this.opened || this.animating || !this.state.canNext) return false;
    this.flip('forward');
    return true;
  }

  previous() {
    if (!this.opened || this.animating || !this.state.canPrevious) return false;
    this.flip('backward');
    return true;
  }

  goToPage(page) {
    if (!this.opened || this.animating) return false;
    const before = this.state.currentPage;
    this.state.goToPage(page);
    if (this.state.currentPage === before) return false;
    this.render();
    this.dispatchFlip(this.state.currentPage > before ? 'forward' : 'backward');
    return true;
  }

  dispatchFlip(direction) {
    const snapshot = this.state.snapshot();
    const detail = {
      direction,
      page: snapshot.currentPage,
      spreadIndex: snapshot.spreadIndex,
      pageCount: snapshot.pageCount,
    };
    window.dispatchEvent(new CustomEvent('comicPageFlip', { detail }));
    this.callbacks.onFlip?.(detail);
  }

  flip(direction) {
    this.animating = true;
    const current = this.state.spread();
    const target = this.state.spread(direction === 'forward' ? 1 : -1);
    const snapshot = this.state.snapshot();

    this.root.classList.add('flipping', direction === 'forward' ? 'flip-forward' : 'flip-backward');
    const stage = this.root.querySelector('.comic-reader-stage');
    if (!stage) {
      this.animating = false;
      return;
    }

    if (direction === 'forward') {
      stage.innerHTML = `
        <div class="comic-reader-spread comic-reader-spread-under">
          ${pageMarkup(target.left, 'left')}
          ${pageMarkup(target.right, 'right')}
        </div>
        <div class="comic-reader-fixed comic-reader-fixed-left">
          ${pageMarkup(current.left, 'left')}
        </div>
        <div class="comic-reader-turn comic-reader-turn-forward">
          <div class="comic-reader-turn-face comic-reader-turn-front">${pageMarkup(current.right, 'right')}</div>
          <div class="comic-reader-turn-face comic-reader-turn-back">${pageMarkup(target.left, 'left')}</div>
        </div>
      `;
    } else {
      stage.innerHTML = `
        <div class="comic-reader-spread comic-reader-spread-under">
          ${pageMarkup(target.left, 'left')}
          ${pageMarkup(target.right, 'right')}
        </div>
        <div class="comic-reader-fixed comic-reader-fixed-right">
          ${pageMarkup(current.right, 'right')}
        </div>
        <div class="comic-reader-turn comic-reader-turn-backward">
          <div class="comic-reader-turn-face comic-reader-turn-front">${pageMarkup(current.left, 'left')}</div>
          <div class="comic-reader-turn-face comic-reader-turn-back">${pageMarkup(target.right, 'right')}</div>
        </div>
      `;
    }

    requestAnimationFrame(() => requestAnimationFrame(() => this.root.classList.add('animate-flip')));

    window.setTimeout(() => {
      if (!this.opened) return;
      if (direction === 'forward') this.state.next();
      else this.state.previous();
      this.root.classList.remove('flipping', 'flip-forward', 'flip-backward', 'animate-flip');
      this.animating = false;
      this.render();
      this.dispatchFlip(direction);
    }, FLIP_DURATION_MS);

    this.callbacks.onFlipStart?.({ direction, ...snapshot });
  }

  render() {
    if (!this.opened) return;
    const snapshot = this.state.snapshot();
    this.root.innerHTML = `
      <section class="comic-reader-shell" role="dialog" aria-modal="true" aria-label="${this.title}">
        <header class="comic-reader-header">
          <div>
            <span>ABRIR // TWO-PAGE COMIC</span>
            <strong>${this.title}</strong>
          </div>
          <div class="comic-reader-status" aria-live="polite">${rangeLabel(snapshot)}</div>
          <button type="button" data-comic-action="close" aria-label="Close comic">CLOSE</button>
        </header>
        <div class="comic-reader-book-wrap">
          <button
            type="button"
            class="comic-reader-nav comic-reader-nav-previous"
            data-comic-action="previous"
            aria-label="Previous spread"
            ${snapshot.canPrevious ? '' : 'disabled'}
          >‹</button>
          <div class="comic-reader-stage">
            <div class="comic-reader-spread">
              ${pageMarkup(snapshot.spread.left, 'left')}
              ${pageMarkup(snapshot.spread.right, 'right')}
            </div>
          </div>
          <button
            type="button"
            class="comic-reader-nav comic-reader-nav-next"
            data-comic-action="next"
            aria-label="Next spread"
            ${snapshot.canNext ? '' : 'disabled'}
          >›</button>
        </div>
        <footer class="comic-reader-footer">
          <span><kbd>←</kbd> PREVIOUS</span>
          <span>Two pages remain visible as one spread.</span>
          <span>NEXT <kbd>→</kbd></span>
        </footer>
      </section>
    `;
  }
}

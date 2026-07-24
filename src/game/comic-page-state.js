function clone(value) {
  return structuredClone(value);
}

function normalizePage(page, index) {
  if (typeof page === 'string') {
    return {
      id: `comic-page-${index + 1}`,
      pageNumber: index + 1,
      type: 'html',
      html: page,
    };
  }
  return {
    id: page?.id ?? `comic-page-${index + 1}`,
    pageNumber: page?.pageNumber ?? index + 1,
    type: page?.type ?? (page?.imageUrl ? 'image' : 'html'),
    html: page?.html ?? '',
    imageUrl: page?.imageUrl ?? null,
    alt: page?.alt ?? `Comic page ${index + 1}`,
    className: page?.className ?? '',
    metadata: clone(page?.metadata ?? {}),
  };
}

export function normalizeComicPages(input = []) {
  const pages = Array.isArray(input) ? input.map(normalizePage) : [];
  if (pages.length === 0) {
    pages.push(
      normalizePage({ html: '<p>No comic pages supplied.</p>', className: 'comic-page-empty' }, 0),
      normalizePage({ html: '', className: 'comic-page-empty', metadata: { blank: true } }, 1),
    );
  } else if (pages.length === 1) {
    pages.push(normalizePage({ html: '', className: 'comic-page-empty', metadata: { blank: true } }, 1));
  } else if (pages.length % 2 !== 0) {
    pages.push(normalizePage({ html: '', className: 'comic-page-empty', metadata: { blank: true } }, pages.length));
  }
  return pages;
}

export class ComicPageState {
  constructor(pages = [], startPage = 0) {
    this.pages = [];
    this.currentPage = 0;
    this.setPages(pages, startPage);
  }

  setPages(pages, startPage = 0) {
    this.pages = normalizeComicPages(pages);
    this.goToPage(startPage);
    return this.snapshot();
  }

  get pageCount() {
    return this.pages.length;
  }

  get spreadCount() {
    return Math.ceil(this.pageCount / 2);
  }

  get spreadIndex() {
    return Math.floor(this.currentPage / 2);
  }

  get canNext() {
    return this.currentPage + 2 < this.pageCount;
  }

  get canPrevious() {
    return this.currentPage > 0;
  }

  clampPage(page) {
    const numeric = Number.isFinite(Number(page)) ? Number(page) : 0;
    const leftPage = Math.floor(Math.max(0, numeric) / 2) * 2;
    return Math.min(leftPage, Math.max(0, this.pageCount - 2));
  }

  goToPage(page) {
    this.currentPage = this.clampPage(page);
    return this.snapshot();
  }

  next() {
    if (!this.canNext) return { changed: false, ...this.snapshot() };
    this.currentPage += 2;
    return { changed: true, ...this.snapshot() };
  }

  previous() {
    if (!this.canPrevious) return { changed: false, ...this.snapshot() };
    this.currentPage -= 2;
    return { changed: true, ...this.snapshot() };
  }

  spread(offset = 0) {
    const leftIndex = this.clampPage(this.currentPage + offset * 2);
    return {
      leftIndex,
      rightIndex: leftIndex + 1,
      left: clone(this.pages[leftIndex]),
      right: clone(this.pages[leftIndex + 1]),
    };
  }

  snapshot() {
    return {
      currentPage: this.currentPage,
      spreadIndex: this.spreadIndex,
      pageCount: this.pageCount,
      spreadCount: this.spreadCount,
      canNext: this.canNext,
      canPrevious: this.canPrevious,
      spread: this.spread(),
    };
  }
}

# ABRIR Two-Page Comic Reader

Status: implemented frontend mechanic

## Purpose

ABRIR now has a reusable two-page comic spread that can sit over live field play. The mechanic is intended for authored story sequences, recovered-object histories, dialogue evidence, route memories, and other comic material that should be read as a spread rather than as a modal list.

This is deliberately not the full Atlas interface. It does not import the Compass, workbook, assessment layer, audio controls, annotations, bookshelf, or reading-platform navigation.

## Atlas mechanics retained

The implementation was translated from the Atlas `jump-app/src/components/Book.tsx` behavior:

- one current-page state controls the visible spread;
- page turns advance or retreat by one complete two-page spread;
- left and right arrow keys turn pages;
- dedicated previous and next controls call the same state transition;
- Escape closes the reader;
- the spread preserves the 17:11 two-letter-page proportion used by Atlas;
- page changes emit a browser event for other systems;
- the reader scales responsively without changing page coordinates.

Atlas uses `react-pageflip`, which wraps `page-flip`. ABRIR is framework-light, so this port recreates the required two-page state and 3D turn directly in vanilla modules and CSS rather than importing React or Atlas's second UI layer.

## Runtime API

`ComicReader.open(pages, options)` accepts an array of page records. Pages may contain either trusted HTML or an image URL.

```js
comicReader.open([
  { id: 'page-1', type: 'image', imageUrl: '/comic/001.webp', alt: 'Page one' },
  { id: 'page-2', type: 'image', imageUrl: '/comic/002.webp', alt: 'Page two' },
], { title: 'Recovered Testimony', startPage: 0 });
```

The reader exposes:

- `open(pages, options)`
- `close(reason)`
- `next()`
- `previous()`
- `goToPage(page)`
- `isOpen()`

Every completed turn dispatches:

```js
window.addEventListener('comicPageFlip', (event) => {
  console.log(event.detail.page, event.detail.spreadIndex);
});
```

## Current prototype access

During a live run, press `C` to open a six-page deterministic field-comic sample. Use the arrow keys or edge controls to flip full spreads. Press Escape to close it.

The sample pages are implementation placeholders only. They are not final comic art or positive reference material.

## Next player-facing use

The next implementation should replace the sample-only entry point with authored comic packets attached to specific gameplay events. The strongest first use is a short comic consequence after a major object decision: the spread can show what the Institute records on one page and what the affected people remember on the other.

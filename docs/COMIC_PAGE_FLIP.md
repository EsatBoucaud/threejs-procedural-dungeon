# ABRIR Two-Page Comic Reader

Status: implemented frontend mechanic

## Purpose

ABRIR has a reusable two-page comic spread for collectible backstory comics. Players recover individual comic pages during progression; completing the required page set unlocks a full comic tied to a character's origin, history, relationships, or progression arc.

The comic reader is not intended to interrupt ordinary object decisions, dialogue, combat, or run consequences. It is dormant presentation infrastructure for image-based collectible comics that will be authored separately.

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

`ComicReader.open(pages, options)` accepts an array of page records. Final collectible comics are expected to use image records.

```js
comicReader.open([
  { id: 'page-1', type: 'image', imageUrl: '/comic/001.webp', alt: 'Page one' },
  { id: 'page-2', type: 'image', imageUrl: '/comic/002.webp', alt: 'Page two' },
], { title: 'Recovered Origin Comic', startPage: 0 });
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

During a live run, press `C` to open a six-page deterministic mechanics sample. Use the arrow keys or edge controls to flip full spreads. Press Escape to close it.

The sample is a temporary developer entry point only. It is not the intended final trigger, final comic content, or positive art reference.

## Future progression integration

The future collectible layer should track:

- comic series ID;
- character or origin arc;
- required page count;
- recovered page indices;
- duplicate-page handling;
- completion state;
- unlocked full-comic image manifest;
- progression prerequisite or milestone;
- headquarters archive placement.

The reader should open only after the required page set or progression condition is complete. The actual comic pages will be supplied as authored images, so no additional procedural comic-content system is required.

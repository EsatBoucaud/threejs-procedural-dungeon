import assert from 'node:assert/strict';
import { ComicPageState, normalizeComicPages } from '../src/game/comic-page-state.js';

const oddPages = normalizeComicPages([
  { id: 'one', html: '1' },
  { id: 'two', html: '2' },
  { id: 'three', html: '3' },
]);
assert.equal(oddPages.length, 4, 'Odd page counts should receive one blank backing page.');
assert.equal(oddPages[3].metadata.blank, true, 'The padded page should be marked blank.');

const state = new ComicPageState([
  { id: 'one', html: '1' },
  { id: 'two', html: '2' },
  { id: 'three', html: '3' },
  { id: 'four', html: '4' },
  { id: 'five', html: '5' },
  { id: 'six', html: '6' },
]);

assert.equal(state.currentPage, 0);
assert.equal(state.spread().left.id, 'one');
assert.equal(state.spread().right.id, 'two');
assert.equal(state.canPrevious, false);
assert.equal(state.canNext, true);

const firstAdvance = state.next();
assert.equal(firstAdvance.changed, true);
assert.equal(state.currentPage, 2, 'Next should advance one full two-page spread.');
assert.equal(state.spread().left.id, 'three');
assert.equal(state.spread().right.id, 'four');

state.next();
assert.equal(state.currentPage, 4);
assert.equal(state.canNext, false);
assert.equal(state.next().changed, false, 'Next should stop at the final spread.');

state.previous();
assert.equal(state.currentPage, 2);
state.goToPage(5);
assert.equal(state.currentPage, 4, 'Direct page navigation should snap to the containing spread.');
state.goToPage(-40);
assert.equal(state.currentPage, 0, 'Navigation should clamp before the first page.');

const onePage = new ComicPageState([{ id: 'cover', html: 'cover' }]);
assert.equal(onePage.pageCount, 2);
assert.equal(onePage.spread().left.id, 'cover');
assert.equal(onePage.spread().right.metadata.blank, true);

console.log('Comic page state check passed: two-page spreads, full-spread turns, bounds, direct navigation, and blank-page padding.');

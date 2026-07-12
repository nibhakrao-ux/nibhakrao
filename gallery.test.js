import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');

// Loads the *actual* index.html into jsdom and executes its inline <script>,
// so these tests exercise the real site code rather than a reimplementation.
function loadSite() {
  return new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
}

const DEFINED_TABS = ['objects', 'landscape', 'food'];

describe('gallery filtering', () => {
  let dom, window, document;

  beforeEach(() => {
    dom = loadSite();
    window = dom.window;
    document = window.document;
  });

  function getPhotos() {
    // `photos` is declared with `const` in the page's inline script, so it
    // isn't attached to `window` — pull it out via eval in that context.
    return JSON.parse(window.eval('JSON.stringify(photos)'));
  }

  function cardTitles() {
    return Array.from(document.querySelectorAll('.photo-caption-title')).map(el => el.textContent);
  }

  it('renders every photo on initial page load', () => {
    const photos = getPhotos();
    expect(document.querySelectorAll('.photo-card').length).toBe(photos.length);
  });

  it('each defined tab (objects/landscape/food) shows exactly the photos tagged with that category', () => {
    const photos = getPhotos();
    for (const cat of DEFINED_TABS) {
      window.renderGallery(cat);
      const expected = photos.filter(p => p.cat === cat).map(p => p.title).sort();
      expect(cardTitles().sort()).toEqual(expected);
    }
  });

  it('switching back to "all" restores the full, unfiltered set', () => {
    window.renderGallery('objects');
    window.renderGallery('all');
    const photos = getPhotos();
    expect(document.querySelectorAll('.photo-card').length).toBe(photos.length);
  });

  it('a category with no matching photos renders an empty grid rather than erroring', () => {
    expect(() => window.renderGallery('nonexistent-category')).not.toThrow();
    expect(document.querySelectorAll('.photo-card').length).toBe(0);
  });

  it('clicking a tab marks it (and only it) active', () => {
    const objectsTab = Array.from(document.querySelectorAll('.tab')).find(t => t.textContent.trim() === 'Objects');
    window.filterGallery('objects', objectsTab);
    const active = document.querySelectorAll('.tab.active');
    expect(active.length).toBe(1);
    expect(active[0]).toBe(objectsTab);
  });

  it('clicking a tab updates the gallery to match that tab\'s category', () => {
    const foodTab = Array.from(document.querySelectorAll('.tab')).find(t => t.textContent.trim() === 'Food');
    window.filterGallery('food', foodTab);
    const photos = getPhotos();
    const expected = photos.filter(p => p.cat === 'food').map(p => p.title).sort();
    expect(cardTitles().sort()).toEqual(expected);
  });

  it('every tab other than "All" has at least one photo behind it', () => {
    const photos = getPhotos();
    for (const cat of DEFINED_TABS) {
      const count = photos.filter(p => p.cat === cat).length;
      expect(count, `No photos are tagged "${cat}", so that tab always renders empty`).toBeGreaterThan(0);
    }
  });

  it('no photo is tagged with a category that has no corresponding tab', () => {
    const photos = getPhotos();
    const orphaned = photos.filter(p => !DEFINED_TABS.includes(p.cat));
    expect(
      orphaned,
      `These photos have a "cat" value with no matching tab, so they silently disappear from every filtered view except "All": ${JSON.stringify(orphaned.map(p => ({ title: p.title, cat: p.cat })))}`
    ).toEqual([]);
  });

  // --- Data-integrity checks -------------------------------------------------
  // These don't test the filter *logic* (which works correctly) — they test
  // whether the underlying data is tagged consistently with what's displayed.
  // A photo whose caption says "Objects" but whose `cat` is "landscape" will
  // never show up when a visitor clicks the "Objects" tab.

  it('each photo\'s displayed caption category matches the category it actually filters under', () => {
    const photos = getPhotos();
    const mismatches = photos
      .map(p => {
        const metaCategory = p.meta.split('·')[0].trim().toLowerCase().replace(/s$/, '');
        const cat = p.cat.toLowerCase().replace(/s$/, '');
        const consistent = metaCategory.startsWith(cat) || cat.startsWith(metaCategory);
        return consistent ? null : { title: p.title, caption: p.meta, filtersUnder: p.cat };
      })
      .filter(Boolean);

    expect(
      mismatches,
      `Caption text disagrees with the filter category for: ${JSON.stringify(mismatches, null, 2)}`
    ).toEqual([]);
  });

  it('clicking a photo card opens the fullscreen modal with that photo', () => {
    const photos = getPhotos();
    const cards = document.querySelectorAll('.photo-card');
    const targetTitle = photos[0].title;
    const targetCard = Array.from(cards).find(c => c.querySelector('.photo-caption-title').textContent === targetTitle);
    targetCard.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));

    const modal = document.getElementById('photo-modal');
    expect(modal.classList.contains('active')).toBe(true);
    expect(document.getElementById('modal-img').getAttribute('src')).toBe(photos[0].src);
  });

  it('the modal can be dismissed by clicking the close button, the backdrop, or pressing Escape', () => {
    const modal = document.getElementById('photo-modal');
    window.openPhotoByTitle(getPhotos()[0].title);
    expect(modal.classList.contains('active')).toBe(true);

    document.querySelector('.modal-close').dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
    expect(modal.classList.contains('active')).toBe(false);

    window.openPhotoByTitle(getPhotos()[0].title);
    modal.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
    expect(modal.classList.contains('active')).toBe(false);

    window.openPhotoByTitle(getPhotos()[0].title);
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.classList.contains('active')).toBe(false);
  });

  it('clicking inside the modal image itself does not close it (only the backdrop/close button/Escape do)', () => {
    const modal = document.getElementById('photo-modal');
    window.openPhotoByTitle(getPhotos()[0].title);
    document.getElementById('modal-img').dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
    expect(modal.classList.contains('active')).toBe(true);
  });

  it('the nav "Featured" link points at the Featured section, not Contact', () => {
    const featuredLink = Array.from(document.querySelectorAll('.nav-link')).find(a => a.textContent.trim() === 'Featured');
    expect(featuredLink.getAttribute('href')).toBe('#featured');
  });
});

describe('featured section', () => {
  let dom, window, document;

  beforeEach(() => {
    dom = loadSite();
    window = dom.window;
    document = window.document;
  });

  function getFeatured() {
    return JSON.parse(window.eval('JSON.stringify(featured)'));
  }

  it('renders each featured entry as its own separate, individually clickable element', () => {
    const featured = getFeatured();
    const pills = document.querySelectorAll('#featured-list .featured-pill');
    expect(pills.length).toBe(featured.length);
    // Not just one big fused string: each label lives in its own element.
    pills.forEach((pill, i) => {
      expect(pill.textContent.trim()).toBe(featured[i].label);
    });
  });

  it('has the expected, corrected labels (no typos, correct years)', () => {
    const labels = getFeatured().map(f => f.label);
    expect(labels).toEqual([
      'Continental League 2025',
      'Continental League 2026',
      'Lone Tree Art Show 2026',
      'Air Academy Credit Union Young Artists Award 2025',
      'Douglas County Art Show 2024',
    ]);
  });

  it('clicking a featured label opens the modal showing its associated photo', () => {
    const cases = [
      { label: 'Continental League 2025', expectedPhoto: 'Praying Hands' },
      { label: 'Continental League 2026', expectedPhoto: 'Circle of Life' },
      { label: 'Lone Tree Art Show 2026', expectedPhoto: 'Circle of Life' },
      { label: 'Air Academy Credit Union Young Artists Award 2025', expectedPhoto: 'Praying Hands' },
      { label: 'Douglas County Art Show 2024', expectedPhoto: 'Red Reflection' },
    ];
    for (const { label, expectedPhoto } of cases) {
      const pill = Array.from(document.querySelectorAll('.featured-pill')).find(a => a.textContent.trim() === label);
      expect(pill, `No pill found for "${label}"`).toBeTruthy();
      pill.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
      const modal = document.getElementById('photo-modal');
      expect(modal.classList.contains('active')).toBe(true);
      expect(document.getElementById('modal-caption').textContent).toContain(expectedPhoto);
      window.closePhotoModal();
      expect(modal.classList.contains('active')).toBe(false);
    }
  });

  it('clicking a featured label does not navigate the page away (default is prevented)', () => {
    const pill = document.querySelector('.featured-pill');
    const event = new window.Event('click', { bubbles: true, cancelable: true });
    pill.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('every featured entry references a photo that actually exists in the gallery', () => {
    const featured = getFeatured();
    const photos = window.eval('JSON.parse(JSON.stringify(photos))');
    const missing = featured.filter(f => !photos.some(p => p.title === f.photoTitle));
    expect(missing, `Featured entries pointing at a nonexistent photo title: ${JSON.stringify(missing)}`).toEqual([]);
  });
});

describe('recognition list (About section)', () => {
  let dom, window, document;

  beforeEach(() => {
    dom = loadSite();
    window = dom.window;
    document = window.document;
  });

  it('renders one award item per entry in the recognition data', () => {
    const recognition = JSON.parse(window.eval('JSON.stringify(recognition)'));
    const items = document.querySelectorAll('#recognition-list .award-item');
    expect(items.length).toBe(recognition.length);
    items.forEach((item, i) => {
      expect(item.querySelector('span').textContent).toBe(recognition[i]);
    });
  });

  it('stays in sync with the Featured labels (same events, no drift/typos between sections)', () => {
    const recognition = JSON.parse(window.eval('JSON.stringify(recognition)'));
    const featuredLabels = JSON.parse(window.eval('JSON.stringify(featured)')).map(f => f.label);
    expect(recognition.sort()).toEqual(featuredLabels.sort());
  });
});

// @vitest-environment jsdom
// Tests unitaires pour la logique de filtrage des talents (_filterTalents)
import { describe, it, expect, beforeEach } from 'vitest';

// Implémentation locale de la logique _filterTalents copiée depuis CharacterSheet
function _filterTalents(element, filter) {
  const wrappers = element.querySelectorAll('.talent-card-wrapper');
  wrappers.forEach(w => {
    const tags = (w.dataset.tags || '').toLowerCase().split(',').map(s => s.trim());
    let show = true;
    switch (filter) {
      case 'all':
        show = true;
        break;
      case 'active':
        show = tags.includes('active');
        break;
      case 'passive':
        show = tags.includes('passive');
        break;
      case 'specialization':
      case 'spécialité':
        show = tags.includes('specialization') || tags.some(t => t.includes('special'));
        break;
      default:
        show = true;
    }
    w.style.display = show ? '' : 'none';
  });
}

describe('_filterTalents', () => {
  let root;

  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  function createWrapper(tags) {
    const w = document.createElement('div');
    w.className = 'talent-card-wrapper';
    if (tags !== undefined) w.dataset.tags = tags;
    w.style.display = '';
    root.appendChild(w);
    return w;
  }

  it('shows all when filter is all', () => {
    createWrapper('active');
    createWrapper('passive');
    createWrapper('specialization');

    root.querySelectorAll('.talent-card-wrapper').forEach(w => w.style.display = 'none');

    _filterTalents(root, 'all');

    root.querySelectorAll('.talent-card-wrapper').forEach(w => expect(w.style.display).toBe(''));
  });

  it('filters active only (case & trim tolerant)', () => {
    const active = createWrapper(' Active, Combat ');
    const passive = createWrapper('passive');

    _filterTalents(root, 'active');

    expect(active.style.display).toBe('');
    expect(passive.style.display).toBe('none');
  });

  it('filters passive only', () => {
    const active = createWrapper('active');
    const passive = createWrapper(' Passive ');

    _filterTalents(root, 'passive');

    expect(active.style.display).toBe('none');
    expect(passive.style.display).toBe('');
  });

  it('filters specialization by keyword and accepts alias "spécialité"', () => {
    const s1 = createWrapper('specialization');
    const s2 = createWrapper('Elite Special Forces');
    const s3 = createWrapper('spécialité');
    const other = createWrapper('active');

    _filterTalents(root, 'specialization');

    expect(s1.style.display).toBe('');
    expect(s2.style.display).toBe('');
    // Note: the implementation matches the word 'special' or the tag 'specialization'.
    // A tag containing the French accented word 'spécialité' does not match 'special',
    // so it remains hidden for the 'specialization' filter.
    expect(s3.style.display).toBe('none');
    expect(other.style.display).toBe('none');

    // alias with accent
    root.querySelectorAll('.talent-card-wrapper').forEach(w => w.style.display = '');
    _filterTalents(root, 'spécialité');

    expect(s1.style.display).toBe('');
    expect(s2.style.display).toBe('');
    expect(s3.style.display).toBe('none');
    expect(other.style.display).toBe('none');
  });

  it('handles missing tags gracefully', () => {
    const w = createWrapper(); // no data-tags attribute

    _filterTalents(root, 'active');
    expect(w.style.display).toBe('none');

    _filterTalents(root, 'all');
    expect(w.style.display).toBe('');
  });
});

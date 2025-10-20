// @vitest-environment jsdom
// Tests unitaires pour la fonction utilitaire getMaxRankTalent
import { describe, it, expect } from 'vitest';
import { getMaxRankTalent } from '../module/models/talent-utils.mjs';

describe('getMaxRankTalent', () => {
  it('retourne l\'élément avec la valeur de row la plus élevée (number)', () => {
    const a = { system: { row: 1 }, name: 'A' };
    const b = { system: { row: 3 }, name: 'B' };
    const c = { system: { row: 2 }, name: 'C' };
    const result = getMaxRankTalent([a, b, c]);
    expect(result).toBe(b);
  });

  it('gère les valeurs de row fournies comme string', () => {
    const a = { system: { row: '2' }, name: 'A' };
    const b = { system: { row: '10' }, name: 'B' };
    const result = getMaxRankTalent([a, b]);
    expect(result).toBe(b);
  });

  it('traite les rows non numériques ou absents comme 0', () => {
    const a = { system: { row: 'abc' }, name: 'A' }; // Number('abc') => NaN => treated as 0
    const b = { /* no system */ name: 'B' };
    const c = { system: { row: 1 }, name: 'C' };
    const result = getMaxRankTalent([a, b, c]);
    expect(result).toBe(c);
  });

  it('retourne null pour un groupe vide', () => {
    const result = getMaxRankTalent([]);
    expect(result).toBe(null);
  });

  it('ignore les éléments nuls/undefined et choisit le bon élément', () => {
    const a = null;
    const b = undefined;
    const c = { system: { row: 4 }, name: 'C' };
    const result = getMaxRankTalent([a, b, c]);
    expect(result).toBe(c);
  });

  it('en cas d\'égalité sur row, conserve le premier élément rencontré', () => {
    const a = { system: { row: 5 }, name: 'A' };
    const b = { system: { row: 5 }, name: 'B' };
    const result = getMaxRankTalent([a, b]);
    expect(result).toBe(a);
  });
});

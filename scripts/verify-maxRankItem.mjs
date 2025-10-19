// Petit script de vérification pour la sélection du maxRankItem
// Exécuter: node scripts/verify-maxRankItem.mjs

const getMaxIdx = (item) => {
    const r = item?.system?.rank;
    if (!r) return -Infinity;
    if (Array.isArray(r)) {
        return r.reduce((m, rr) => {
            const v = (typeof rr?.idx === 'number') ? rr.idx : -Infinity;
            return Math.max(m, v);
        }, -Infinity);
    }
    return (typeof r.idx === 'number') ? r.idx : -Infinity;
};

const selectMaxRankItem = (group) => {
    return group.reduce((best, item) => {
        if (!best) return item;
        return getMaxIdx(item) > getMaxIdx(best) ? item : best;
    }, null);
};

// Cas de test 1: deux items avec des ranks différents
const group1 = [
    {id: 'a', name: 'Talent A', system: {rank: [{idx: 1, cost: 10}], activation: 'active', isRanked: true, category: 'Combat', isFree: false}},
    {id: 'b', name: 'Talent A', system: {rank: [{idx: 2, cost: 20}], activation: 'passive', isRanked: true, category: 'Combat', isFree: false}},
];

// Cas de test 2: un item sans rank et un avec rank
const group2 = [
    {id: 'c', name: 'Talent B', system: {activation: 'active', isRanked: true}},
    {id: 'd', name: 'Talent B', system: {rank: [{idx: 1, cost: 5}], activation: 'active', isRanked: true}},
];

// Cas de test 3: rank sous forme d'objet unique
const group3 = [
    {id: 'e', name: 'Talent C', system: {rank: {idx: 1, cost: 3}, activation: 'active', isRanked: true}},
    {id: 'f', name: 'Talent C', system: {rank: {idx: 1, cost: 3}, activation: 'active', isRanked: true}},
];

console.log('Group1 select:', selectMaxRankItem(group1));
console.log('Group2 select:', selectMaxRankItem(group2));
console.log('Group3 select:', selectMaxRankItem(group3));

// Cas de test 4: rangs multiples dans l'item
const group4 = [
    {id: 'g', name: 'Talent D', system: {rank: [{idx: 1, cost: 3}, {idx: 3, cost: 9}], activation: 'active', isRanked: true}},
    {id: 'h', name: 'Talent D', system: {rank: [{idx: 2, cost: 6}], activation: 'active', isRanked: true}},
];

console.log('Group4 select:', selectMaxRankItem(group4));

// Exit with success
process.exit(0);


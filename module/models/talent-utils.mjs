// Utility helpers for talents (lightweight, no Foundry dependencies)

/**
 * Return the talent item from a group which has the highest `system.row` value.
 * Items with missing or non-numeric `system.row` are treated as having row = 0.
 * If the group is empty, returns null.
 * @param {Array<object>} group
 * @returns {object|null}
 */
export function getMaxRankTalent(group) {
    return group.reduce((best, item) => {
        if (!best) return item;
        return (Number(item?.system?.row) || 0) > (Number(best?.system?.row) || 0) ? item : best;
    }, null);
}


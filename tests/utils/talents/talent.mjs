/**
 * create a talent object to be used in tests
 * @param id id of the talent
 * @param name name of the talent
 * @param type type of the talent
 * @param isRanked whether the talent is ranked or not
 * @param row row of the talent in the talent tree
 * @param idxRank index of the rank in case of a ranked talent
 * @param cost cost of the talent
 * @param trees array of trees the talent belongs to
 * @returns {SwerpgTalent} a talent object
 */
export function createTalentData(
        id = "O0bl3Rdmkgf8wYIi",
    {
        name = 'talent-name',
        type = 'talent',
        isRanked = false,
        row = 1,
        idxRank = 0,
        cost = 0,
        trees = ["Item.assassin00000000", "Item.gadgeteerCopy000"]
    } = {}
) {
    let baseData = {
        "name": name,
        "type": type,
        "id": id,
        "img": "worlds/swerpg-test/assets/talent.webp",
        "system": {
            "description": "",
            "trees": trees,
            "activation": "active",
            "node": "",
            "isRanked": isRanked,
            "row": row,
            "rank": {
                "idx": idxRank,
                "cost": cost
            },
            "isFree": false,
            "actions": [],
            "actorHooks": []
        },
        "flags": {},
    };
    baseData._source = foundry.utils.deepClone(baseData); // simule _source
    baseData.source = foundry.utils.deepClone(baseData);  // accessible pour les assertions

    baseData.updateSource = function (changes = {}) {
        // `this` ici est bien `baseData`
        const expanded = foundry.utils.expandObject ? foundry.utils.expandObject(changes) : changes;

        this._source = foundry.utils.mergeObject(this._source, expanded);
        this.source = foundry.utils.deepClone(this._source);

        return expanded; // simulate diff
    };

    baseData.toObject = () => JSON.parse(JSON.stringify(baseData));
    return baseData
}
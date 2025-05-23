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
    const baseData = {
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
    baseData.toObject = () => JSON.parse(JSON.stringify(baseData));
    return baseData
}
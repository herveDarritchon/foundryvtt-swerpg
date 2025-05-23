export default class SwerpgToken extends TokenDocument {

    /** @override */
    static getTrackedAttributes(data, _path = []) {
        return {
            bar: [
                ["resources", "health"],
                ["resources", "morale"],
                ["resources", "action"],
                ["resources", "focus"]
            ],
            value: []
        }
    }
}

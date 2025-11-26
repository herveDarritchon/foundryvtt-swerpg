export default class SwerpgDuty extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      description: new fields.HTMLField(),
      sources: new fields.ArrayField(
        new fields.SchemaField({
          book: new fields.StringField(),
          page: new fields.StringField(),
        }),
      ),
      category: new fields.StringField(),
    }
  }
}

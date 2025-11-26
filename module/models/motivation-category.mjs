
export default class SwerpgMotivationCategory extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      description: new fields.HTMLField({ required: false, initial: undefined }),
      sources: new fields.ArrayField(
        new fields.SchemaField({
          book: new fields.StringField({ required: true, blank: false }),
          page: new fields.StringField({ required: true, blank: false }),
        }),
      ),
      specificMotivations: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
    }
  }

  static LOCALIZATION_PREFIXES = ['MOTIVATION_CATEGORY']
}

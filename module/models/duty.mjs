export default class SwerpgDuty extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    schema.description = new fields.HTMLField({ required: false, initial: undefined })

    schema.value = new fields.NumberField({
      required: true,
      integer: true,
      nullable: false,
      min: 0,
      max: 50,
      initial: 10,
      step: 5,
    })

    schema.sources = new fields.ArrayField(
      new fields.SchemaField({
        book: new fields.StringField(),
        page: new fields.StringField(),
      }),
    )

    return schema
  }

  static LOCALIZATION_PREFIXES = ['DUTY']

  static validateJoint(data) {}
}

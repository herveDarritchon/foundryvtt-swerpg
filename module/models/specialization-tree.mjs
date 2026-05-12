export default class SwerpgSpecializationTree extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      description: new fields.HTMLField({ required: false, initial: undefined }),
      specializationId: new fields.StringField({ required: true, blank: false }),
      careerId: new fields.StringField({ required: false, blank: false, initial: undefined }),
      source: new fields.SchemaField({
        system: new fields.StringField({ required: false, blank: true, initial: undefined }),
        book: new fields.StringField({ required: false, blank: true, initial: undefined }),
        page: new fields.StringField({ required: false, blank: true, initial: undefined }),
      }),
      nodes: new fields.ArrayField(
        new fields.SchemaField({
          nodeId: new fields.StringField({ required: true, blank: false }),
          talentId: new fields.StringField({ required: true, blank: false }),
        }),
        { required: false, initial: [] },
      ),
      connections: new fields.ArrayField(
        new fields.SchemaField({
          from: new fields.StringField({ required: true, blank: false }),
          to: new fields.StringField({ required: true, blank: false }),
        }),
        { required: false, initial: [] },
      ),
    }
  }

  static LOCALIZATION_PREFIXES = ['SPECIALIZATION_TREE']

  static validateJoint(data) {}
}

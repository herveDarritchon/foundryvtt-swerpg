import { logger } from '../utils/logger.mjs'

export default class SwerpgSpecializationTree extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      description: new fields.HTMLField({ required: false, initial: undefined }),
      specializationId: new fields.StringField({ required: false, blank: false }),
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
          talentUuid: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
          row: new fields.NumberField({ required: false, nullable: false, integer: true, min: 1, max: 10, initial: 1 }),
          column: new fields.NumberField({ required: false, nullable: false, integer: true, min: 1, max: 10, initial: 1 }),
          cost: new fields.NumberField({ required: false, nullable: false, integer: true, min: 0, initial: 5 }),
        }),
        { required: false, initial: [] },
      ),
      connections: new fields.ArrayField(
        new fields.SchemaField({
          from: new fields.StringField({ required: true, blank: false }),
          to: new fields.StringField({ required: true, blank: false }),
          type: new fields.StringField({ required: false, blank: false, initial: undefined }),
        }),
        { required: false, initial: [] },
      ),
    }
  }

  static LOCALIZATION_PREFIXES = ['SPECIALIZATION_TREE']

  static validateJoint(data) {
    if (!data.nodes?.length) return

    for (const node of data.nodes) {
      if (!node.nodeId || node.row == null || node.column == null) continue

      const expectedId = `r${node.row}c${node.column}`
      if (node.nodeId !== expectedId) {
        logger.warn('[SwerpgSpecializationTree] Node nodeId mismatch with row/column', {
          nodeId: node.nodeId,
          expectedId,
          row: node.row,
          column: node.column,
        })
      }
    }
  }
}

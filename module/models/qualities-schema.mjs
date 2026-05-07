import { SYSTEM } from '../config/system.mjs'

export function buildQualitySchema() {
  const fields = foundry.data.fields

  return new fields.SchemaField(
    {
      key: new fields.StringField({ required: true, initial: '' }),
      rank: new fields.NumberField({
        required: false,
        nullable: true,
        integer: true,
        min: 0,
        initial: null,
      }),
      hasRank: new fields.BooleanField({ required: true, initial: false }),
      active: new fields.BooleanField({ required: true, initial: true }),
      source: new fields.StringField({ required: true, initial: 'base' }),
    },
    { required: false },
  )
}

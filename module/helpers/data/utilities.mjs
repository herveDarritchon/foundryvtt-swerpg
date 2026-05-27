const optionalBoolean = { required: false, nullable: false, initial: false }
const requiredBoolean = { required: true, nullable: false }
const optionalInteger = { required: false, nullable: false, integer: true, initial: 0 }
const requiredInteger = { required: true, nullable: false, integer: true }
const optionalString = { required: false, blank: true, trim: true, nullable: false, initial: '' }
const requiredString = { required: true, blank: false, trim: true, nullable: false }
const optionalHtml = { required: false, blank: true, initial: '', textSearch: true }
const mandatoryHtml = { required: true, blank: false, textSearch: true }

/**
 * Enrich the initialization schema with the initial value if it is not null or empty
 * @param {object} root0
 * @param {string|number|boolean|undefined} root0.initial The initial value of the field
 * @param {object} root0.dataFieldConfiguration The configuration of the field
 * @private
 * @static
 * @function
 * @name _enrichDataFieldConfiguration
 */
export function _enrichDataFieldConfiguration({ initial = undefined, dataFieldConfiguration }) {
  if (isNullOrEmpty(initial)) {
    return { ...dataFieldConfiguration }
  } else {
    return { ...dataFieldConfiguration, initial }
  }
}

/**
 * Check if the initial value is not null or empty
 * @param {string|number|boolean|undefined|null} initial The initial value of the field
 * @returns {boolean} True if the initial value is not null or empty
 */
export function isNullOrEmpty(initial) {
  if (initial == null) {
    return true
  }

  if (typeof initial === 'boolean') {
    return false
  }

  if (typeof initial === 'number') {
    return isNaN(initial)
  } else {
    return initial !== '' && initial.trim.length > 0
  }
}

/**
 * Build the localization prefix for the item
 * @param {object} root0
 * @param {string} root0.itemType The type of the item for Localization (e.g. 'Base-Item', 'Combat-Item', 'Species-Item')
 * @param {string} root0.key The key of the item for Localization (e.g. 'sources.page', 'attributes.requirement.key')
 * @returns {string[]} The localization prefix
 * @private
 * @function
 * @name _buildLocalizationPrefix
 * @example
 * _buildLocalizationPrefix({itemType: 'Base-Item', key: 'sources.page'})
 * returns ['SWERPG.Base-Item.FIELDS.sources.page']
 */
export function _buildLocalizationPrefix({ itemType, key }) {
  return [`SWERPG.${itemType}.FIELDS.${key}`]
}

/**
 * Create a new StringField with the requiredString properties set to false
 * @param {object} root0
 * @param {string} root0.itemType The type of the item for Localization (e.g. 'Base-Item', 'Combat-Item', 'Species-Item')
 * @param {string} root0.key The key of the item for Localization (e.g. 'sources.page', 'attributes.requirement.key')
 * @param {string} root0.initial The initial value of the field (default is "")
 * @returns {fields.StringField} A schema Field used to describe the structure and type of the data
 * @public
 * @function
 * @name buildOptionalStringField
 */
export function buildOptionalStringField({ initial = '', itemType, key }) {
  const fields = foundry.data.fields
  const prefix = _buildLocalizationPrefix({ itemType, key })
  let objectValues = _enrichDataFieldConfiguration({
    initial,
    dataFieldConfiguration: optionalString,
  })

  return new fields.StringField({
    ...objectValues,
    label: `${prefix}.label`,
    hint: `${prefix}.hint`,
    placeholder: `${prefix}.placeholder`,
  })
}

/**
 * Create a new StringField with the requiredString properties set to true
 * @param {object} root0
 * @param {string} root0.itemType The type of the item for Localization (e.g. 'Base-Item', 'Combat-Item', 'Species-Item')
 * @param {string} root0.key The key of the item for Localization (e.g. 'sources.page', 'attributes.requirement.key')
 * @returns {fields.StringField} A schema Field used to describe the structure and type of the data
 * @public
 * @function
 * @name buildMandatoryStringField
 */
export function buildMandatoryStringField({ itemType, key }) {
  const fields = foundry.data.fields
  const prefix = _buildLocalizationPrefix({ itemType, key })
  let dataFieldConfiguration = _enrichDataFieldConfiguration({
    dataFieldConfiguration: requiredString,
  })

  return new fields.StringField({
    ...dataFieldConfiguration,
    label: `${prefix}.label`,
    hint: `${prefix}.hint`,
    placeholder: `${prefix}.placeholder`,
  })
}

/**
 * Create a new NumberField with the required properties set to false
 * @param {object} root0
 * @param {string} root0.itemType The type of the item for Localization (e.g. 'Base-Item', 'Combat-Item', 'Species-Item')
 * @param {string} root0.key The key of the item for Localization (e.g. 'sources.page', 'attributes.requirement.key')
 * @param {number} root0.initial The initial value of the field (default is 0)
 * @param {number} root0.min The minimum value of the field (default is 0)
 * @param {number} root0.max The maximum value of the field (default is 10)
 * @returns {fields.NumberField} A schema Field used to describe the structure and type of the data
 * @public
 * @function
 * @name buildOptionalIntegerField
 */
export function buildOptionalIntegerField({ itemType, key, initial = 0, min = 0, max = 10 }) {
  const fields = foundry.data.fields
  const prefix = _buildLocalizationPrefix({ itemType, key })
  let dataFieldConfiguration = _enrichDataFieldConfiguration({
    initial,
    dataFieldConfiguration: optionalInteger,
  })

  return new fields.NumberField({
    ...dataFieldConfiguration,
    min,
    max,
    label: `${prefix}.label`,
    hint: `${prefix}.hint`,
  })
}

/**
 * Create a new NumberField with the required properties set to true
 * @param {object} root0
 * @param {string} root0.itemType The type of the item for Localization (e.g. 'Base-Item', 'Combat-Item', 'Species-Item')
 * @param {string} root0.key The key of the item for Localization (e.g. 'sources.page', 'attributes.requirement.key')
 * @param {number} root0.initial Initial value for the field (default is 0)
 * @param {number} root0.min The minimum value of the field (default is 0)
 * @param {number} root0.max The maximum value of the field (default is 10)
 * @returns {fields.NumberField} A schema Field used to describe the structure and type of the data
 * @public
 * @function
 * @name buildMandatoryIntegerField
 */
export function buildMandatoryIntegerField({ itemType, key, initial = 0, min = 0, max = 10 }) {
  const fields = foundry.data.fields
  const prefix = _buildLocalizationPrefix({ itemType, key })
  let dataFieldConfiguration = _enrichDataFieldConfiguration({
    initial,
    dataFieldConfiguration: requiredInteger,
  })

  return new fields.NumberField({
    ...dataFieldConfiguration,
    min,
    max,
    label: `${prefix}.label`,
    hint: `${prefix}.hint`,
  })
}

/**
 * Create a new BooleanField with the required properties set to false
 * @param {object} root0
 * @param {boolean} root0.initial The initial value of the field (default is false)
 * @param {string} root0.itemType The type of the item for Localization (e.g. 'Base-Item', 'Combat-Item', 'Species-Item')
 * @param {string} root0.key The key of the item for Localization (e.g. 'sources.page', 'attributes.requirement.key')
 * @returns {fields.BooleanField} A schema Field used to describe the structure and type of the data
 * @public
 * @function
 * @name buildOptionalBooleanField
 */
export function buildOptionalBooleanField({ initial = false, itemType, key }) {
  const fields = foundry.data.fields
  const prefix = _buildLocalizationPrefix({ itemType, key })
  let dataFieldConfiguration = _enrichDataFieldConfiguration({
    initial,
    dataFieldConfiguration: optionalBoolean,
  })

  return new fields.BooleanField({
    ...dataFieldConfiguration,
    label: `${prefix}.label`,
    hint: `${prefix}.hint`,
  })
}

/**
 * Create a new BooleanField with the required properties set to true
 * @param {object} root0
 * @param {string} root0.itemType The type of the item for Localization (e.g. 'Base-Item', 'Combat-Item', 'Species-Item')
 * @param {string} root0.key The key of the item for Localization (e.g. 'sources.page', 'attributes.requirement.key')
 * @returns {fields.BooleanField} A schema Field used to describe the structure and type of the data
 * @public
 * @function
 * @name buildMandatoryBooleanField
 */
export function buildMandatoryBooleanField({ itemType, key }) {
  const fields = foundry.data.fields
  const prefix = _buildLocalizationPrefix({ itemType, key })
  let dataFieldConfiguration = _enrichDataFieldConfiguration({
    dataFieldConfiguration: requiredBoolean,
  })

  return new fields.BooleanField({
    ...dataFieldConfiguration,
    label: `${prefix}.label`,
    hint: `${prefix}.hint`,
  })
}

/**
 * Create a new StringField with the requiredString properties
 *
 * @param {object} root0
 * @param {string} root0.initial
 * @param {string} root0.itemType
 * @param {string} root0.key
 * @returns {fields.HTMLField}
 */
export function buildOptionalHtmlField({ initial = '', itemType, key }) {
  const fields = foundry.data.fields
  const prefix = _buildLocalizationPrefix({ itemType, key })
  let dataFieldConfiguration = _enrichDataFieldConfiguration({
    initial,
    dataFieldConfiguration: optionalHtml,
  })

  return new fields.HTMLField({
    ...dataFieldConfiguration,
    label: `${prefix}.label`,
    hint: `${prefix}.hint`,
  })
}

/**
 *
 * @param {object} root0
 * @param {string} root0.itemType
 * @param {string} root0.key
 */
export function buildMandatoryHtmlField({ itemType, key }) {
  const fields = foundry.data.fields
  const prefix = _buildLocalizationPrefix({ itemType, key })
  let dataFieldConfiguration = _enrichDataFieldConfiguration({
    dataFieldConfiguration: mandatoryHtml,
  })

  return new fields.HTMLField({
    ...dataFieldConfiguration,
    label: `${prefix}.label`,
    hint: `${prefix}.hint`,
  })
}

/* ******************************************************************************************************* */

/**
 * Create a new SchemaField with the required properties set to false
 *
 * @param {object} field The field object inside the SchemaField
 * @returns {fields.SchemaField} A schema Field used to describe the structure and type of the data
 */
export function buildOptionalSchemaField(field = {}) {
  const fields = foundry.data.fields
  return new fields.SchemaField(field, { required: false, initial: {} })
}

/**
 * Create a new SchemaField with the required properties set to true
 * @param {object} field The field object inside the SchemaField
 * @returns {fields.SchemaField} A schema Field used to describe the structure and type of the data
 * @public
 * @function
 * @name mandatorySchemaField
 */
export function mandatorySchemaField(field = {}) {
  const fields = foundry.data.fields
  return new fields.SchemaField(field, { required: true })
}

/**
 *
 * @param {object} root0
 * @param {Array} root0.initial
 * @param {object} root0.field
 */
export function buildOptionalSetField({ initial = [], field = {} }) {
  const fields = foundry.data.fields
  return new fields.SetField(field, { required: false, initial })
}

/**
 * Create a new SetField with the required properties set to true
 * @param {object} field The field object inside the SetField
 * @returns {fields.SetField} A schema Field used to describe the structure and type of the data
 * @public
 * @function
 * @name mandatorySetField
 */
export function mandatorySetField(field = {}) {
  const fields = foundry.data.fields
  return new fields.SetField(field, { required: true })
}

/**
 * Create a new ArrayField with the required properties set to false
 *
 * @param {object} root0
 * @param {Array} root0.initial The initial value of the field
 * @param {object} root0.field The field object inside the ArrayField
 * @returns {fields.ArrayField} A schema Field used to describe the structure and type of the data
 */
export function buildOptionalArrayField({ initial = [], field }) {
  return new fields.ArrayField(field, { required: false, initial })
}

/**
 * Create a new ArrayField with the required properties set to true
 *
 * @param {object} root0
 * @param {object} root0.field The field object
 * @returns {fields.ArrayField} A schema Field used to describe the structure and type of the data
 */
export function buildMandatoryArrayField({ field }) {
  return new fields.ArrayField(field, { required: true })
}

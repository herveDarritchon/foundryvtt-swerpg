import { checkFileExists, createPathIfNecessary, uploadFileOnTheServer } from '../../helpers/server/directory/file.mjs'
import { createFoundryFolder } from '../../helpers/foundry/folder.mjs'
import { parseXmlToJson } from '../../utils/xml/parser.mjs'
import { logger } from '../../utils/logger.mjs'

/**
 * @typedef {object} ZipEntry
 * @property {null|string} comment
 * @property {object} date
 * @property {boolean} dir
 * @property {null|number} dosPermissions
 * @property {string} name
 * @property {object} options
 * @property {null|number} unixPermissions
 * @property {string} unsafeOriginalName
 * @property {number} uncompressedSize
 * @property {object} _data
 * @property {boolean} _dataBinary

 /**
 * @typedef {object} FoundryItemFolder The folder of the element
 * @property {string} name The name of the folder
 * @property {string} type The type of the folder
 */

/**
 * @typedef {object} OggDudeContextImage The context of the images to be uploaded
 * @property {string} worldPath The image path of the world
 * @property {string} systemPath The image item path of the system
 * @property {string} criteria The criteria to select the elements in the json file.
 * @property {OggDudeDataElement[]} images The images to be uploaded
 */

/**
 * @typedef {object} OggDudeZipElementFile The zip file
 * @property {string} fullPath The full path of the file in the zip, including the filename.
 */

/**
 * @typedef {object} ItemElement The item element of the file
 * @property {string} jsonCriteria The criteria to select the elements in the json file.
 * @property {function} mapper The function to map the Armor data to the SwerpgArmor object array.
 * @property {string} type The type of the element to be stored, must be a system item type.
 */

/**
 * @typedef {object} OggDudeZip The zip object
 * @property {object} directories The directories in the zip
 * @property {string} elementFileName The name of the element file
 * @property {JSZip.JSZipObject} content The content of the zip
 */

/**
 * @typedef {Object} OggDudeElementContext The context of the element to be stored
 * @property {[OggDudeDataElement]} jsonData All the data in the json format
 * @property {OggDudeZip} zip The zip object
 * @property {ItemElement} element The item element of the file
 * @property {OggDudeContextImage} image The context of the images to be uploaded
 * @property {FoundryItemFolder} folder The folder of the element
 */

/**
 * Represents a file in the OggDude data zip
 */
class OggDudeDataElement {
  /**
   * The allowed image extensions
   * @type {string[]}
   * @private
   */
  static ALLOWED_IMAGE_EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png', 'gif']

  /**
   * The type of image file
   * @type {string}
   */
  static image = 'image'

  /**
   * The type of xml file
   * @type {string}
   */
  static xml = 'xml'

  /**
   * The type of directory
   * @type {string}
   */
  static directory = 'directory'

  /**
   *
   * @param {ZipEntry} zipEntry Object the zip entry object
   */
  constructor(zipEntry = {}) {
    /**
     * The name of the file
     * @type {string}
     * @private
     */
    this._name = this._getFileName(zipEntry.name, zipEntry.dir)

    /**
     * The relative path of the file in the zip without the filename
     * @type {string}
     * @private
     */
    this._relativePath = this._getRelativePath(zipEntry.name, zipEntry.dir)

    /**
     * The type of the file (directory or image or xml file)
     * @type {string}
     * @private
     */
    this._type = this.__getElementType(zipEntry.name, zipEntry.dir)

    /**
     * The full path of the file in the zip, including the filename.
     * @type {string}
     * @private
     */
    this._fullPath = zipEntry.name
  }

  /**
   * Returns true if the element is a directory
   * @returns {boolean}
   */
  isDir = () => this._type === OggDudeDataElement.directory

  /**
   * Returns true if the element is an image
   * @returns {boolean}
   */
  isImage = () => this._type === OggDudeDataElement.image

  /**
   * Returns true if the element is a xml file
   * @returns {boolean}
   */
  isXml = () => this._type === OggDudeDataElement.xml

  /**
   * Returns the name of the file
   * @returns {string}
   */
  get name() {
    return this._name
  }

  /**
   * Returns the relative path of the file in the zip without the filename
   * @returns {string}
   */
  get relativePath() {
    return this._relativePath
  }

  /**
   * Returns the full path of the file in the zip, including the filename.
   * @returns {string}
   */
  get fullPath() {
    return this._fullPath
  }

  /**
   * Returns the list of OggDudeDataElement from the zip
   * @param {{[p: string]: JSZip.JSZipObject}} zip
   * @returns {OggDudeDataElement[]}
   */
  static from(zip) {
    return Object.values(zip.files).map((zipEntry) => {
      return new OggDudeDataElement(zipEntry)
    })
  }

  /**
   * Group OggDudeDataElement by type
   * @param {OggDudeDataElement[]} elements
   * @returns {object} An object where the keys are the types and the values are arrays of elements of that type
   */
  static groupByType(elements) {
    return elements.reduce((grouped, element) => {
      const key = element._type
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(element)
      return grouped
    }, {})
  }

  /**
   * Group OggDudeDataElement by type
   * @param {OggDudeDataElement[]} elements
   * @returns {object} An object where the keys are the types and the values are arrays of elements of that type
   */
  static groupByDirectory(elements) {
    return elements
      .filter((element) => element._type !== OggDudeDataElement.directory)
      .reduce((grouped, element) => {
        const key = element._relativePath
        if (!grouped[key]) {
          grouped[key] = []
        }
        grouped[key].push(element)
        return grouped
      }, {})
  }

  static getElementsFrom(directories, path, name) {
    // Validation sécurité basique: empêcher traversal ou noms suspects
    if (typeof name !== 'string' || name.includes('..') || name.includes('/') || name.includes('\\')) {
      logger.warn('[OggDudeDataElement] getElementsFrom - invalid name rejected', { name })
      return undefined
    }
    const directory = directories[path] || []
    return directory.find((element) => element.name === name)
  }

  /**
   * Returns the filename with the extension and without the path
   * @param {string} fileName the name of the file
   * @param {boolean} dir if the type of the file is a directory
   * @returns {string} the filename with the extension
   * @private
   */
  _getFileName = (fileName, dir) => (dir ? '' : new URL('file://' + fileName).pathname.split('/').pop())

  /**
   * Returns the relative path of the file in the zip without the filename
   * @param {string} fileName the name of the file
   * @param {boolean} dir if the type of the file is a directory
   * @returns {string} the relative path of the file in the zip
   * @private
   */
  _getRelativePath = (fileName, dir) => (dir ? fileName : fileName.substring(0, fileName.lastIndexOf('/')))

  /**
   *  Returns the type of the file (directory or image or xml file)
   * @param {boolean} dir if the type of the file is a directory
   * @param {string} filename
   * @returns {string} the type of the file (directory or image or xml file)
   * @private
   */
  __getElementType = (filename, dir) => (dir ? 'directory' : this._getFileType(filename))

  /**
   * Returns the file type of the file (image or xml)
   * @param {string} filename
   * @returns {string}
   * @private
   */
  _getFileType = (filename) => {
    const extension = filename.split('.').pop()
    if (OggDudeDataElement.ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
      return OggDudeDataElement.image
    } else if (extension === OggDudeDataElement.xml) {
      return OggDudeDataElement.xml
    }
  }

  /**
   * Returns the MIME type of the file.
   * @returns {*|string} the MIME type of the file
   * @public
   * @function
   * @name _getMimeType
   * @memberof OggDudeDataElement
   */
  getMimeType = () => {
    const extension = this._name.split('.').pop().toLowerCase()
    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      xml: 'application/xml',
      // Ajoutez d'autres correspondances d'extensions et de types MIME au besoin
    }

    return mimeTypes[extension] || 'application/octet-stream'
  }

  /**
   * upload the images on the server
   * @param imageContext {OggDudeContextImage} The context of the images to be uploaded
   * @param zip {JSZip.JSZipObject} The zip object
   * @returns {Promise<void>} A Promise that resolves when the images have been uploaded.
   * @private
   * @function
   * @name _uploadImagesOnTheServer
   */
  static _uploadImagesOnTheServer = async (imageContext, zip) => {
    // Upload the item images to the server
    const imageFiles = imageContext.images.filter((image) => {
      return image.fullPath.startsWith(imageContext.criteria)
    })
    logger.debug('[OggDudeDataElement] Image files filtered', { imageFiles })

    for (const file of imageFiles) {
      const imgData = await zip.files[file.fullPath].async('blob')
      logger.debug('[OggDudeDataElement] Item image data before upload', { file })
      await uploadFileOnTheServer({ data: imgData, element: file }, imageContext.worldPath)
    }
  }
  /**
   * Build the armor image world path
   * @param key {string} The key of the item
   * @param imageWorldPath {string} The path of the world
   * @param prefix {string} The type of the element
   * @param imgSystemPath {string} The system path and the item image filename
   * @returns {Promise<string>}   The path of the image
   * @private
   * @function
   * @name _buildItemImgSystemPath
   */
  static _getItemImage = async (key, imageWorldPath, prefix, imgSystemPath) => {
    // get the item image path
    const image = `${imageWorldPath}/${prefix}${key}.png`
    logger.debug('[OggDudeDataElement] Item image to be checked', { key, image })
    const found = await checkFileExists(image)
    if (found) {
      logger.debug('[OggDudeDataElement] Specific item image found', { key, image })
      return image
    } else {
      const image = `${imgSystemPath}`
      logger.debug('[OggDudeDataElement] Specific item image not found, using default', { key, image })
      return image
    }
  }

  /**
   * Store the Items in the database. The data is mapped to the Swerpg Item object array
   * @param items {Array} The items to be stored in the database.
   * @param folder {Folder} The folder where the items will be stored.
   * @param elementType {string} The element type to be stored, must be a system item type.
   * @param imageWorldPath {string} The path to store the image for the item in the world .
   * @param imgSystemPath {string} The path to store the image for the item in the system.
   * @param prefix
   * @returns {Promise<void>} A Promise that resolves when the items have been stored.
   * @private
   * @function
   * @name _storeItems
   */
  static _storeItems = async (items, folder, elementType, imageWorldPath, imgSystemPath, prefix) => {
    let itemPromises = await Promise.all(
      items.map(async (item) => {
        const key = item.key != null && item.key !== '' ? item.key : item.name.toUpperCase()
        logger.debug('[OggDudeDataElement] Item image to be returned by method _getItemImage', { key })
        const img = await OggDudeDataElement._getItemImage(key, imageWorldPath, prefix, imgSystemPath)
        logger.debug('[OggDudeDataElement] Item image resolved by _getItemImage', { key, img })
        return {
          name: item.name,
          img: img,
          type: elementType, // This should match the type defined in your system
          system: item, // This should match the structure of your SwerpgItems schema
          folder: folder.id, // Set the folder id
        }
      }),
    )

    logger.debug('[OggDudeDataElement] Items mapped before creation', { itemPromises })

    let promiseResolved = Promise.all(itemPromises)
      .then(async (item) => {
        logger.info('[OggDudeDataElement] Creating items batch', { item })
        Item.createDocuments(item)
          .then((item) => {
            logger.debug('[OggDudeDataElement] Item created', { item })
          })
          .catch((error, item) => {
            logger.error('[OggDudeDataElement] Error while creating item', { item, error })
          })
      })
      .catch((error) => {
        logger.error('[OggDudeDataElement] Error while resolving item creation promises', { error })
      })

    logger.debug('[OggDudeDataElement] Items creation promises resolved', { promiseResolved })
    return promiseResolved
  }

  /**
   * Store the Items in the database. The data is mapped to the Swerpg Item object array.
   * @param jsonData {[OggDudeDataElement]} The Items in the format of Json.
   * @param mapperFn {function} The function to map the Item data to the Swerpg Item object array.
   * @returns {Array} The items to be created in FVTT.
   * @async
   * @private
   * @function
   * @name _buildItemElements
   */
  static _buildItemElements = (jsonData, mapperFn) => {
    //const elements = foundry.utils.getProperty(jsonData, elementCriteria);
    let items = mapperFn(jsonData)
    logger.debug('[OggDudeDataElement] Items to be created in Foundry VTT database', { items })
    return items
  }

  /**
   * Store Items base on the context provided
   * @param context {OggDudeElementContext} The context of the element to be stored
   * @returns {Promise<void>} A Promise that resolves when the element has been stored.
   * @async
   * @public
   * @function
   * @name processElements
   */
  static processElements = async (context) => {
    logger.debug('[OggDudeDataElement] ProcessElements - Step Initial', { context })

    // Step 4: Create the folder
    let folder = await createFoundryFolder(context.folder.name, context.folder.type)
    logger.debug('[OggDudeDataElement] ProcessElements - Step 4 Folder', { folder })

    // Step 5-1: Create the folder in the FVTT tab
    const imgPath = await createPathIfNecessary(context.image.worldPath)
    logger.debug('[OggDudeDataElement] ProcessElements - Step 5-1 Image Path', { imgPath })

    // Step 5-2: Upload the images to the server
    await OggDudeDataElement._uploadImagesOnTheServer(context.image, context.zip.content)
    logger.debug('[OggDudeDataElement] ProcessElements - Step 5-2 Images uploaded')

    // Step 6-4 : Create the Items
    const items = OggDudeDataElement._buildItemElements(context.jsonData, context.element.mapper)
    logger.debug('[OggDudeDataElement] ProcessElements - Step 6-4 Items', { items })

    // Step 6-5: Store the Items in the server database
    await OggDudeDataElement._storeItems(items, folder, context.element.type, context.image.worldPath, context.image.systemPath, context.image.prefix)
    logger.debug('[OggDudeDataElement] ProcessElements - Step 6-5 Items stored')
  }

  /**
   * Process the data from the imported file. The process is as follows:
   * @param zip {JSZip} The imported file.
   * @param groupByDirectory {string} The directory to group the data by.
   * @param elementFileName {string}  The name of the element file.
   * @param elementCriteria
   * @returns {Promise<string>} A Promise that resolves when the data has been processed in the format of a json structure.
   */
  static async buildJsonDataFromFile(zip, groupByDirectory, elementFileName, elementCriteria) {
    // Step 6-1: Get the item File from the Data directory
    const itemFile = OggDudeDataElement.getElementsFrom(groupByDirectory, 'Data', elementFileName)
    logger.debug('[OggDudeDataElement] BuildJsonDataFromFile - Step 6-1 Item File', { itemFile })

    // Step 6-2: Get the item Data from the itemFile
    const itemData = await zip.files[itemFile.fullPath].async('text')
    logger.debug('[OggDudeDataElement] BuildJsonDataFromFile - Step 6-2 Item Data', { itemDataLength: itemData.length })

    // Step 6-3: Parse the XML itemData
    const jsonRawData = await parseXmlToJson(itemData)
    const jsonData = foundry.utils.getProperty(jsonRawData, elementCriteria)
    logger.debug('[OggDudeDataElement] BuildJsonDataFromFile - Step 6-3 JSON Data', { jsonData })

    return jsonData
  }

  /**
   * Process the data from the imported file. The process is as follows:
   * @param zip {JSZip} The imported file.
   * @param xmlOggDudeElement
   * @param elementDirectoryName {string} The name of the element directory.
   * @param elementCriteria
   * @returns {Promise<string>} A Promise that resolves when the data has been processed in the format of a json structure.
   */
  static async buildJsonDataFromDirectory(zip, xmlOggDudeElement, elementDirectoryName, elementCriteria) {
    logger.debug('[OggDudeDataElement] BuildJsonDataFromDirectory - xmlOggDudeElement', { count: xmlOggDudeElement.length })
    const fullPathSearched = `Data/${elementDirectoryName}`
    const oggDudeElementsSelected = xmlOggDudeElement.filter((xmlElement) => xmlElement.relativePath === fullPathSearched)
    // Step 6-1: Get the item Data from the itemFile

    // Step 6-2: Parse the XML itemData
    logger.debug('[OggDudeDataElement] BuildJsonDataFromDirectory - Step 6-1 Files', { filesCount: oggDudeElementsSelected.length })
    const jsonData = await Promise.all(
      oggDudeElementsSelected.map(async (element) => {
        const fileData = await zip.files[element.fullPath].async('text')
        const rawData = await parseXmlToJson(fileData)
        return foundry.utils.getProperty(rawData, elementCriteria)
      }),
    )

    logger.debug('[OggDudeDataElement] BuildJsonDataFromDirectory - Step 6-2 JSON Data', { jsonData })
    return jsonData
  }
}

export default OggDudeDataElement

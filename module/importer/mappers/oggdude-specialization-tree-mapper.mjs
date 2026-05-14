import { logger } from '../../utils/logger.mjs'
import { buildDescription, resolveSource } from '../utils/description-markup-utils.mjs'
import {
  addSpecializationTreeInvalidConnection,
  addSpecializationTreeMissingCost,
  addSpecializationTreeRejectionReason,
  addSpecializationTreeUnresolvedTalent,
  addSpecializationTreeTalentUuidNotResolved,
  buildTreeImportDiagnostics,
  getSpecializationTreeImportStats,
  incrementSpecializationTreeImportStat,
  isResolvedNodeReference,
  normalizeConnectionType,
  normalizeNodeId,
  normalizeSpecializationTreeId,
  parseNonNegativeInteger,
  parsePositiveInteger,
  resetSpecializationTreeImportStats,
} from '../utils/specialization-tree-import-utils.mjs'

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (value && typeof value === 'object') return [value]
  if (typeof value === 'string') return [value]
  return []
}

function readMandatoryString(label, value) {
  if (value == null || typeof value !== 'string') {
    logger.warn(`[SpecializationTreeImporter] Value ${label} is mandatory`, { value })
    return ''
  }

  return value.trim()
}

function readOptionalString(value) {
  return typeof value === 'string' ? value : ''
}

function readFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (value && typeof value === 'object') {
      const nested = readFirstString(value._, value.Key, value.Name, value.Id, value.id, value.name)
      if (nested) return nested
    }
  }
  return ''
}

function buildNodeReferenceMaps(nodes) {
  const maps = {
    byRawKey: new Map(),
    byCoordinates: new Map(),
  }

  for (const node of nodes) {
    if (node.rawNodeKey) maps.byRawKey.set(node.rawNodeKey, node.nodeId)
    maps.byCoordinates.set(`${node.row}:${node.column}`, node.nodeId)
  }

  return maps
}

function resolveConnectionEndpoint(rawReference, maps) {
  if (!rawReference) return null

  if (isResolvedNodeReference(rawReference)) return rawReference.toLowerCase()

  const coordinateMatch = String(rawReference).trim().match(/^r?(\d+)[^\d]+c?(\d+)$/i)
  if (coordinateMatch) {
    const [, row, column] = coordinateMatch
    return maps.byCoordinates.get(`${row}:${column}`) || normalizeNodeId(Number(row), Number(column))
  }

  return maps.byRawKey.get(String(rawReference).trim()) || null
}

function extractNodeConnectionEntries(rawNode, currentNodeId, maps) {
  const connections = []
  const warnings = []
  const candidates = asArray(rawNode?.Connections?.Connection)

  for (const connection of candidates) {
    const targetRef = readFirstString(connection?.To, connection?.Target, connection?.Node, connection?.NodeId, connection?.TargetNodeKey)
    const resolvedTo = resolveConnectionEndpoint(targetRef, maps)
    if (!resolvedTo) {
      addSpecializationTreeInvalidConnection(`${currentNodeId}->${targetRef || 'unknown'}`)
      warnings.push(`invalid-connection:${currentNodeId}->${targetRef || 'unknown'}`)
      continue
    }

    connections.push({
      from: currentNodeId,
      to: resolvedTo,
      type: normalizeConnectionType(readFirstString(connection?.Type, connection?.Direction)),
    })
  }

  return { connections, warnings }
}

function extractGlobalConnectionEntries(xmlSpecialization, maps) {
  const candidates = asArray(xmlSpecialization?.Connections?.Connection)
  const connections = []
  const warnings = []

  for (const connection of candidates) {
    const fromRef = readFirstString(connection?.From, connection?.Source, connection?.FromNodeKey)
    const toRef = readFirstString(connection?.To, connection?.Target, connection?.ToNodeKey)
    const from = resolveConnectionEndpoint(fromRef, maps)
    const to = resolveConnectionEndpoint(toRef, maps)

    if (!from || !to) {
      addSpecializationTreeInvalidConnection(`${fromRef || 'unknown'}->${toRef || 'unknown'}`)
      warnings.push(`invalid-connection:${fromRef || 'unknown'}->${toRef || 'unknown'}`)
      continue
    }

    connections.push({
      from,
      to,
      type: normalizeConnectionType(readFirstString(connection?.Type, connection?.Direction)),
    })
  }

  return { connections, warnings }
}

function extractNodesFromRows(xmlSpecialization) {
  const rows = asArray(xmlSpecialization?.TalentRows?.TalentRow)
  const nodes = []

  for (const [rowIndex, rawRow] of rows.entries()) {
    const cost = parseNonNegativeInteger(rawRow?.Cost)
    const row = computeRowFromCost(cost) ?? parsePositiveInteger(rawRow?.Row ?? rawRow?.Tier) ?? rowIndex + 1

    const talentKeys = asArray(rawRow?.Talents?.Key)
    if (talentKeys.length > 0) {
      const directions = asArray(rawRow?.Directions?.Direction)
      const cost = parseNonNegativeInteger(rawRow?.Cost)
      for (const [columnIndex, rawTalentKey] of talentKeys.entries()) {
        const column = columnIndex + 1
        nodes.push({
          rawNode: { rawTalentKey, direction: directions[columnIndex] || null },
          row,
          column,
          rawNodeKey: `r${row}c${column}`,
          talentId: normalizeSpecializationTreeId(readFirstString(rawTalentKey)),
          cost,
        })
      }
      continue
    }

    const columns = asArray(rawRow?.TalentColumns?.TalentColumn)
    for (const [columnIndex, rawColumn] of columns.entries()) {
      nodes.push({
        rawNode: rawColumn,
        row,
        column: parsePositiveInteger(rawColumn?.Index ?? rawColumn?.Column ?? rawColumn?.Position) ?? columnIndex + 1,
        rawNodeKey: readFirstString(rawColumn?.NodeKey, rawColumn?.Key, rawColumn?.Id),
        talentId: readFirstString(rawColumn?.TalentKey, rawColumn?.TalentId, rawColumn?.Key),
        cost: parseNonNegativeInteger(rawColumn?.Cost ?? rawColumn?.XpCost ?? rawColumn?.XP ?? rawColumn?.RankCost),
      })
    }
  }

  return nodes
}

function computeRowFromCost(cost) {
  const numericCost = Number(cost)
  if (!Number.isFinite(numericCost)) return null

  const row = Math.floor((numericCost - 5) / 5) + 1
  return row >= 1 && row <= 5 ? row : null
}

function extractNodesFromFlatList(xmlSpecialization) {
  const candidates = [
    ...asArray(xmlSpecialization?.Nodes?.Node),
    ...asArray(xmlSpecialization?.TalentNodes?.TalentNode),
    ...asArray(xmlSpecialization?.Tree?.Nodes?.Node),
  ]

  return candidates.map((rawNode) => ({
    rawNode,
    row: parsePositiveInteger(rawNode?.Row ?? rawNode?.Tier ?? rawNode?.Y),
    column: parsePositiveInteger(rawNode?.Column ?? rawNode?.X ?? rawNode?.Position),
    rawNodeKey: readFirstString(rawNode?.NodeKey, rawNode?.Key, rawNode?.Id),
    talentId: readFirstString(rawNode?.TalentKey, rawNode?.TalentId, rawNode?.Key),
    cost: parseNonNegativeInteger(rawNode?.Cost ?? rawNode?.XpCost ?? rawNode?.XP ?? rawNode?.RankCost),
  }))
}

function extractRawNodeEntries(xmlSpecialization) {
  const rowNodes = extractNodesFromRows(xmlSpecialization)
  if (rowNodes.length > 0) return rowNodes
  return extractNodesFromFlatList(xmlSpecialization)
}

function detectInputFormat(xmlSpecialization) {
  const rows = asArray(xmlSpecialization?.TalentRows?.TalentRow)

  if (rows.length > 0) {
    let hasKeys = false
    let hasColumns = false

    for (const row of rows) {
      if (row?.Talents?.Key) {
        hasKeys = true
        break
      }
      if (row?.TalentColumns?.TalentColumn) {
        hasColumns = true
      }
    }

    if (hasKeys) return 'talent-rows-keys'
    if (hasColumns) return 'talent-rows-columns'
    return 'talent-rows-unknown'
  }

  if (
    xmlSpecialization?.Nodes?.Node ||
    xmlSpecialization?.TalentNodes?.TalentNode ||
    xmlSpecialization?.Tree?.Nodes?.Node
  ) {
    return 'flat-list'
  }

  return 'unknown'
}

function normalizeNodes(xmlSpecialization, specializationId) {
  const warnings = []
  const normalizedNodes = []
  const rawNodes = extractRawNodeEntries(xmlSpecialization)

  for (const rawEntry of rawNodes) {
    const nodeId = normalizeNodeId(rawEntry.row, rawEntry.column)
    if (!nodeId) {
      warnings.push(`invalid-node-position:${rawEntry.rawNodeKey || rawEntry.talentId || 'unknown'}`)
      continue
    }

    if (!rawEntry.talentId) {
      warnings.push(`unresolved-talent:${nodeId}`)
      addSpecializationTreeUnresolvedTalent(`${specializationId}:${nodeId}`)
    }

    if (rawEntry.cost == null) {
      warnings.push(`missing-cost:${nodeId}`)
      addSpecializationTreeMissingCost(`${specializationId}:${nodeId}`)
      continue
    }

    normalizedNodes.push({
      rawNode: rawEntry.rawNode,
      rawNodeKey: rawEntry.rawNodeKey,
      nodeId,
      talentId: rawEntry.talentId || `unknown:${specializationId}:${nodeId}`,
      row: rawEntry.row,
      column: rawEntry.column,
      cost: rawEntry.cost,
    })
  }

  return { normalizedNodes, warnings, rawCount: rawNodes.length }
}

function dedupeConnections(connections) {
  const seen = new Set()
  const deduped = []

  for (const connection of connections) {
    const key = `${connection.from}->${connection.to}:${connection.type || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(connection)
  }

  return deduped
}

function extractDirectionalConnections(nodes) {
  const connections = []
  const warnings = []

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { connections, warnings }
  }

  for (const node of nodes) {
    const direction = node.rawNode?.direction
    if (!direction) continue

    if (direction.Right === 'true' || direction.Right === true) {
      const targetNodeId = `r${node.row}c${node.column + 1}`
      const targetExists = nodes.some(n => n.nodeId === targetNodeId)
      if (targetExists) {
        connections.push({ from: node.nodeId, to: targetNodeId, type: 'horizontal' })
      } else {
        warnings.push(`directional-target-missing:${node.nodeId}->${targetNodeId} (Right)`)
      }
    }

    if (direction.Down === 'true' || direction.Down === true) {
      const targetNodeId = `r${node.row + 1}c${node.column}`
      const targetExists = nodes.some(n => n.nodeId === targetNodeId)
      if (targetExists) {
        connections.push({ from: node.nodeId, to: targetNodeId, type: 'vertical' })
      } else {
        warnings.push(`directional-target-missing:${node.nodeId}->${targetNodeId} (Down)`)
      }
    }
  }

  return { connections, warnings }
}

export function specializationTreeMapper(specializations, { talentById } = {}) {
  resetSpecializationTreeImportStats()

  if (!Array.isArray(specializations) || specializations.length === 0) {
    logger.warn('[SpecializationTreeImporter] Input vide ou invalide', {
      type: typeof specializations,
    })
    return []
  }

  return specializations
    .map((xmlSpecialization, index) => {
      try {
        incrementSpecializationTreeImportStat('total')

        const rawKey = readMandatoryString('specialization-tree.Key', xmlSpecialization?.Key)
        const name = readMandatoryString('specialization-tree.Name', xmlSpecialization?.Name)

        if (!rawKey || !name) {
          incrementSpecializationTreeImportStat('rejected')
          addSpecializationTreeRejectionReason('MISSING_SPECIALIZATION_KEY_OR_NAME')
          return null
        }

        const specializationId = normalizeSpecializationTreeId(rawKey)
        if (!specializationId) {
          incrementSpecializationTreeImportStat('rejected')
          addSpecializationTreeRejectionReason('INVALID_SPECIALIZATION_ID')
          return null
        }

        const detectedFormat = detectInputFormat(xmlSpecialization)
        logger.debug('[SpecializationTreeImporter] Format détecté', { specializationId, format: detectedFormat })

        const sourceInfo = resolveSource(xmlSpecialization)
        const description = buildDescription(readOptionalString(xmlSpecialization?.Description), sourceInfo)
        const { normalizedNodes, warnings, rawCount } = normalizeNodes(xmlSpecialization, specializationId)
        const nodeMaps = buildNodeReferenceMaps(normalizedNodes)

        const { connections: directionalConnections, warnings: directionalWarnings } = extractDirectionalConnections(normalizedNodes)
        warnings.push(...directionalWarnings)
        for (const warning of directionalWarnings) {
          logger.warn(`[SpecializationTreeImporter] ${warning}`, { specializationId })
        }

        const nodeConnectionResults = normalizedNodes.map((node) => extractNodeConnectionEntries(node.rawNode, node.nodeId, nodeMaps))
        const globalConnectionResults = extractGlobalConnectionEntries(xmlSpecialization, nodeMaps)
        const nodeConnections = nodeConnectionResults.flatMap((result) => result.connections)
        const connectionWarnings = [
          ...nodeConnectionResults.flatMap((result) => result.warnings),
          ...globalConnectionResults.warnings,
        ]
        warnings.push(...connectionWarnings)
        const connections = dedupeConnections([...nodeConnections, ...globalConnectionResults.connections, ...directionalConnections]).map((connection) => ({
          ...(connection.type ? connection : { from: connection.from, to: connection.to }),
        }))

        logger.debug('[SpecializationTreeImporter] Résumé du mapping', {
          specializationId,
          rawNodeCount: rawCount,
          importedNodeCount: normalizedNodes.length,
          connectionCount: connections.length,
        })

        if (detectedFormat === 'unknown') {
          logger.warn('[SpecializationTreeImporter] Format non reconnu', { specializationId })
        }

        if (detectedFormat === 'talent-rows-unknown') {
          logger.warn('[SpecializationTreeImporter] Format rows sans nœuds identifiables', {
            specializationId,
            rowCount: asArray(xmlSpecialization?.TalentRows?.TalentRow).length,
          })
        }

        if (normalizedNodes.length === 0 && rawCount > 0) {
          logger.warn('[SpecializationTreeImporter] Toutes les entrées brutes rejetées', { specializationId, rawCount })
        }

        if (normalizedNodes.length === 0 || connections.length === 0) {
          incrementSpecializationTreeImportStat('incompleteTrees')
          warnings.push('tree-incomplete')
        }

        const unresolved = warnings.some((warning) => warning.startsWith('unresolved-talent'))
        const diagnostics = buildTreeImportDiagnostics(warnings, unresolved, {
          hasNodes: normalizedNodes.length > 0,
          hasConnections: connections.length > 0,
        })

        const rawCareerKey = readFirstString(
          xmlSpecialization?.CareerKey,
          xmlSpecialization?.CareerId,
          xmlSpecialization?.Career?.Key,
          xmlSpecialization?.Career?.Id,
        )

        return {
          key: `${specializationId}-tree`,
          name,
          type: 'specialization-tree',
          system: {
            description,
            specializationId,
            careerId: normalizeSpecializationTreeId(rawCareerKey) || undefined,
            source: {
              system: sourceInfo.name || undefined,
              book: sourceInfo.name || undefined,
              page: sourceInfo.page != null ? String(sourceInfo.page) : undefined,
            },
            nodes: normalizedNodes.map(({ nodeId, talentId, row, column, cost }) => {
              let talentUuid = null
              if (talentById && talentId) {
                const key = talentId.toLowerCase().trim()
                const resolved = talentById.get(key)
                if (resolved) {
                  talentUuid = resolved.uuid
                } else {
                  addSpecializationTreeTalentUuidNotResolved(`${specializationId}:${nodeId}:${talentId}`)
                }
              }
              return { nodeId, talentId, talentUuid, row, column, cost }
            }),
            connections,
          },
          flags: {
            swerpg: {
              oggdudeKey: rawKey,
              import: {
                ...diagnostics,
                domain: 'specialization-tree',
                source: sourceInfo.name || 'OggDude Import',
                raw: {
                  key: rawKey,
                  careerKey: rawCareerKey || undefined,
                  inputFormat: detectedFormat,
                  nodeCount: rawCount,
                },
                rawNodeCount: rawCount,
                importedNodeCount: normalizedNodes.length,
                importedConnectionCount: connections.length,
              },
            },
          },
        }
      } catch (error) {
        logger.error('[SpecializationTreeImporter] Erreur mapping arbre de specialisation', {
          index,
          error: error.message,
          stack: error.stack,
        })
        incrementSpecializationTreeImportStat('rejected')
        addSpecializationTreeRejectionReason('MAPPING_ERROR')
        return null
      }
    })
    .filter(Boolean)
}

export { extractDirectionalConnections, getSpecializationTreeImportStats, resetSpecializationTreeImportStats, addSpecializationTreeTalentUuidNotResolved }

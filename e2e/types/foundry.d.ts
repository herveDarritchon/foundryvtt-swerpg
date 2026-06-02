/**
 * Minimal ambient declarations for Foundry VTT globals used inside page.evaluate() callbacks.
 *
 * These types cover only what is accessed in e2e test helpers — not the full Foundry API.
 * For full type coverage, install @league-of-foundry-developers/foundry-vtt-types.
 *
 * Scope: e2e tests only. These declarations are resolved by e2e/tsconfig.json (includes **\/*.ts).
 */

interface FoundryActorDocument {
  id: string
  name?: string
  img?: string
  type?: string
  flags?: Record<string, unknown>
  system?: Record<string, unknown>
  ownership?: Record<string, number>
  update(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>
  delete(): Promise<unknown>
}

interface FoundryActors {
  getName(name: string): FoundryActorDocument | undefined
  get(id: string): FoundryActorDocument | undefined
  size?: number
  contents?: FoundryActorDocument[]
}

interface FoundryChatMessage {
  id?: string
  content?: string
  flags?: Record<string, unknown>
  delete(): Promise<unknown>
}

interface FoundryChatMessages {
  size: number
  contents: FoundryChatMessage[]
  get(id: string): FoundryChatMessage | undefined
}

interface FoundryUser {
  id?: string
  name?: string
  isGM?: boolean
}

interface FoundryUsers {
  get(id: string): FoundryUser | undefined
  size?: number
}

interface FoundryItemDocument {
  id: string
  name?: string
  type?: string
  flags?: Record<string, unknown>
  system?: Record<string, unknown>
  delete(): Promise<unknown>
}

interface FoundryItems {
  size?: number
  contents?: FoundryItemDocument[]
  getName(name: string): FoundryItemDocument | undefined
  get(id: string): FoundryItemDocument | undefined
}

interface FoundryCompendiumPackMetadata {
  packageType?: string
  packageName?: string
  name?: string
  id?: string
  label?: string
  type?: string
}

interface FoundryCompendiumPack {
  metadata: FoundryCompendiumPackMetadata
  locked?: boolean
  collection?: string
  getName(name: string): Promise<FoundryItemDocument | null>
  getDocuments(): Promise<FoundryItemDocument[]>
  configure(options: Record<string, unknown>): Promise<unknown>
  deleteCompendium(): Promise<unknown>
}

interface FoundryPacks {
  size?: number
  contents?: FoundryCompendiumPack[]
  get(id: string): FoundryCompendiumPack | undefined
  filter(predicate: (pack: FoundryCompendiumPack) => boolean): FoundryCompendiumPack[]
  find(predicate: (pack: FoundryCompendiumPack) => boolean): FoundryCompendiumPack | undefined
}

interface FoundryWorld {
  id?: string
  title?: string
}

interface FoundryGame {
  actors?: FoundryActors
  items?: FoundryItems
  packs?: FoundryPacks
  world?: FoundryWorld
  messages?: FoundryChatMessages
  users?: FoundryUsers
  user?: FoundryUser
  i18n?: {
    lang?: string
    localize(key: string): string
    format(key: string, data?: Record<string, unknown>): string
  }
  system?: {
    api?: Record<string, unknown>
    config?: Record<string, unknown>
  }
  settings?: {
    get(module: string, key: string): unknown
    set(module: string, key: string, value: unknown): Promise<unknown>
  }
  shutDown?(): void
}

/**
 * ChatMessage Foundry global — available in the browser context.
 */
declare const ChatMessage: {
  create(data: Record<string, unknown>): Promise<FoundryChatMessage | null>
  getSpeaker(options: { actor?: FoundryActorDocument | null }): Record<string, unknown>
  getWhisperRecipients(role: string): string[]
}

/**
 * Item Foundry global — available in the browser context.
 * Provides static document operations such as bulk deletion.
 */
declare const Item: {
  deleteDocuments(ids: string[], options?: Record<string, unknown>): Promise<FoundryItemDocument[]>
}

/**
 * The Foundry VTT `game` global, available in the browser context after the world is loaded.
 * May be undefined during page initialisation or before the world is ready.
 */
declare const game: FoundryGame | undefined

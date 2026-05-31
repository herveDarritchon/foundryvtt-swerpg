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

interface FoundryGame {
  actors?: FoundryActors
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
 * The Foundry VTT `game` global, available in the browser context after the world is loaded.
 * May be undefined during page initialisation or before the world is ready.
 */
declare const game: FoundryGame | undefined

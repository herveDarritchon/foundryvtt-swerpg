/**
 * Minimal ambient declarations for Foundry VTT globals used inside page.evaluate() callbacks.
 *
 * These types cover only what is accessed in e2e test helpers — not the full Foundry API.
 * For full type coverage, install @league-of-foundry-developers/foundry-vtt-types.
 *
 * Scope: e2e tests only. These declarations are resolved by e2e/tsconfig.json (includes **\/*.ts).
 */

interface FoundryActorDocument {
  delete(): Promise<unknown>
}

interface FoundryActors {
  getName(name: string): FoundryActorDocument | undefined
}

interface FoundryGame {
  actors?: FoundryActors
  shutDown?(): void
}

/**
 * The Foundry VTT `game` global, available in the browser context after the world is loaded.
 * May be undefined during page initialisation or before the world is ready.
 */
declare const game: FoundryGame | undefined
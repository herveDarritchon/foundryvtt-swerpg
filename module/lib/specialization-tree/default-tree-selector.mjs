/**
 * Sélectionne la clé de l'arbre de spécialisation à afficher par défaut.
 *
 * La règle est : dernier arbre résolu "available" dans l'ordre du tableau,
 * sauf si une clé explicite est fournie et correspond à une entrée disponible.
 *
 * @param {Array<{key: string, isAvailable: boolean}>} entries
 * @param {string|null} [selectedKey=null]
 * @returns {string|null}
 */
export function selectDefaultTreeKey(entries, selectedKey = null) {
  if (selectedKey && entries.some((e) => e.key === selectedKey && e.isAvailable)) {
    return selectedKey
  }
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].isAvailable) {
      return entries[i].key
    }
  }
  return null
}

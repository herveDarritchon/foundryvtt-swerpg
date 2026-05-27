import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'

/** Browser stub for Node.js `timers` — xml2js uses setImmediate for async parsing. */
const timersBrowserStub = {
  name: 'timers-browser-stub',
  resolveId(id) {
    if (id === 'timers') return '\0timers-browser-stub'
  },
  load(id) {
    if (id === '\0timers-browser-stub') {
      return `export const setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);\nexport const clearImmediate = clearTimeout;\n`
    }
  },
}

export default {
  input: 'swerpg.mjs',
  output: {
    file: 'dist/swerpg.bundle.js',
    format: 'es',
    compact: true,
    inlineDynamicImports: true,
  },
  plugins: [timersBrowserStub, nodeResolve({ browser: true, preferBuiltins: false }), commonjs()],
}

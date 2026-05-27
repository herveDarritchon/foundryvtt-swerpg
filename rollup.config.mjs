import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'

export default {
  input: 'swerpg.mjs',
  output: {
    file: 'dist/swerpg.bundle.js',
    format: 'es',
    compact: true,
    inlineDynamicImports: true,
  },
  plugins: [nodeResolve({ browser: true, preferBuiltins: false }), commonjs()],
}

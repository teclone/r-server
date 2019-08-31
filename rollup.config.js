import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import { uglify } from 'rollup-plugin-uglify';

import rollupAll from 'rollup-all';

const plugins = [
  resolve({
    extensions: ['.ts', '.js']
  }),
  commonjs({
    include: 'node_modules/**'
  }),
  babel({
    exclude: 'node_modules/**',
    extensions: ['.ts', '.js'],
    runtimeHelpers: true
  })
];

export default rollupAll.getExports(uglify(), plugins);

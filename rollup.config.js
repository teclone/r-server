import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

import rollupAll from 'rollup-all';

let plugins = [
    resolve(),
    babel({
        exclude: 'node_modules/**'
    })
];

export default rollupAll.getExports(null, plugins);
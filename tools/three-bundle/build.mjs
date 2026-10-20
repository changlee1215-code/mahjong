import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));

await build({
    entryPoints: [path.join(here, 'entry.js')],
    outfile: path.join(here, '..', '..', 'lib', 'three.min.js'),
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    legalComments: 'none',
    banner: { js: '/* three.js r186 + addons (global THREE) - built by tools/three-bundle */' },
    logLevel: 'info'
});

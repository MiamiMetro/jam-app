import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import { build } from 'vite';

const root = resolve(import.meta.dirname, '..');
const outDir = resolve(root, 'dist-electron');
const external = [
  'electron',
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
];

await build({
  root,
  configFile: false,
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: true,
    target: 'node20',
    minify: false,
    sourcemap: false,
    lib: {
      entry: resolve(root, 'src/electron/main.ts'),
      formats: ['es'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external,
      output: {
        format: 'es',
      },
    },
  },
});

await build({
  root,
  configFile: false,
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: false,
    target: 'node20',
    minify: false,
    sourcemap: false,
    lib: {
      entry: resolve(root, 'src/electron/preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    rollupOptions: {
      external,
      output: {
        format: 'cjs',
        entryFileNames: 'preload.js',
      },
    },
  },
});

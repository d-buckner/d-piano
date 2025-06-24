import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';


export default defineConfig({
	plugins: [
		dts({
			insertTypesEntry: true,
		}),
	],
	build: {
		lib: {
			entry: 'src/index.ts',
			name: 'd-piano',
			fileName: 'index',
			formats: ['es'],
		},
		minify: true,
		outDir: 'build',
		rollupOptions: {
			external: ['tone'], // peer-dependency
		},
	},
});

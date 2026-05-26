import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [preact(), tailwindcss()],
	build: {
		outDir: '../../dist',
		emptyOutDir: true,
	},
	server: {
		proxy: {
			'/api': 'http://localhost:3000',
		},
	},
});

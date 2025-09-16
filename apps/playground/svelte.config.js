import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: { adapter: adapter() },
  vitePlugin: { inspector: false }
};

export default config;

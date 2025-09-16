
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/a11y-keys" | "/i18n" | "/keep-route" | "/query-kit" | "/uploader-pro" | "/web3-wallets" | "/workerify";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/a11y-keys": Record<string, never>;
			"/i18n": Record<string, never>;
			"/keep-route": Record<string, never>;
			"/query-kit": Record<string, never>;
			"/uploader-pro": Record<string, never>;
			"/web3-wallets": Record<string, never>;
			"/workerify": Record<string, never>
		};
		Pathname(): "/" | "/a11y-keys" | "/a11y-keys/" | "/i18n" | "/i18n/" | "/keep-route" | "/keep-route/" | "/query-kit" | "/query-kit/" | "/uploader-pro" | "/uploader-pro/" | "/web3-wallets" | "/web3-wallets/" | "/workerify" | "/workerify/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/i18n/en.json" | "/i18n/manifest.json" | "/i18n/zh-CN.json" | string & {};
	}
}
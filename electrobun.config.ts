import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "MDPOWER",
		identifier: "mdpower.electrobun.dev",
		version: "1.0.4",
	},
	build: {
		copy: {
			"dist/index.html": "views/mainview/index.html",
			"dist/assets": "views/mainview/assets",
		},
		watchIgnore: ["dist/**", "build/**", "node_modules/**", ".git/**", "artifacts/**"],
		mac: {
			bundleCEF: false,
			icons: "src/assets/icon.iconset",
		},
		linux: {
			bundleCEF: false,
			icon: "src/assets/icon.png",
		},
		win: {
			bundleCEF: false,
			icon: "src/assets/icon.png",
		},
	},
} satisfies ElectrobunConfig;

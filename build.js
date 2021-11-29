const builder = require('electron-builder');

builder.build({
	config: {
		appId: 'local.markdownEditor',
		productName: 'Markdown Editor',
		copyright: 'Copyright © 2021 Tomoaki Takahashi',
		files: [
			'./build/icon.*',
			'./index.html', 
			'./main.js',
			'./preload.js',
			'./renderer.js',
			'./styles.css',
			'!node_modules/highlight.js/*.md',
			'!node_modules/highlight.js/scss',
			'!node_modules/highlight.js/styles',
			'./node_modules/highlight.js/styles/atom-one-dark.css',
			'./node_modules/highlight.js/styles/atom-one-light.css',
			'./node_modules/highlight.js/styles/dark.css',
			'./node_modules/highlight.js/styles/default.css',
			'./node_modules/highlight.js/styles/github-dark.css',
			'./node_modules/highlight.js/styles/github.css',
			'./node_modules/highlight.js/styles/stackoverflow-dark.css',
			'./node_modules/highlight.js/styles/stackoverflow-light.css',
			'./node_modules/highlight.js/styles/vs.css',
			'./node_modules/highlight.js/styles/vs2015.css',
			'./node_modules/highlight.js/styles/xcode.css',
			'!node_modules/highlight.js/es',
			'!node_modules/marked/*.md',
			'!node_modules/marked/src',
			'!node_modules/marked/man',
		],
		extraResources: [
			{
				from: './resources/extra',
				to: 'extra',
			},
		],
		win: {
			target: {
				target: 'zip',
				arch: ['x64']
			}
		}
	}
})
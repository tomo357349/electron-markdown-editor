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
			'!node_modules',
			'./node_modules/ace-builds/src-noconflict/ace.js',
			'./node_modules/ace-builds/src-noconflict/mode-markdown.js',
			'./node_modules/ace-builds/src-noconflict/theme-chrome.js',
			'./node_modules/ace-builds/src-noconflict/theme-github.js',
			'./node_modules/ace-builds/src-noconflict/theme-one_dark.js',
			'./node_modules/ace-builds/src-noconflict/theme-monokai.js',
			'./node_modules/d3/dist/d3.min.js',
			'./node_modules/highlight.js/package.json',
			'./node_modules/highlight.js/lib/index.js',
			'./node_modules/highlight.js/lib/common.js',
			'./node_modules/highlight.js/lib/core.js',
			'./node_modules/highlight.js/lib/languages/*.js',
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
			'./node_modules/katex/package.json',
			'./node_modules/katex/dist/katex.css',
			'./node_modules/katex/dist/katex.js',
			'./node_modules/katex/dist/katex.js',
			'./node_modules/katex/dist/fonts/KaTeX_Main-Bold.woff',
			'./node_modules/katex/dist/fonts/KaTeX_Main-BoldItalic.woff',
			'./node_modules/katex/dist/fonts/KaTeX_Main-Italic.woff',
			'./node_modules/katex/dist/fonts/KaTeX_Main-Regular.woff',
			'./node_modules/latex.js/dist/css/base.css',
			'./node_modules/latex.js/dist/latex.js',
			'./node_modules/latex.js/dist/js/base.js',
			'./node_modules/marked/package.json',
			'./node_modules/marked/lib/marked.cjs',
			'./node_modules/mermaid/dist/mermaid.min.js',
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
		},
		mac: {
			target: {
				target: 'default'
			}
		}
	}
});
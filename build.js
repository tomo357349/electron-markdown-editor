const builder = require('electron-builder');

builder.build({
	config: {
		appId: 'local.quickStart',
		extraResources: [
			'rsrc/'
		],
		win: {
			target: {
				target: 'zip',
				arch: ['x64']
			}
		}
	}
})
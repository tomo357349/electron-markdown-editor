// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
const editor = document.querySelector('#editor');
// const editor = document.querySelector('#editor-contents');

window.api.send("toMain", "some data");

window.api.receive('log', (data) => {
	console.log(`Received log:${data} from main process`);
});

window.api.receive('open-file', (data) => {
	console.log(`Received open-file:${data.path} from main process`);
	document.title = data.name +' - Markdown Editor';
	document.querySelector('#editor').innerHTML = data.contents;
	refleshViewer(data.contents, true);

	addToast({
		message: 'open: ' + data.name
	});
});

window.api.receive('save-file', (data) => {
	const txt = editor.value;
	window.api.send('file-save', {
		path: data.path,
		name: data.name,
		contents: txt
	});
});

window.api.receive('show-toast', (data) => {
	addToast(data);
});

window.api.receive('change-theme', (data) => {
	console.log(`Received change-theme:${data} from main process`);
	document.body.classList[data === 'dark' ? 'add' : 'remove']('dark');
});

window.api.receive('toggle-renderer', (data) => {
	document.querySelector('#' + data.target).classList[data.toggle ? 'add' : 'remove']('flaged');
});

let markedhtml;
function refleshViewer(txt, reset) {
	markedhtml = marked(txt, {
		toc: false, 
		todo: false
	});

	const viewer = document.querySelector('#viewer');
	const lastScrollTop = viewer.scrollTop;
	viewer.innerHTML = markedhtml;

	hljs.highlightAll();
	// document.querySelectorAll('pre code').forEach((el) => {
	// 	hljs.highlightElement(el);
	// });

	if (reset) {
		setTimeout(() => {
			viewer.scrollTo({
				top: 0,
				left: 0
			});
		});
	}
	// setTimeout(() => {
	// 	if (viewer.clientHeight < lastScrollTop) return;

	// 	viewer.scrollTo({
	// 		left: 0,
	// 		top: lastScrollTop
	// 	});
	// }, 500);
}

// const quill = new Quill('#editor-quill', {
// 	modules: {
// 		syntax: true,
// 		toolbar: [ ]
// 	},
// 	theme: 'snow' // or bubble
// });

let waitChangeHndl;
editor.addEventListener('keyup', () => {
// quill.on('text-change', (delta, old, src) => {
 	if (waitChangeHndl) clearTimeout(waitChangeHndl);

	waitChangeHndl = setTimeout(() => {
		const txt = editor.value;
		// const txt = editor.innerHTML;
		// const txt = quill.getText();
		refleshViewer(txt || '');
	}, 1500);
});

function addToast(data) {
	if (!data || !data.message) return;

	const toast = document.createElement('div');
	toast.className = 'toast';
	if (toast.type) toast.classList.add(toast.type);
	const toastHeader = document.createElement('div');
	toastHeader.className = 'toast-header';
	toastHeader.appendChild(document.createTextNode(new Date().toISOString()));
	toast.appendChild(toastHeader);
	const toastContents = document.createElement('div');
	toastContents.className = 'toast-contents';
	toastContents.appendChild(document.createTextNode(data.message));
	toast.appendChild(toastContents);
	toast.addEventListener('click', removeToast);
	document.querySelector(".toast-backdrop").appendChild(toast);
	setTimeout(() => {
		toast.classList.add('pop');
	}, 100);

	let timehndl = setTimeout(() => {
		if (timehndl) timehndl = null;
		removeToast();
	}, 5000);

	function removeToast() {
		toast.remove();
		if (timehndl) {
			clearTimeout(timehndl);
			timehndl = null;
		}
	}
}
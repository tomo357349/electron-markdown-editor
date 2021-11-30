const editor = document.querySelector('#editor');
const viewer = document.querySelector('#viewer');

setTimeout(() => {
	if (editor) editor.focus();
}, 100);

(function() {
	if (!window.api.viewcss) return;
	var link = document.createElement('link');
	link.href = window.api.viewcss;
	console.log(link.href, window.api.viewstyle);
	link.rel = 'stylesheet';
	link.type = 'text/css';
	document.getElementsByTagName('head')[0].appendChild(link);
})();

window.api.send("toMain", "some data");

window.api.receive('log', (data) => {
	console.log(`Received log:${data} from main process`);
});

window.api.receive('open-file', (data) => {
	console.log(`Received open-file:${data.path} from main process`);
	document.title = data.name +' - Markdown Editor';
	editor.innerHTML = data.contents;
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

window.api.receive('export-html', (data) => {
	const html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>' + data.name + '</title><style>' + (window.api.highlightstyle || '') + '\n' + (window.api.viewstyle || '') + '</style></head><body id="viewer">' + viewer.innerHTML + '</body></html>';
	window.api.send('file-save', {
		path: data.path,
		name: data.name,
		contents: html
	});
})
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

function refleshViewer(txt, reset) {
	const markedhtml = window.api.marked(txt, {
		toc: false, 
		todo: false
	});

	const lastScrollTop = viewer.scrollTop;
	viewer.innerHTML = markedhtml;

	window.api.hljs.highlightAll();
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

let waitChangeHndl;
editor.addEventListener('keyup', () => {
 	if (waitChangeHndl) clearTimeout(waitChangeHndl);

	waitChangeHndl = setTimeout(() => {
		const txt = editor.value;
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
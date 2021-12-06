const editor = document.querySelector('#editor');
const viewer = document.querySelector('#viewer');

const marked = window.api.marked;
const katex = window.api.katex;
// const d3 = window.api.d3;

setTimeout(() => {
	if (editor) editor.focus();
}, 100);

(function () {
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
	document.title = data.name + ' - Markdown Editor';
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
	const markedhtml = marked(txt, {
		toc: false,
		todo: false
	});

	const lastScrollTop = viewer.scrollTop;
	viewer.innerHTML = markedhtml;

	document.querySelectorAll('pre code.language-tex').forEach((el) => {
		try {
			const pre = el.parentElement;
/*
```tex
1+2+3+\cdots+10=\sum_{n=1}^{10}n
```
*/
			pre.innerHTML = katex.renderToString(el.innerText, {
				displayMode: true,
				throwOnError: false
			});
		} catch (err) {
			console.error(err);
		}
	});

	document.querySelectorAll('pre code.language-chart').forEach((el) => {
		try {
			const pre = el.parentElement;
			/*
```chart
{
	"type": "line",
	"width": 0,
	"height": 0,
	"margin": {
		"left": 20,
		"bottom": 20
	},
	"scale": {
		"x": "linear"
	},
	"data": [
		{ "id": 1, "label": "xxx", "value": 10 },
		{ "id": 2, "value": 8 },
		{ "id": 3, "value": 13 }
	]
}
```
			*/
			chart(pre, JSON.parse(el.innerText));
		} catch (err) {
			console.error(err);
		}
	});

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

/**
 * 
 * @param {HTMLElement} el 
 * @param {*} opts 
 */
function chart(el, opts) {
	opts = opts || {};
	opts.type = opts.type || 'line';
	opts.fields = opts.fields || {};
	const key = opts.fields.x = opts.fields.x || 'id';
	const value = opts.fields.y = opts.fields.y || 'value';
	opts.width = opts.width || 300;
	opts.height = opts.height || 300;
	opts.margin = opts.margin || {};
	opts.margin.left = opts.margin.left || 10;
	opts.margin.right = opts.margin.right || 10;
	opts.margin.top = opts.margin.top || 10;
	opts.margin.bottom = opts.margin.bottom || 10;
	opts.scale = opts.scale || {};
	opts.scale.x = opts.scale.x = opts.type === 'bar' ? 'band': 'linear';
	const data = opts.data || [];

	el.childNodes.forEach((c) => {
		c.remove();
	});
	const x = d3[opts.scale.x === 'band' ? 'scaleBand' : opts.scale.x === 'time' ? 'scaleTime' : 'scaleLinear']([0, opts.width]);
	const y = d3.scaleLinear([opts.height, 0]);

	const svg = d3.select(el).append('svg')
		.attr('width', opts.width + opts.margin.left + opts.margin.right)
		.attr('height', opts.height + opts.margin.top + opts.margin.bottom)
		.append('g')
		.attr('transform', 'translate(' + opts.margin.left + ',' + opts.margin.top + ')');

	// Scale the range of the data in the domains
	if (opts.scale.x === 'band') {
		x.domain(opts.data.map((d) => { return d[key]; }));
	} else {
		x.domain(d3.extent(opts.data, (d) => { return d[key]; }));
	}
	y.domain([0, d3.max(data, (d) => { return d[value]; })]);

	if (opts.type === 'bar') {
		// append the rectangles for the bar chart
		svg.selectAll('.chart-bar')
			.data(data)
			.enter().append('rect')
			.attr('class', 'chart-bar')
			.attr('fill', 'steelblue')
			.attr('x', function (d) { return x(d[key]); })
			.attr('width', x.bandwidth())
			.attr('y', function (d) { return y(d[value]); })
			.attr('height', function (d) { return opts.height - y(d.value); });
	} else if (opts.type === 'area') {
		var area = d3.area()
			.x(function(d) { return x(d[key]); })
			.y1(function(d) { return y(d[value]); });
		area.y0(y(0));
		svg.append('path')
			.datum(data)
			.attr('class', 'chart-area')
			.attr('fill', 'steelblue')
			.attr('d', area);
	} else {
		// append the paths for the line chart
		var line = d3.line()
			.x(function(d) { return x(d[key]); })
			.y(function(d) { return y(d[value]); });
		svg.append("path")
			.datum(data)
			.attr('class', 'chart-line')
			.attr("fill", "none")
			.attr("stroke", "steelblue")
			.attr("stroke-linejoin", "round")
			.attr("stroke-linecap", "round")
			.attr("stroke-width", 1.5)
			.attr("d", line);
	}

	// add the x Axis
	svg.append('g')
		.attr('transform', "translate(0," + opts.height + ")")
		.call(d3.axisBottom(x));

	// add the y Axis
	svg.append('g')
		.call(d3.axisLeft(y));
}
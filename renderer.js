const editor = document.querySelector('#editor');
const viewer = document.querySelector('#viewer');
const popup = document.querySelector('#drop');

const marked = window.api.marked;
const katex = window.api.katex;
// const d3 = window.api.d3;

mermaid.initialize({
	startOnLoad: false,
	theme: 'neutral', // forest, dark, neutral, default
	logLevel: 3,
	securityLevel: 'loose',
	flowchart: {
		// width: '100%',
		// curve: 'basis'
	},
	gantt: {
		// width: '100%',
		// barHeight: 20,
		// barGap: 4,
		axisFormat: '%m/%d' //'%H $W %m/%d/%Y'
	},
	sequence: {
		// width: '100%',
		// actorMargin: 50,
		// noteMargin: 10,
		// messageMargin: 35,
		// boxTextMargin: 5,
	},
});
mermaid.parseError = function (err, hash) {
	console.error(err);
	addToast({
		type: 'error',
		message: err
	});
};

const ace1 = ace.edit('editor');
ace1.setTheme('ace/theme/chrome'); // monokai xcode one_dark github eclipse
ace1.setOption('wrap', true);
ace1.setOption('wrapBehavioursEnabled', true);
ace1.setOption('wrapMethod', 'text');
ace1.setOption('indentedSoftWrap', false);
ace1.session.setMode('ace/mode/markdown');

setTimeout(() => {
	//	if (editor) editor.focus();
	ace1.focus();
}, 100);

(function () {
	if (!window.api.highlightcss) return;
	var link = document.createElement('link');
	link.href = window.api.highlightcss;
	console.log(link.href);
	link.rel = 'stylesheet';
	link.type = 'text/css';
	document.getElementsByTagName('head')[0].appendChild(link);
})();

(function () {
	if (!window.api.katexcss) return;
	var link = document.createElement('link');
	link.href = window.api.katexcss;
	console.log(link.href);
	link.rel = 'stylesheet';
	link.type = 'text/css';
	document.getElementsByTagName('head')[0].appendChild(link);
})();

// (function () {
// 	if (!window.api.latexcss) return;
// 	var link = document.createElement('link');
// 	link.href = window.api.latexcss;
// 	console.log(link.href);
// 	link.rel = 'stylesheet';
// 	link.type = 'text/css';
// 	document.getElementsByTagName('head')[0].appendChild(link);
// })();

(function () {
	if (!window.api.viewcss) return;
	var link = document.createElement('link');
	link.href = window.api.viewcss;
	console.log(link.href, window.api.viewstyle);
	link.rel = 'stylesheet';
	link.type = 'text/css';
	document.getElementsByTagName('head')[0].appendChild(link);
})();

window.api.receive('log', (data) => {
	console.log(`Received log:${data} from main process`);
});

window.api.receive('open-file', (data) => {
	console.log(`Received open-file:${data.path} from main process`);
	Object.keys(loadedimages).slice().forEach((k) => {
		delete loadedimages[k];
	});
	clearPopup();
	document.title = data.name + ' - Markdown Editor';
	// editor.value = data.contents;
	ace1.setValue(data.contents);
	refleshViewer(data.contents, true);

	addToast({
		message: 'open: ' + data.name
	});
});

window.api.receive('save-file', (data) => {
	// const txt = editor.value;
	const txt = ace1.getText();
	window.api.send('file-save', {
		path: data.path,
		name: data.name,
		contents: txt
	});
});

window.api.receive('export-html', (data) => {
	const html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>'
		+ data.name + '</title><style>'
		+ (window.api.highlightstyle || '') + '\n'
		+ (window.api.katexstyle || '') + '\n'
		// + (window.api.latexstyle || '') + '\n' 
		+ (window.api.viewstyle || '')
		+ '</style></head><body id="viewer">' + viewer.innerHTML + '</body></html>';
	window.api.send('file-save', {
		path: data.path,
		name: data.name,
		contents: html
	});
})
window.api.receive('show-toast', (data) => {
	addToast(data);
});

window.api.receive('change-theme', changeTheme);

window.api.receive('toggle-renderer', (data) => {
	document.querySelector('#' + data.target).classList[data.toggle ? 'add' : 'remove']('flaged');
});

const loadedimages = {};
window.api.receive('load-images', (data) => {
	const imgtags = [];
	data.files.forEach((f) => {
		imgtags.push('<img id="' + f.name + '">');
		toBase64Url(f.contents, (url) => {
			if (loadedimages[f.name]) {
				addToast({
					type: 'warn',
					message: 'overwrite: ' + f.name
				});
			} else {
				addToast({
					message: 'load: ' + f.name
				});
			}
			loadedimages[f.name] = url;
			if (imgtags.length === data.files.length) {
				const txt = ace1.getValue();
				refleshViewer(txt || '');
			}
		});
	});
	if (data.generateTag) {
		const pos = ace1.getCursorPosition();
		ace1.session.insert(pos, imgtags.join('\n'));
	}

	function toBase64Url(uint8arr, callback) {
		const reader = new FileReader()
		reader.onload = (() => {
			if (callback) callback(reader.result);
		});
		reader.readAsDataURL(new Blob([uint8arr]))
	}
});

window.api.receive('list-images', () => {
	clearPopup();
	popup.classList.remove('hidden');
	const tmpdict = {};
	document.querySelectorAll('img').forEach((el) => {
		if (!el.id) return;
		if (!loadedimages[el.id]) return;

		tmpdict[el.id] = { html: true };
	});
	Object.keys(loadedimages).forEach((k) => {
		tmpdict[k] = tmpdict[k] || {};
		tmpdict[k].load = loadedimages[k];
	});
	const sortedkeys = Object.keys(tmpdict).sort((a, b) => {
		if (a > b) return 1;
		else if (a < b) return -1;
		else return 0;
	});

	const closebtn = document.createElement('div');
	closebtn.className = 'close';
	closebtn.addEventListener('click', () => {
		clearPopup();
	});
	popup.appendChild(closebtn);
	const tab = document.createElement('table');
	popup.appendChild(tab);
	(() => {
		const tr = document.createElement('tr');
		const thid = document.createElement('th');
		thid.textContent = 'id';
		const thimg = document.createElement('th');
		thimg.textContent = 'image';
		const thhtml = document.createElement('th');
		thhtml.textContent = 'html';
		const thload = document.createElement('th');
		thload.textContent = 'loaded';
		tr.appendChild(thimg);
		tr.appendChild(thid);
		tr.appendChild(thhtml);
		tr.appendChild(thload);
		tab.appendChild(tr);
	})();
	sortedkeys.forEach((k) => {
		const tr = document.createElement('tr');
		const tdid = document.createElement('td');
		const spanid = document.createElement('span');
		spanid.className = 'anchor';
		spanid.addEventListener('click', () => {
			const pos = ace1.getCursorPosition();
			ace1.session.insert(pos, '<img id="' + k + '">');
		});
		spanid.textContent = k;
		tdid.appendChild(spanid);
		const tdimg = document.createElement('td');
		const img = document.createElement('img');
		img.src = tmpdict[k].load ? tmpdict[k].load : '#';
		tdimg.appendChild(img);
		const tdhtml = document.createElement('td');
		tdhtml.textContent = tmpdict[k].html ? '〇' : '　';
		const tdload = document.createElement('td');
		tdload.textContent = tmpdict[k].load ? '〇' : '　';
		tr.appendChild(tdimg);
		tr.appendChild(tdid);
		tr.appendChild(tdhtml);
		tr.appendChild(tdload);
		tab.appendChild(tr);
	});
});

window.api.receive('load-examples', (data) => {
	// editor.value = examples();
	ace1.setValue(examples());
	refleshViewer(examples(), true);
});

let waitChangeHndl;
// editor.addEventListener('keyup', () => {
ace1.session.on('change', (delta) => {
	if (waitChangeHndl) clearTimeout(waitChangeHndl);

	waitChangeHndl = setTimeout(() => {
		// const txt = editor.value;
		const txt = ace1.getValue();
		refleshViewer(txt || '');
	}, 1500);
});

setTimeout(() => {
	if (window.api.config.mode === 'dark') {
		window.api.send('theme-change', window.api.config.mode);
	}
}, 500);

function clearPopup() {
	popup.classList.add('hidden');
	popup.childNodes.forEach((el) => {
		popup.removeChild(el);
	});
}

function refleshViewer(txt, reset) {
	const markedhtml = marked(txt, {
		toc: false,
		todo: false
	});

	const lastScrollTop = viewer.scrollTop;
	viewer.innerHTML = markedhtml;

	document.querySelectorAll('img').forEach((el) => {
		if (!el.id) return;
		if (!loadedimages[el.id]) return;

		el.src = loadedimages[el.id];
	});

	// mermaid.init(undefined, document.querySelectorAll('pre code.language-uml'));
	document.querySelectorAll('pre code.language-uml').forEach((el, i) => {
		var pel = el.parentNode;
		mermaid.mermaidAPI.render('mermaid-dummy-' + i, el.innerText, function (svg, bind) {
			pel.innerHTML = svg;
			// bind(pel);
		}, pel);
	});

	document.querySelectorAll('pre code.language-latex').forEach((el) => {

		try {
			const pre = el.parentElement;

			let text = el.textContent || '';
			if (text.indexOf('\\begin{document}') < 0) {
				const lastpkgpos = text.lastIndexOf('\\usepackage{');
				let pos = 0;
				if (lastpkgpos >= 0) {
					pos = text.indexOf('\n', lastpkgpos) + 1;
				}
				text = text.substring(0, pos) + '\\begin{document}' + text.substring(pos) + '\\end{document}'
			}
			if (text.indexOf('\\documentclass{') < 0) {
				text = '\\documentclass{book}\n' + text;
			}
			const latexgen = new latexjs.HtmlGenerator({ hyphenate: false });
			const latexdoc = latexjs.parse(text, { generator: latexgen });
			// document.head.appendChild(latexdoc.stylesAndScripts("https://cdn.jsdelivr.net/npm/latex.js@0.12.4/dist/"))
			// document.head.appendChild(latexdoc.stylesAndScripts(''));
			pre.replaceWith(latexdoc.domFragment());

		} catch (err) {
			console.error(err);
			addToast({
				type: 'error',
				message: err.message
			});
		}
	});
	document.querySelectorAll('code:not(.hljs)').forEach((el) => {
		var src = el.innerText;
		if (src.indexOf('tex$') === 0) {
			src = src.substring('tex$'.length);
			el.innerHTML = katex.renderToString(src, {
				displayMode: false,
				strict: false,
				throwOnError: false
			});
		}
	});
	document.querySelectorAll('pre code.language-katex').forEach((el) => {
		try {
			const pre = el.parentElement;
			/*
			```katex
			1+2+3+\cdots+10=\sum_{n=1}^{10}n
			```
			*/
			pre.innerHTML = katex.renderToString(el.innerText, {
				displayMode: true,
				strict: false,
				throwOnError: false
			});
		} catch (err) {
			console.error(err);
			addToast({
				type: 'error',
				message: err.message
			});
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

	document.querySelectorAll('pre code.language-tree').forEach((el) => {
		try {
			const pre = el.parentElement;
			drawTree(pre, JSON.parse(el.innerText));
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

function changeTheme(data) {
	console.log(`Received change-theme:${data} from main process`);
	document.body.classList[data === 'dark' ? 'add' : 'remove']('dark');
	ace1.setTheme(data === 'dark' ? 'ace/theme/monokai' : 'ace/theme/chrome');
}

function addToast(data) {
	if (!data || !data.message) return;

	const toast = document.createElement('div');
	toast.className = 'toast';
	if (data.type) toast.classList.add(data.type);
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
	opts.domains = opts.domains || [];
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
	opts.scale.x = opts.scale.x = opts.type === 'bar' ? 'band' : 'linear';
	opts.scale.y = opts.scale.y || {};
	const data = opts.data || [];

	el.childNodes.forEach((c) => {
		c.remove();
	});

	const defcolors = d3.schemeSpectral[(opts.domains.length < 3) ? 3 : opts.domains.length];
	if (opts.type === 'donut') {
		const chart = DonutChart(data, {
			name: function (d) { return d.id; },
			value: function (d) { return d.value || 0; },
			colors: data.map(function (d, i) { return d.color || defcolors[i]; }),
			width: opts.width,
			height: opts.height
		});
		d3.select(el).node().appendChild(chart);
		return;
	} else if (opts.type === 'stacked-bar') {
		const chart = StackedBarChart(data, {
			x: function (d) { return d.id; },
			y: function (d) { return d.value || 0; },
			z: function (d) { return d.domain; },
			// xDomain: d3.groupSort(data, D => d3.sum(D, d => -d.value), d => d.id),
			yLabel: opts.scale.y.label || '',
			zDomain: opts.domains.map(function (d) { return (typeof d === 'object') ? d.name : '' + d; }),
			colors: opts.domains.map(function (d, i) { return d.color || defcolors[i]; }),
			width: opts.width,
			height: opts.height
		});
		d3.select(el).node().appendChild(chart);
		return;
	} else if (opts.type === 'stacked-area') {
		// https://observablehq.com/@d3/stacked-area-chart?collection=@d3/charts
		const chart = StackedAreaChart(data, {
			x: function (d) { return d.id; },
			y: function (d) { return d.value || 0; },
			z: function (d) { return d.domain; },
			yLabel: opts.scale.y.label || '',
			colors: opts.domains.map(function (d, i) { return d.color || defcolors[i]; }),
			width: opts.width,
			height: opts.height
		});
		d3.select(el).node().appendChild(chart);
		return;
	} else if (opts.type === 'slope') {
		const chart = SlopeChart(data, {
			x: function (d) { return d.id; },
			y: function (d) { return d.value || 0; },
			z: function (d) { return d.domain; },
			stroke: function (d, i) { return opts.domains[i].color || defcolors[i]; },
			width: opts.width,
			height: opts.height
		});
		d3.select(el).node().appendChild(chart);
		return;
	} else if (opts.type === 'tree') {
		const chart = TreeChart(data, {
			label: d => d.name,
			title: (d, n) => `${n.ancestors().reverse().map(d => d.data.name).join(".")}`, // hover text
			link: (d, n) => null, // `https://github.com/prefuse/Flare/${n.children ? "tree" : "blob"}/master/flare/src/${n.ancestors().reverse().map(d => d.data.name).join("/")}${n.children ? "" : ".as"}`,
			width: opts.width
		  
		});
		d3.select(el).node().appendChild(chart);
		return;
	}

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
			.x(function (d) { return x(d[key]); })
			.y1(function (d) { return y(d[value]); });
		area.y0(y(0));
		svg.append('path')
			.datum(data)
			.attr('class', 'chart-area')
			.attr('fill', 'steelblue')
			.attr('d', area);
	} else {
		// append the paths for the line chart
		var line = d3.line()
			.x(function (d) { return x(d[key]); })
			.y(function (d) { return y(d[value]); });
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


function drawTree(el, json) {
	json = json || {};
	let data = json.data || [];
	let opts = json.opts || {};
	opts.rect = opts.rect || {
		w: 80,
		h: 20
	};
	opts.space = opts.space || {
		pad: 20,
		w: 100,
		h: 30
	};
	/* opts
	{
		raw: true,
		w: 0,
		h: 0,
		rect: {
			w: 80,
			h: 20
		},
		space: {
			pad: 20,
			w: 100,
			h: 30
		}
	}*/

	/* data
	{
		"(root)": {
			"opt": {},
			"usr": {
				"bin": {},
				"lib@mark": {
					"cron": {},
					"zsh": {}
				},
				"local": {
					"bin": {}
				},
				"sbin": {}
			}
		}
	};*/

	/*
	var data = {
		name: "(root)",
		children: [
			{
				name: "opt"
			},
			{
				name: "usr",
				children: [
					{
						name: "bin"
					},
					{
						name: "lib",
						class: "mark",
						children: [
							{ name: "cron" }, { name: "zsh" }
						]
					},
					{
						name: "local",
						children: [
							{ name: "bin" }
						]
					},
					{
						name: "sbin"
					},
				],
			}
		]
	};*/

	const svg = d3.select(el.parentNode).append('svg');
	// .append('g')
	// .attr('transform', 'translate(' + opts.margin.left + ',' + opts.margin.top + ')');
	el.parentNode.replaceChild(svg.node(), el);

	if (!opts.raw) data = convertRawData(data)[0];

	var root = d3.hierarchy(data);
	var tree = d3.tree();
	tree(root);
	root.count();

	var height = opts.h || (root.value * opts.rect.h +
		(root.value - 1) * (opts.space.h - opts.rect.h) +
		opts.space.pad * 2);
	var width = opts.w || ((root.height + 1) * opts.rect.w +
		root.height * (opts.space.w - opts.rect.w) +
		opts.space.pad * 2);

	svg.attr('width', width).attr('height', height);

	function convertRawData(raw) {
		if (!raw) return;

		return Object.keys(raw).map(function (k) {
			var token = k.split('@');
			var o = {
				name: token[0],
				class: token[1]
			};
			var children = convertRawData(raw[k]);
			if (children && children.length) o.children = children;
			return o;
		});
	}

	function seekParent(d, name) {
		var siblings = d.parent.children;
		var target = siblings.find(function (d) {
			return d.data.name == name;
		});
		return target ? { name: name, hierarchy: siblings } : seekParent(d.parent, name);
	}

	function calcLeaves(names, d) {
		var eachHierarchies = names.map(function (name) {
			return seekParent(d, name)
		});
		var eachIdxes = eachHierarchies.map(function (item) {
			return item.hierarchy.findIndex(function (contents) {
				return contents.data.name == item.name;
			});
		});
		var filteredHierarchies = eachHierarchies.map(function (item, idx) {
			return item.hierarchy.slice(0, eachIdxes[idx]);
		});
		var values = filteredHierarchies.map(function (hierarchy) {
			return hierarchy.map(function (item) {
				return item.value;
			});
		});
		return values.flat();
	}

	function defineY(data, spc) {
		const ancestorValues = data.ancestors().map(function (item) {
			return item.data.name;
		});
		const leaves = calcLeaves(ancestorValues.slice(0, ancestorValues.length - 1), data);
		const sumLeaves = leaves.reduce(function (previous, current) {
			return previous + current;
		}, 0);
		return sumLeaves * spc.h + spc.pad;
	}

	function definePos(treeData, spc) {
		treeData.each(function (d) {
			d.x = d.depth * spc.w + spc.pad;
			d.y = defineY(d, spc);
		});
	}

	definePos(root, opts.space);

	var g = svg.append('g');

	g.selectAll('.d3tree-link')
		.data(root.descendants().slice(1))
		.enter()
		.append('path')
		.attr('class', 'd3tree-link')
		.attr('d', function (d) {
			var p = 'M' + d.x + ',' + d.y + 'L' + (d.parent.x + opts.rect.w + (opts.space.w - opts.rect.w) / 2) + ',' + (d.y) + ' ' + (d.parent.x + opts.rect.w + (opts.space.w - opts.rect.w) / 2) + ',' + (d.parent.y) + ' ' + (d.parent.x + opts.rect.w) + ',' + d.parent.y;
			return p;
			//	.replace(/\r?\n/g, '')
			//	.replace(/\s+/g, ' ');
		})
		.attr('transform', function (d) {
			return 'translate(0, ' + (opts.rect.h / 2) + ')';
		});

	g.selectAll('.d3tree-node')
		.data(root.descendants())
		.enter()
		.append('g')
		.attr('class', function (d) {
			return (d.data.class ? d.data.class + ' ' : '') + 'd3tree-node';
		})
		.attr('transform', function (d) {
			return 'translate(' + d.x + ', ' + d.y + ')';
		})
		.call(function (me) {
			me.append('rect')
				.attr('width', opts.rect.w)
				.attr('height', opts.rect.h);
		})
		.call(function (me) {
			me.append('text')
				.text(function (d) {
					return d.data.name;
				})
				.attr('transform', 'translate(5, 15)');
		});
}

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/stacked-bar-chart
function StackedBarChart(data, {
	x = (d, i) => i, // given d in data, returns the (ordinal) x-value
	y = d => d, // given d in data, returns the (quantitative) y-value
	z = () => 1, // given d in data, returns the (categorical) z-value
	title, // given d in data, returns the title text
	marginTop = 30, // top margin, in pixels
	marginRight = 0, // right margin, in pixels
	marginBottom = 30, // bottom margin, in pixels
	marginLeft = 40, // left margin, in pixels
	width = 640, // outer width, in pixels
	height = 400, // outer height, in pixels
	xDomain, // array of x-values
	xRange = [marginLeft, width - marginRight], // [left, right]
	xPadding = 0.1, // amount of x-range to reserve to separate bars
	yType = d3.scaleLinear, // type of y-scale
	yDomain, // [ymin, ymax]
	yRange = [height - marginBottom, marginTop], // [bottom, top]
	zDomain, // array of z-values
	offset = d3.stackOffsetDiverging, // stack offset method
	order = d3.stackOrderNone, // stack order method
	yFormat, // a format specifier string for the y-axis
	yLabel, // a label for the y-axis
	colors = d3.schemeTableau10, // array of colors
} = {}) {
	// Compute values.
	const X = d3.map(data, x);
	const Y = d3.map(data, y);
	const Z = d3.map(data, z);

	// Compute default x- and z-domains, and unique them.
	if (xDomain === undefined) xDomain = X;
	if (zDomain === undefined) zDomain = Z;
	xDomain = new d3.InternSet(xDomain);
	zDomain = new d3.InternSet(zDomain);

	// Omit any data not present in the x- and z-domains.
	const I = d3.range(X.length).filter(i => xDomain.has(X[i]) && zDomain.has(Z[i]));

	// Compute a nested array of series where each series is [[y1, y2], [y1, y2],
	// [y1, y2], …] representing the y-extent of each stacked rect. In addition,
	// each tuple has an i (index) property so that we can refer back to the
	// original data point (data[i]). This code assumes that there is only one
	// data point for a given unique x- and z-value.
	const series = d3.stack()
		.keys(zDomain)
		.value(([x, I], z) => Y[I.get(z)])
		.order(order)
		.offset(offset)
		(d3.rollup(I, ([i]) => i, i => X[i], i => Z[i]))
		.map(s => s.map(d => Object.assign(d, { i: d.data[1].get(s.key) })));

	// Compute the default y-domain. Note: diverging stacks can be negative.
	if (yDomain === undefined) yDomain = d3.extent(series.flat(2));

	// Construct scales, axes, and formats.
	const xScale = d3.scaleBand(xDomain, xRange).paddingInner(xPadding);
	const yScale = yType(yDomain, yRange);
	const color = d3.scaleOrdinal(zDomain, colors);
	const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
	const yAxis = d3.axisLeft(yScale).ticks(height / 60, yFormat);

	// Compute titles.
	if (title === undefined) {
		const formatValue = yScale.tickFormat(100, yFormat);
		title = i => `${X[i]}\n${Z[i]}\n${formatValue(Y[i])}`;
	} else {
		const O = d3.map(data, d => d);
		const T = title;
		title = i => T(O[i], i, data);
	}

	const svg = d3.create("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", [0, 0, width, height])
		.attr("style", "max-width: 100%; height: auto; height: intrinsic;");

	svg.append("g")
		.attr("transform", `translate(${marginLeft},0)`)
		.call(yAxis)
		.call(g => g.select(".domain").remove())
		.call(g => g.selectAll(".tick line").clone()
			.attr("x2", width - marginLeft - marginRight)
			.attr("stroke-opacity", 0.1))
		.call(g => g.append("text")
			.attr("x", -marginLeft)
			.attr("y", 10)
			.attr("fill", "currentColor")
			.attr("text-anchor", "start")
			.text(yLabel));

	const bar = svg.append("g")
		.selectAll("g")
		.data(series)
		.join("g")
		.attr("fill", ([{ i }]) => color(Z[i]))
		.selectAll("rect")
		.data(d => d)
		.join("rect")
		.attr("x", ({ i }) => xScale(X[i]))
		.attr("y", ([y1, y2]) => Math.min(yScale(y1), yScale(y2)))
		.attr("height", ([y1, y2]) => Math.abs(yScale(y1) - yScale(y2)))
		.attr("width", xScale.bandwidth());

	if (title) bar.append("title")
		.text(({ i }) => title(i));

	svg.append("g")
		.attr("transform", `translate(0,${yScale(0)})`)
		.call(xAxis);

	return Object.assign(svg.node(), { scales: { color } });
}

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/stacked-area-chart
function StackedAreaChart(data, {
	x = ([x]) => { return x; }, // given d in data, returns the (ordinal) x-value
	y = ([, y]) => { return y; }, // given d in data, returns the (quantitative) y-value
	z = () => 1, // given d in data, returns the (categorical) z-value
	marginTop = 20, // top margin, in pixels
	marginRight = 30, // right margin, in pixels
	marginBottom = 30, // bottom margin, in pixels
	marginLeft = 40, // left margin, in pixels
	width = 640, // outer width, in pixels
	height = 400, // outer height, in pixels
	xType = d3.scaleUtc, // type of x-scale
	xDomain, // [xmin, xmax]
	xRange = [marginLeft, width - marginRight], // [left, right]
	yType = d3.scaleLinear, // type of y-scale
	yDomain, // [ymin, ymax]
	yRange = [height - marginBottom, marginTop], // [bottom, top]
	zDomain, // array of z-values
	offset = d3.stackOffsetDiverging, // stack offset method
	order = d3.stackOrderNone, // stack order method
	xFormat, // a format specifier string for the x-axis
	yFormat, // a format specifier for the y-axis
	yLabel, // a label for the y-axis
	colors = d3.schemeTableau10, // array of colors for z
} = {}) {
	// Compute values.
	const X = d3.map(data, x);
	const Y = d3.map(data, y);
	const Z = d3.map(data, z);

	// Compute default x- and z-domains, and unique the z-domain.
	if (xDomain === undefined) xDomain = d3.extent(X);
	if (zDomain === undefined) zDomain = Z;
	zDomain = new d3.InternSet(zDomain);

	// Omit any data not present in the z-domain.
	const I = d3.range(X.length).filter(i => zDomain.has(Z[i]));

	// Compute a nested array of series where each series is [[y1, y2], [y1, y2],
	// [y1, y2], …] representing the y-extent of each stacked rect. In addition,
	// each tuple has an i (index) property so that we can refer back to the
	// original data point (data[i]). This code assumes that there is only one
	// data point for a given unique x- and z-value.
	const series = d3.stack()
		.keys(zDomain)
		.value(([x, I], z) => Y[I.get(z)])
		.order(order)
		.offset(offset)
		(d3.rollup(I, ([i]) => i, i => X[i], i => Z[i]))
		.map(s => s.map(d => Object.assign(d, { i: d.data[1].get(s.key) })));

	// Compute the default y-domain. Note: diverging stacks can be negative.
	if (yDomain === undefined) yDomain = d3.extent(series.flat(2));

	// Construct scales and axes.
	const xScale = xType(xDomain, xRange);
	const yScale = yType(yDomain, yRange);
	const color = d3.scaleOrdinal(zDomain, colors);
	const xAxis = d3.axisBottom(xScale).ticks(width / 80, xFormat).tickSizeOuter(0);
	const yAxis = d3.axisLeft(yScale).ticks(height / 50, yFormat);

	const area = d3.area()
		.x(({ i }) => xScale(X[i]))
		.y0(([y1]) => yScale(y1))
		.y1(([, y2]) => yScale(y2));

	const svg = d3.create("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", [0, 0, width, height])
		.attr("style", "max-width: 100%; height: auto; height: intrinsic;");

	svg.append("g")
		.attr("transform", `translate(${marginLeft},0)`)
		.call(yAxis)
		.call(g => g.select(".domain").remove())
		.call(g => g.selectAll(".tick line").clone()
			.attr("x2", width - marginLeft - marginRight)
			.attr("stroke-opacity", 0.1))
		.call(g => g.append("text")
			.attr("x", -marginLeft)
			.attr("y", 10)
			.attr("fill", "currentColor")
			.attr("text-anchor", "start")
			.text(yLabel));

	svg.append("g")
		.selectAll("path")
		.data(series)
		.join("path")
		.attr("fill", ([{ i }]) => color(Z[i]))
		.attr("d", area)
		.append("title")
		.text(([{ i }]) => Z[i]);

	svg.append("g")
		.attr("transform", `translate(0,${height - marginBottom})`)
		.call(xAxis);

	return Object.assign(svg.node(), { scales: { color } });
}

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/slope-chart
function SlopeChart(data, {
	x = ([x]) => x, // given d in data, returns a (ordinal) column name
	y = ([, y]) => y, // given d in data, returns a (quantitative) value
	z = () => 1, // given d in data, returns a (categorical) series name
	defined, // for gaps in data
	curve = d3.curveLinear, // method of interpolation between points; try d3.curveBumpX
	marginTop = 20, // top margin, in pixels
	marginRight = 30, // right margin, in pixels
	marginBottom = 20, // bottom margin, in pixels
	marginLeft = 30, // left margin, in pixels
	inset, // additional margins
	insetTop = inset === undefined ? 20 : inset, // separation between y-axis and top line
	insetBottom = inset === undefined ? 0 : inset, // additional bottom margin
	labelPadding = 3, // padding from the start or end of the line to label, in pixels
	labelSeparation = 10, // separation in pixels for avoiding label collisions 
	width = 640, // outer width, in pixels
	height = 400, // outer height, in pixels
	xDomain, // array of x-values
	xRange = [marginLeft, width - marginRight], // [left, right]
	xPadding = 0.5, // padding for the x-scale (for first and last column)
	yType = d3.scaleLinear, // type of y-scale
	yDomain, // [ymin, ymax]
	yRange = [height - marginBottom - insetBottom, marginTop + insetTop], // [bottom, top]
	yFormat, // a format for the value in the label
	zDomain, // array of z-values
	color = "currentColor", // alias for stroke
	stroke = color, // stroke color of line
	strokeLinecap, // stroke line cap of line
	strokeLinejoin, // stroke line join of line
	strokeWidth, // stroke width of line
	strokeOpacity, // stroke opacity of line
	mixBlendMode, // blend mode of lines
	halo = "#fff", // color of label halo 
	haloWidth = 4, // padding around the labels
} = {}) {
	// Compute values.
	const X = d3.map(data, x);
	const Y = d3.map(data, y);
	const Z = d3.map(data, z);
	if (defined === undefined) defined = (d, i) => !isNaN(Y[i]);
	const D = d3.map(data, defined);

	// Compute default domains, and unique the x- and z-domains.
	if (xDomain === undefined) xDomain = X;
	if (yDomain === undefined) yDomain = d3.extent(Y);
	if (zDomain === undefined) zDomain = Z;
	xDomain = new d3.InternSet(xDomain);
	zDomain = new d3.InternSet(zDomain);

	// Omit any data not present in the x- and z-domain.
	const I = d3.range(X.length).filter(i => xDomain.has(X[i]) && zDomain.has(Z[i]));

	// Construct scales, axes, and formats.
	const xScale = d3.scalePoint(xDomain, xRange).padding(xPadding);
	const yScale = yType(yDomain, yRange);
	const xAxis = d3.axisTop(xScale).tickSizeOuter(0);
	yFormat = yScale.tickFormat(100, yFormat);

	// Construct a line generator.
	const line = d3.line()
		.defined(i => D[i])
		.curve(curve)
		.x(i => xScale(X[i]))
		.y(i => yScale(Y[i]));

	const svg = d3.create("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", [0, 0, width, height])
		.attr("style", "max-width: 100%; height: auto; height: intrinsic;")
		.attr("font-family", "sans-serif")
		.attr("font-size", 10);

	svg.append("g")
		.attr("transform", `translate(0,${marginTop})`)
		.call(xAxis)
		.call(g => g.select(".domain").remove());

	svg.append("g")
		.attr("fill", "none")
		//.attr("stroke", stroke)
		.attr("stroke-linecap", strokeLinecap)
		.attr("stroke-linejoin", strokeLinejoin)
		.attr("stroke-width", strokeWidth)
		.attr("stroke-opacity", strokeOpacity)
		.selectAll("path")
		.data(d3.group(I, i => Z[i]))
		.join("path")
		.style("mix-blend-mode", mixBlendMode)
		.attr("stroke", stroke)
		.attr("d", ([, I]) => line(I));

	const Ix = d3.group(I, i => X[i]);

	// Iterates over each column, applying the dodge heuristic on inline labels.
	for (const [i, x] of [...xDomain].entries()) {
		const text = svg.append("g")
			.attr("text-anchor", i === 0 ? "end"
				: i === xDomain.size - 1 ? "start"
					: "middle")
			.selectAll("text")
			.data(Ix.get(x))
			.join("text")
			.attr("x", xScale(x))
			.call(dodgeAttr, "y", i => yScale(Y[i]), labelSeparation)
			.attr("dy", "0.35em")
			.attr("dx", i === 0 ? -1
				: i === xDomain.size - 1 ? 1
					: 0 * labelPadding)
			.text(i === 0 ? i => `${Z[i]} ${yFormat(Y[i])}`
				: i === xDomain.size - 1 ? i => `${yFormat(Y[i])} ${Z[i]}`
					: i => yFormat(Y[i]))
			.call(text => text.clone(true))
			.attr("fill", "none")
			.attr("stroke", halo)
			.attr("stroke-width", haloWidth);
	}

	// Sets the specified named attribution on the given selection to the given values,
	// after applying the dodge heuristic to those values to ensure separation. Note
	// that this assumes the selection is not nested (only a single group).
	function dodgeAttr(selection, name, value, separation) {
		const V = dodge(selection.data().map(value), separation);
		selection.attr(name, (_, i) => V[i]);
	}

	// Given an array of positions V, offsets positions to ensure the given separation.
	function dodge(V, separation, maxiter = 10, maxerror = 1e-1) {
		const n = V.length;
		if (!V.every(isFinite)) throw new Error("invalid position");
		if (!(n > 1)) return V;
		let I = d3.range(V.length);
		for (let iter = 0; iter < maxiter; ++iter) {
			I.sort((i, j) => d3.ascending(V[i], V[j]));
			let error = 0;
			for (let i = 1; i < n; ++i) {
				let delta = V[I[i]] - V[I[i - 1]];
				if (delta < separation) {
					delta = (separation - delta) / 2;
					error = Math.max(error, delta);
					V[I[i - 1]] -= delta;
					V[I[i]] += delta;
				}
			}
			if (error < maxerror) break;
		}
		return V;
	}

	return svg.node();
}

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/donut-chart
function DonutChart(data, {
	name = ([x]) => x,  // given d in data, returns the (ordinal) label
	value = ([, y]) => y, // given d in data, returns the (quantitative) value
	title, // given d in data, returns the title text
	width = 640, // outer width, in pixels
	height = 400, // outer height, in pixels
	innerRadius = Math.min(width, height) / 3, // inner radius of pie, in pixels (non-zero for donut)
	outerRadius = Math.min(width, height) / 2, // outer radius of pie, in pixels
	labelRadius = (innerRadius + outerRadius) / 2, // center radius of labels
	format = ",", // a format specifier for values (in the label)
	names, // array of names (the domain of the color scale)
	colors, // array of colors for names
	stroke = innerRadius > 0 ? "none" : "white", // stroke separating widths
	strokeWidth = 1, // width of stroke separating wedges
	strokeLinejoin = "round", // line join of stroke separating wedges
	padAngle = stroke === "none" ? 1 / outerRadius : 0, // angular separation between wedges
} = {}) {
	// Compute values.
	const N = d3.map(data, name);
	const V = d3.map(data, value);
	const I = d3.range(N.length).filter(i => !isNaN(V[i]));

	// Unique the names.
	if (names === undefined) names = N;
	names = new d3.InternSet(names);

	// Chose a default color scheme based on cardinality.
	if (colors === undefined) colors = d3.schemeSpectral[names.size];
	if (colors === undefined) colors = d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), names.size);

	// Construct scales.
	const color = d3.scaleOrdinal(names, colors);

	// Compute titles.
	if (title === undefined) {
		const formatValue = d3.format(format);
		title = i => `${N[i]}\n${formatValue(V[i])}`;
	} else {
		const O = d3.map(data, d => d);
		const T = title;
		title = i => T(O[i], i, data);
	}

	// Construct arcs.
	const arcs = d3.pie().padAngle(padAngle).sort(null).value(i => V[i])(I);
	const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
	const arcLabel = d3.arc().innerRadius(labelRadius).outerRadius(labelRadius);

	const svg = d3.create("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", [-width / 2, -height / 2, width, height])
		.attr("style", "max-width: 100%; height: auto; height: intrinsic;");

	svg.append("g")
		.attr("stroke", stroke)
		.attr("stroke-width", strokeWidth)
		.attr("stroke-linejoin", strokeLinejoin)
		.selectAll("path")
		.data(arcs)
		.join("path")
		.attr("fill", d => color(N[d.data]))
		.attr("d", arc)
		.append("title")
		.text(d => title(d.data));

	svg.append("g")
		.attr("font-family", "sans-serif")
		.attr("font-size", 10)
		.attr("text-anchor", "middle")
		.selectAll("text")
		.data(arcs)
		.join("text")
		.attr("transform", d => `translate(${arcLabel.centroid(d)})`)
		.selectAll("tspan")
		.data(d => {
			const lines = `${title(d.data)}`.split(/\n/);
			return (d.endAngle - d.startAngle) > 0.25 ? lines : lines.slice(0, 1);
		})
		.join("tspan")
		.attr("x", 0)
		.attr("y", (_, i) => `${i * 1.1}em`)
		.attr("font-weight", (_, i) => i ? null : "bold")
		.text(d => d);

	return Object.assign(svg.node(), { scales: { color } });
}

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/tree
function TreeChart(data, { // data is either tabular (array of objects) or hierarchy (nested objects)
	path, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
	id = Array.isArray(data) ? d => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
	parentId = Array.isArray(data) ? d => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
	children, // if hierarchical data, given a d in data, returns its children
	tree = d3.tree, // layout algorithm (typically d3.tree or d3.cluster)
	sort, // how to sort nodes prior to layout (e.g., (a, b) => d3.descending(a.height, b.height))
	label, // given a node d, returns the display name
	title, // given a node d, returns its hover text
	link, // given a node d, its link (if any)
	linkTarget = "_blank", // the target attribute for links (if any)
	width = 640, // outer width, in pixels
	height, // outer height, in pixels
	r = 3, // radius of nodes
	padding = 1, // horizontal padding for first and last column
	fill = "#999", // fill for nodes
	fillOpacity, // fill opacity for nodes
	stroke = "#555", // stroke for links
	strokeWidth = 1.5, // stroke width for links
	strokeOpacity = 0.4, // stroke opacity for links
	strokeLinejoin, // stroke line join for links
	strokeLinecap, // stroke line cap for links
	halo = "#fff", // color of label halo 
	haloWidth = 3, // padding around the labels
} = {}) {

	// If id and parentId options are specified, or the path option, use d3.stratify
	// to convert tabular data to a hierarchy; otherwise we assume that the data is
	// specified as an object {children} with nested objects (a.k.a. the “flare.json”
	// format), and use d3.hierarchy.
	const root = path != null ? d3.stratify().path(path)(data)
		: id != null || parentId != null ? d3.stratify().id(id).parentId(parentId)(data)
			: d3.hierarchy(data, children);

	// Sort the nodes.
	if (sort != null) root.sort(sort);

	// Compute labels and titles.
	const descendants = root.descendants();
	const L = label == null ? null : descendants.map(d => label(d.data, d));

	// Compute the layout.
	const dx = 10;
	const dy = width / (root.height + padding);
	tree().nodeSize([dx, dy])(root);

	// Center the tree.
	let x0 = Infinity;
	let x1 = -x0;
	root.each(d => {
		if (d.x > x1) x1 = d.x;
		if (d.x < x0) x0 = d.x;
	});

	// Compute the default height.
	if (height === undefined) height = x1 - x0 + dx * 2;

	const svg = d3.create("svg")
		.attr("viewBox", [-dy * padding / 2, x0 - dx, width, height])
		.attr("width", width)
		.attr("height", height)
		.attr("style", "max-width: 100%; height: auto; height: intrinsic;")
		.attr("font-family", "sans-serif")
		.attr("font-size", 10);

	svg.append("g")
		.attr("fill", "none")
		.attr("stroke", stroke)
		.attr("stroke-opacity", strokeOpacity)
		.attr("stroke-linecap", strokeLinecap)
		.attr("stroke-linejoin", strokeLinejoin)
		.attr("stroke-width", strokeWidth)
		.selectAll("path")
		.data(root.links())
		.join("path")
		.attr("d", d3.linkHorizontal()
			.x(d => d.y)
			.y(d => d.x));

	const node = svg.append("g")
		.selectAll("a")
		.data(root.descendants())
		.join("a")
		.attr("xlink:href", link == null ? null : d => link(d.data, d))
		.attr("target", link == null ? null : linkTarget)
		.attr("transform", d => `translate(${d.y},${d.x})`);

	node.append("circle")
		.attr("fill", d => d.children ? stroke : fill)
		.attr("r", r);

	if (title != null) node.append("title")
		.text(d => title(d.data, d));

	if (L) node.append("text")
		.attr("dy", "0.32em")
		.attr("x", d => d.children ? -6 : 6)
		.attr("text-anchor", d => d.children ? "end" : "start")
		.attr("paint-order", "stroke")
		.attr("stroke", halo)
		.attr("stroke-width", haloWidth)
		.text((d, i) => L[i]);

	return svg.node();
}

function examples() {
	return '# Head 1\n## Head 2\n### Head 3\n#### Head 4\nLorem _ipsum_ __dolor__ ~~sit~~ **amet**, [consectetur](https://www.google.com) adipiscing elit, do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n#This is not the header.\n\nTODO: Lorem ipsum\n\nNOTE: Lorem ipsum\n\nWARN: Lorem ipsum\n\n# Lists\n* unordered list item 1\n* item 2\n* item3\n\n1. ordered list item 1\n2. item 2\n3. item 3\n\n# Table\n|number|text|date|\n|--:|---|:-:|\n|1|aaa|21-1-1|\n|10|bb|2021-10-10|\n\n# Blockquote\nLorem ipsum dolor sit amet\n\n> Lorem ipsum dolor sit amet, consectetur adipiscing elit, do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nconsectetur adipiscing elit, do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n# Code\n\n```js\nvar x = 10;\nconsole.log(x);\n```\n\n```html\n<html>\n    <body class="sample">aaa</body>\n</html>\n```\n```css\nbody {\n  font-size: 16px;\n}\n\n.warn {\n  color: #f00;\n}\n```\n\n# Math\n```katex\n\\sum_{i=1}^{n} x_i\\\\\ny=2^x\n```\n\n```katex\nc = \\pm\\sqrt{a^2 + b^2}\n```\n\n#UML\n\n## flowchart\n\n```uml\ngraph LR\nA[Start] --> B{Decision}\nB -->|false| C[/Execute/]\nB -->|true| D[/Stop/]\n```\n\n```uml\ngraph TB\nStart --> Stop\n```\n\n## class diagram\n\n```uml\nclassDiagram\nclassA <|-- classB : implements\nclassC *-- classD : composition\nclassE o-- classF : association\nCustomer "1" --> "*" Ticket\n```\n\n## sequence diagram\n\n```uml\nsequenceDiagram\nAlice->>+John: Hello John, how are you?\nJohn-->>-Alice: Great!\n```\n\n## state diagram\n\n```uml\nstateDiagram\n[*] --> s1\ns1 --> s2: A transition\ns2 --> [*]\n```\n\n## gantt\n```uml\ngantt\ntitle A Gantt Diagram\ndateFormat YYYY-MM-DD\nsection Section\nA task:done, a1, 2020-01-01, 30d\nAnother task:after a1, 20d\nsection Section2\nTask in sec:crit, s2t1, 2020-01-12, 12d\nsecond task:active, 24d\n```\n\n## ER\n\n```uml\nerDiagram\nCUSTOMER ||--o{ ORDER : places\nORDER ||--|{ LINE-ITEM : contains\nCUSTOMER }|..|{ DELIVERY-ADDRESS : uses\n```\n\n# Charts\n\n```chart\n{\n  "type": "bar",\n  "width": 0,\n  "height": 0,\n  "margin": {\n    "left": 20,\n    "bottom": 20\n  },\n  "data": [\n    { "id": "item 1", "value": 10 },\n    { "id": "item 2", "value": 8 },\n    { "id": "item 3", "value": 13 }\n  ]\n}\n```\n\n```chart\n{\n  "type": "line",\n  "width": 0,\n  "height": 0,\n  "margin": {\n    "left": 20,\n    "bottom": 20\n  },\n  "scale": {\n    "x": "linear"\n  },\n  "data": [\n    { "id": 1, "value": 5 },\n    { "id": 5, "value": 8 },\n    { "id": 6, "value": 3 }\n  ]\n}\n```\n\n```chart\n{  "type": "donut",\n  "width": 0,\n  "height": 0,\n  "margin": {\n    "left": 20,\n    "bottom": 20\n  },\n  "data": [\n    { "id": "item 1", "value": 10, "color": "red" },\n    { "id": "item 2", "value": 8 },\n    { "id": "item 3", "value": 13 }\n  ]\n}\n```\n\n```chart\n{\n  "type": "stacked-bar",\n  "width": 0,\n  "height": 0,\n  "margin": {\n    "left": 20,\n    "bottom": 20\n  },\n  "domains": [\n    {"name": "x", "color": "red" },\n    {"name": "y" },\n    {"name": "z" }\n  ],\n  "data": [\n    { "id": "item 1", "domain": "x", "value": 10 },\n    { "id": "item 1", "domain": "y", "value": 1 },\n    { "id": "item 1", "domain": "z", "value": 5 },\n    { "id": "item 2", "domain": "x", "value": 8 },\n    { "id": "item 2", "domain": "y", "value": 3 },\n    { "id": "item 2", "domain": "z", "value": 2 },\n    { "id": "item 3", "domain": "x", "value": 13 },\n    { "id": "item 3", "domain": "y", "value": 6 },\n    { "id": "item 3", "domain": "z", "value": 1 }\n  ]\n}\n```\n\n```chart\n{\n  "type": "slope",\n  "width": 0,\n  "height": 0,\n  "margin": {\n    "left": 20,\n    "bottom": 20\n  },\n  "domains": [\n    {"name": "x", "color": "red" },\n    {"name": "y" },\n    {"name": "z" }\n  ],\n  "data": [\n    { "id": "2020", "domain": "x", "value": 10 },\n    { "id": "2020", "domain": "y", "value": 1 },\n    { "id": "2020", "domain": "z", "value": 5 },\n    { "id": "2021", "domain": "x", "value": 8 },\n    { "id": "2021", "domain": "y", "value": 3 },\n    { "id": "2021", "domain": "z", "value": 2 }\n  ]\n}\n```\n\n```chart\n{\n  "type": "tree",\n  "width": 0,\n  "height": 0,\n  "margin": {\n    "left": 20,\n    "bottom": 20\n  },\n  "data": {\n    "name": "root",\n    "children": [\n      { "name": "bin" },\n      { "name": "lib"},\n      { "name": "usr", "children": [\n        { "name": "bin" },\n        { "name": "local", "children": [\n          { "name": "bin" }\n        ]}\n      ]},\n      { "name": "opts", "children": [\n        { "name": "bin" }\n      ]}\n    ]\n  }\n}\n```\n\n```tree\n{\n  "opts": {\n    "space": {\n      "pad": 20,\n      "w": 100,\n      "h": 30\n    },\n    "rect": {\n      "w": 80,\n      "h": 20\n    }\n  },\n  "data": {\n    "(root)": {\n      "opt": {},\n      "usr": {\n        "bin": {},\n        "lib@mark": {\n          "cron": {},\n          "zsh": {}\n        },\n        "local": {\n          "bin": {}\n        },\n        "sbin": {}\n      }\n    }\n     }\n}\n```\n\n# Latex\n## Headers\n\n> ```latex\n> \\setcounter{secnumdepth}{3}\n> \\part{Part}\n> \\chapter{Chapter}\n> \\section{Section}\n> \\subsection{Sub Section}\n> \\subsubsection{Sub-sub Section}\n> \\chapter*{Chapter without numbering}\n> \\section*{Section without numbering}\n> ```\n\n## Characters\n```latex\n\\usepackage{comment}\n\\usepackage{textgreek,textcomp,gensymb,stix}\n\n\\begin{document}\n\\subsection*{Character}\nIt is possible to input any UTF-8 character either directly or by character code\nusing one of the following:\n\n\\begin{itemize}\n    \\item \\texttt{\\textbackslash symbol\\{"00A9\\}}: \\symbol{"00A9}\n    \\item \\verb|\\char"A9|: \\char"A9\n    \\item \\verb|^^A9 or ^^^^00A9|: ^^A9 or ^^^^00A9\n\\end{itemize}\n\\noindent\nSpecial characters, like those:\n\\begin{center}\n\\$ \\& \\% \\# \\_ \\{ \\} \\~{} \\^{} \\textbackslash\n\\end{center}\n\\noindent\nhave to be escaped.\n\nMore than 200 symbols are accessible through macros. For instance: 30\\,\\textcelsius{} is\n86\\,\\textdegree{}F. See also Section~\\ref{sec:symbols}.\n\n\\subsection*{Dashes and Hyphens}\n\n\\LaTeX\\ knows four kinds of dashes. \n\n\\begin{quote}\n    \\noindent\n    daughter-in-law, X-rated\\\\\n    pages 13--67\\\\\n    yes---or no? \\\\\n    $0$, $1$ and $-1$\n\\end{quote}\n\nThe names for these dashes are -:hyphen, --:en dash, ---: em dash, and $-$: minus sign \\dots\n\n\\subsection*{Text and Paragraphs, Ligatures}\n\nHowever, using \\verb+\\newline+ or \\verb|\\\\|,\\newline one can force \\\\\nto start a new line.\n\nLigatures are supported as well, for instance:\n\n\\begin{center}\nfi, fl, ff, ffi, ffl \\dots{} instead of f\\/i, f\\/l, f\\/f\\/l \\dots\n\\end{center}\n\nUse \\texttt{\\textbackslash\\slash} to prevent a ligature.\n\n\n\\subsection*{Symbols}\n\\label{sec:symbols}\n\n\\noindent\nlowercase greek letters:\n\\textalpha \\textbeta \\textgamma \\textdelta \\textepsilon \\textzeta \\texteta \\texttheta \\textiota \\textkappa\n\\textlambda \\textmu \\textnu \\textxi \\textomikron \\textpi \\textrho \\textsigma \\texttau \\textupsilon \\textphi \\textchi\n\\textpsi \\textomega\n\n\\noindent\nuppercase greek letters:\n\\textAlpha \\textBeta \\textGamma \\textDelta \\textEpsilon \\textZeta \\textEta \\textTheta \\textIota \\textKappa\n\\textLambda \\textMu \\textNu \\textXi \\textOmikron \\textPi \\textRho \\textSigma \\textTau \\textUpsilon \\textPhi \\textChi\n\\textPsi \\textOmega\n\n\\noindent\ncurrencies:\n\\texteuro \\textcent \\textsterling \\pounds \\textbaht \\textcolonmonetary \\textcurrency \\textdong \\textflorin \\textlira\n\\textnaira \\textpeso \\textwon \\textyen\n\n\\noindent\nold-style numerals:\n\\textzerooldstyle \\textoneoldstyle \\texttwooldstyle \\textthreeoldstyle \\textfouroldstyle \\textfiveoldstyle\n\\textsixoldstyle \\textsevenoldstyle \\texteightoldstyle \\textnineoldstyle\n\n\\noindent\nmath:\n\\textperthousand \\perthousand \\textpertenthousand \\textonehalf \\textthreequarters \\textonequarter\n\\textfractionsolidus \\textdiv \\texttimes \\textminus \\textpm \\textsurd \\textlnot \\textasteriskcentered\n\\textonesuperior \\texttwosuperior \\textthreesuperior\n\n\\noindent\narrows:\n\\textleftarrow \\textuparrow \\textrightarrow \\textdownarrow\n\n\\noindent\nmisc:\n\\checkmark \\textreferencemark \\textordfeminine \\textordmasculine \\textmarried \\textdivorced \\textbar \\textbardbl\n\\textbrokenbar \\textbigcircle \\textcopyright \\copyright \\textcircledP \\textregistered \\textservicemark\n\\texttrademark \\textnumero \\textrecipe \\textestimated \\textmusicalnote \\textdiscount\n\n\\noindent\nnon-ASCII:\n\\AE \\ae \\IJ \\ij \\OE \\oe \\TH \\th \\SS \\ss \\DH \\dh \\O \\o \\DJ \\dj \\L \\l \\i \\j \\NG \\ng\n\n\\noindent\n\\\\today: \\today\n\n\\subsection*{Mathematical Formulae}\n\nMath is typeset using KaTeX. Inline math:\n$\nf(x) = \\int_{-\\infty}^\\infty \\hat f(\\xi)\\,e^{2 \\pi i \\xi x} \\, d\\xi\n$\nas well as display math is supported:\n$$\nf(n) = \\begin{cases} \\frac{n}{2}, & \\text{if } n\\text{ is even} \\\\ 3n+1, & \\text{if } n\\text{ is odd} \\end{cases}\n$$\n\n\\end{document}\n```\n\n## Pictures\n\n```latex\n\\frame{\\setlength{\\unitlength}{20mm}\n\\begin{picture}(3,2.1)(-1.2,-0.05)\n    \\put(0,1){\\vector(1,0){1}}\n    \\put(0,1){\\circle{2}}\n    \\thicklines\n    \\put(0,0){\\line(1,0){1}}\n    \\put(0,.01){xxxxxxxxxxx}\n    \\put(0,.1){XXXX}\n\\end{picture}}\n%\n\\frame{\\setlength{\\unitlength}{1mm}\n\\begin{picture}(60, 50)\n    \\put(20,30){\\circle{1}}\n    \\put(20,30){\\circle{2}}\n    \\put(20,30){\\circle{4}}\n    \\put(20,30){\\circle{8}}\n    \\put(20,30){\\circle{16}}\n    \\put(20,30){\\circle{32}}\n    \\put(15,10){\\circle*{1}}\n    \\put(20,10){\\circle*{3}}\n    \\put(25,10){\\circle*{5}}\n\\end{picture}}\n\n\\frame{\\setlength{\\unitlength}{0.75mm}\n\\begin{picture}(60,40)\n    \\put(30,20){\\vector(1,0){30}}\n    \\put(30,20){\\vector(4,1){20}}\n    \\put(30,20){\\vector(3,1){25}}\n    \\put(30,20){\\vector(2,1){30}}\n    \\put(30,20){\\vector(1,2){10}}\n    \\thicklines\n    \\put(30,20){\\vector(-4,1){30}}\n    \\put(30,20){\\vector(-1,4){5}}\n    \\thinlines\n    \\put(30,20){\\vector(-1,-1){5}}\n    \\put(30,20){\\vector(-1,-4){5}}\n\\end{picture}}\n%\n\\setlength{\\unitlength}{5cm}\n\\begin{picture}(1,1)\n    \\put(0,0){\\line(0,1){1}}\n    \\put(0,0){\\line(1,0){1}}\n    \\put(0,0){\\line(1,1){1}}\n    \\put(0,0){\\line(1,2){.5}}\n    \\put(0,0){\\line(1,3){.3333}}\n    \\put(0,0){\\line(1,4){.25}}\n    \\put(0,0){\\line(1,5){.2}}\n    \\put(0,0){\\line(1,6){.1667}}\n    \\put(0,0){\\line(2,1){1}}\n    \\put(0,0){\\line(2,3){.6667}}\n    \\put(0,0){\\line(2,5){.4}}\n    \\put(0,0){\\line(3,1){1}}\n    \\put(0,0){\\line(3,2){1}}\n    \\put(0,0){\\line(3,4){.75}}\n    \\put(0,0){\\line(3,5){.6}}\n    \\put(0,0){\\line(4,1){1}}\n    \\put(0,0){\\line(4,3){1}}\n    \\put(0,0){\\line(4,5){.8}}\n    \\put(0,0){\\line(5,1){1}}\n    \\put(0,0){\\line(5,2){1}}\n    \\put(0,0){\\line(5,3){1}}\n    \\put(0,0){\\line(5,4){1}}\n    \\put(0,0){\\line(5,6){.8333}}\n    \\put(0,0){\\line(6,1){1}}\n    \\put(0,0){\\line(6,5){1}}\n\\end{picture}\n\n\n\\frame{\n    \\setlength{\\unitlength}{1cm}\n    \\begin{picture}(6,5)\n    \\thicklines\n    \\put(1,0.5){\\line(2,1){3}}\n    \\put(4,2){\\line(-2,1){2}}\n    \\put(2,3){\\line(-2,-5){1}}\n    \\put(0.7,0.3){$A$}\n    \\put(4.05,1.9){$B$}\n    \\put(1.7,2.9){$C$}\n    \\put(3.1,2.5){$a$}\n    \\put(1.3,1.7){$b$}\n    \\put(2.5,1){$c$}\n    \\put(0.3,4){$F=\\sqrt{s(s-a)(s-b)(s-c)}$}\n    \\put(3.5,0.4){$\\displaystyle s:=\\frac{a+b+c}{2}$}\n    \\end{picture}\n}\n\n\\setlength{\\unitlength}{2mm}\n\\begin{picture}(30,20)\n    \\linethickness{0.075mm}\n    \\multiput(0,0)(1,0){26}{\\line(0,1){20}}\n    \\multiput(0,0)(0,1){21}{\\line(1,0){25}}\n    \\linethickness{0.15mm}\n    \\multiput(0,0)(5,0){6}{\\line(0,1){20}}\n    \\multiput(0,0)(0,5){5}{\\line(1,0){25}}\n    \\linethickness{0.3mm}\n    \\multiput(5,0)(10,0){2}{\\line(0,1){20}}\n    \\multiput(0,5)(0,10){2}{\\line(1,0){25}}\n\\end{picture}\n\n\\setlength{\\unitlength}{0.7cm}\n\\begin{picture}(6,4)\n    \\linethickness{0.075mm}\n    \\multiput(0,0)(1,0){7}{\\line(0,1){4}}\n    \\multiput(0,0)(0,1){5}{\\line(1,0){6}}\n    \\thicklines\n    \\put(2,3){\\oval(3,1.8)}\n    \\thinlines\n    \\put(3,2){\\oval(3,1.8)}\n    \\thicklines\n    \\put(2,1){\\oval(3,1.8)[tl]}\n    \\put(4,1){\\oval(3,1.8)[b]}\n    \\put(4,3){\\oval(3,1.8)[r]}\n    \\put(3,1.5){\\oval(1.8,0.4)}\n\\end{picture}\n\n\\setlength{\\unitlength}{0.8cm}\n\\begin{picture}(6,4)\n    \\linethickness{0.075mm}\n    \\multiput(0,0)(1,0){7}{\\line(0,1){4}}\n    \\multiput(0,0)(0,1){5}{\\line(1,0){6}}\n    \\thicklines\n    \\put(0.5,0.5){\\line(1,5){0.5}}\n    \\put(1,3){\\line(4,1){2}}\n    \\qbezier(0.5,0.5)(1,3)(3,3.5)\n    \\thinlines\n    \\put(2.5,2){\\line(2,-1){3}}\n    \\put(5.5,0.5){\\line(-1,5){0.5}}\n    \\linethickness{1mm}\n    \\qbezier(2.5,2)(5.5,0.5)(5,3)\n    \\thinlines\n    \\qbezier(4,2)(4,3)(3,3)\n    \\qbezier(3,3)(2,3)(2,2)\n    \\qbezier(2,2)(2,1)(3,1)\n    \\qbezier(3,1)(4,1)(4,2)\n\\end{picture}\n\n\\end{document}\n```';
}
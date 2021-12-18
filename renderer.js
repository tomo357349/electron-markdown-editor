const editor = document.querySelector('#editor');
const viewer = document.querySelector('#viewer');
const popup = document.querySelector('#drop');

const marked = window.api.marked;
const katex = window.api.katex;
// const d3 = window.api.d3;

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

function examples() {
	return '# Head 1\n## Head 2\n### Head 3\n#### Head 4\nLorem _ipsum_ __dolor__ ~~sit~~ **amet**, [consectetur](https://www.google.com) adipiscing elit, do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n#This is not the header.\n\n# Lists\n* unordered list item 1\n* item 2\n* item3\n\n1. ordered list item 1\n2. item 2\n3. item 3\n\n# Table\n|number|text|date|\n|--:|---|:-:|\n|1|aaa|21-1-1|\n|10|bb|2021-10-10|\n\n# Blockquote\nLorem ipsum dolor sit amet\n\n> Lorem ipsum dolor sit amet, consectetur adipiscing elit, do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nconsectetur adipiscing elit, do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n# Code\n\n```js\nvar x = 10;\nconsole.log(x);\n```\n\n```html\n<html>\n    <body class="sample">aaa</body>\n</html>\n```\n```css\nbody {\n  font-size: 16px;\n}\n\n.warn {\n  color: #f00;\n}\n```\n\n# Math\n```katex\n\\sum_{i=1}^{n} x_i\\\\\ny=2^x\n```\n\n```katex\nc = \\pm\\sqrt{a^2 + b^2}\n```\n\n# Charts\n\n```chart\n{\n  "type": "bar",\n  "width": 0,\n  "height": 0,\n  "margin": {\n    "left": 20,\n    "bottom": 20\n  },\n  "data": [\n    { "id": "item 1", "value": 10 },\n    { "id": "item 2", "value": 8 },\n    { "id": "item 3", "value": 13 }\n  ]\n}\n```\n\n```chart\n{\n  "type": "line",\n  "width": 0,\n  "height": 0,\n  "margin": {\n    "left": 20,\n    "bottom": 20\n  },\n  "scale": {\n    "x": "linear"\n  },\n  "data": [\n    { "id": 1, "value": 5 },\n    { "id": 5, "value": 8 },\n    { "id": 6, "value": 3 }\n  ]\n}\n```\n\n```tree\n{\n  "opts": {\n    "space": {\n      "pad": 20,\n      "w": 100,\n      "h": 30\n    },\n    "rect": {\n      "w": 80,\n      "h": 20\n    }\n  },\n  "data": {\n    "(root)": {\n      "opt": {},\n      "usr": {\n        "bin": {},\n        "lib@mark": {\n          "cron": {},\n          "zsh": {}\n        },\n        "local": {\n          "bin": {}\n        },\n        "sbin": {}\n      }\n    }\n     }\n}\n```\n\n# Latex\n## Headers\n\n> ```latex\n> \\setcounter{secnumdepth}{3}\n> \\part{Part}\n> \\chapter{Chapter}\n> \\section{Section}\n> \\subsection{Sub Section}\n> \\subsubsection{Sub-sub Section}\n> \\chapter*{Chapter without numbering}\n> \\section*{Section without numbering}\n> ```\n\n## Characters\n```latex\n\\usepackage{comment}\n\\usepackage{textgreek,textcomp,gensymb,stix}\n\n\\begin{document}\n\\subsection*{Character}\nIt is possible to input any UTF-8 character either directly or by character code\nusing one of the following:\n\n\\begin{itemize}\n    \\item \\texttt{\\textbackslash symbol\\{"00A9\\}}: \\symbol{"00A9}\n    \\item \\verb|\\char"A9|: \\char"A9\n    \\item \\verb|^^A9 or ^^^^00A9|: ^^A9 or ^^^^00A9\n\\end{itemize}\n\\noindent\nSpecial characters, like those:\n\\begin{center}\n\\$ \\& \\% \\# \\_ \\{ \\} \\~{} \\^{} \\textbackslash\n\\end{center}\n\\noindent\nhave to be escaped.\n\nMore than 200 symbols are accessible through macros. For instance: 30\\,\\textcelsius{} is\n86\\,\\textdegree{}F. See also Section~\\ref{sec:symbols}.\n\n\\subsection*{Dashes and Hyphens}\n\n\\LaTeX\\ knows four kinds of dashes. \n\n\\begin{quote}\n    \\noindent\n    daughter-in-law, X-rated\\\\\n    pages 13--67\\\\\n    yes---or no? \\\\\n    $0$, $1$ and $-1$\n\\end{quote}\n\nThe names for these dashes are -:hyphen, --:en dash, ---: em dash, and $-$: minus sign \\dots\n\n\\subsection*{Text and Paragraphs, Ligatures}\n\nHowever, using \\verb+\\newline+ or \\verb|\\\\|,\\newline one can force \\\\\nto start a new line.\n\nLigatures are supported as well, for instance:\n\n\\begin{center}\nfi, fl, ff, ffi, ffl \\dots{} instead of f\\/i, f\\/l, f\\/f\\/l \\dots\n\\end{center}\n\nUse \\texttt{\\textbackslash\\slash} to prevent a ligature.\n\n\n\\subsection*{Symbols}\n\\label{sec:symbols}\n\n\\noindent\nlowercase greek letters:\n\\textalpha \\textbeta \\textgamma \\textdelta \\textepsilon \\textzeta \\texteta \\texttheta \\textiota \\textkappa\n\\textlambda \\textmu \\textnu \\textxi \\textomikron \\textpi \\textrho \\textsigma \\texttau \\textupsilon \\textphi \\textchi\n\\textpsi \\textomega\n\n\\noindent\nuppercase greek letters:\n\\textAlpha \\textBeta \\textGamma \\textDelta \\textEpsilon \\textZeta \\textEta \\textTheta \\textIota \\textKappa\n\\textLambda \\textMu \\textNu \\textXi \\textOmikron \\textPi \\textRho \\textSigma \\textTau \\textUpsilon \\textPhi \\textChi\n\\textPsi \\textOmega\n\n\\noindent\ncurrencies:\n\\texteuro \\textcent \\textsterling \\pounds \\textbaht \\textcolonmonetary \\textcurrency \\textdong \\textflorin \\textlira\n\\textnaira \\textpeso \\textwon \\textyen\n\n\\noindent\nold-style numerals:\n\\textzerooldstyle \\textoneoldstyle \\texttwooldstyle \\textthreeoldstyle \\textfouroldstyle \\textfiveoldstyle\n\\textsixoldstyle \\textsevenoldstyle \\texteightoldstyle \\textnineoldstyle\n\n\\noindent\nmath:\n\\textperthousand \\perthousand \\textpertenthousand \\textonehalf \\textthreequarters \\textonequarter\n\\textfractionsolidus \\textdiv \\texttimes \\textminus \\textpm \\textsurd \\textlnot \\textasteriskcentered\n\\textonesuperior \\texttwosuperior \\textthreesuperior\n\n\\noindent\narrows:\n\\textleftarrow \\textuparrow \\textrightarrow \\textdownarrow\n\n\\noindent\nmisc:\n\\checkmark \\textreferencemark \\textordfeminine \\textordmasculine \\textmarried \\textdivorced \\textbar \\textbardbl\n\\textbrokenbar \\textbigcircle \\textcopyright \\copyright \\textcircledP \\textregistered \\textservicemark\n\\texttrademark \\textnumero \\textrecipe \\textestimated \\textmusicalnote \\textdiscount\n\n\\noindent\nnon-ASCII:\n\\AE \\ae \\IJ \\ij \\OE \\oe \\TH \\th \\SS \\ss \\DH \\dh \\O \\o \\DJ \\dj \\L \\l \\i \\j \\NG \\ng\n\n\\noindent\n\\\\today: \\today\n\n\\subsection*{Mathematical Formulae}\n\nMath is typeset using KaTeX. Inline math:\n$\nf(x) = \\int_{-\\infty}^\\infty \\hat f(\\xi)\\,e^{2 \\pi i \\xi x} \\, d\\xi\n$\nas well as display math is supported:\n$$\nf(n) = \\begin{cases} \\frac{n}{2}, & \\text{if } n\\text{ is even} \\\\ 3n+1, & \\text{if } n\\text{ is odd} \\end{cases}\n$$\n\n\\end{document}\n```\n\n## Pictures\n\n```latex\n\\frame{\\setlength{\\unitlength}{20mm}\n\\begin{picture}(3,2.1)(-1.2,-0.05)\n    \\put(0,1){\\vector(1,0){1}}\n    \\put(0,1){\\circle{2}}\n    \\thicklines\n    \\put(0,0){\\line(1,0){1}}\n    \\put(0,.01){xxxxxxxxxxx}\n    \\put(0,.1){XXXX}\n\\end{picture}}\n%\n\\frame{\\setlength{\\unitlength}{1mm}\n\\begin{picture}(60, 50)\n    \\put(20,30){\\circle{1}}\n    \\put(20,30){\\circle{2}}\n    \\put(20,30){\\circle{4}}\n    \\put(20,30){\\circle{8}}\n    \\put(20,30){\\circle{16}}\n    \\put(20,30){\\circle{32}}\n    \\put(15,10){\\circle*{1}}\n    \\put(20,10){\\circle*{3}}\n    \\put(25,10){\\circle*{5}}\n\\end{picture}}\n\n\\frame{\\setlength{\\unitlength}{0.75mm}\n\\begin{picture}(60,40)\n    \\put(30,20){\\vector(1,0){30}}\n    \\put(30,20){\\vector(4,1){20}}\n    \\put(30,20){\\vector(3,1){25}}\n    \\put(30,20){\\vector(2,1){30}}\n    \\put(30,20){\\vector(1,2){10}}\n    \\thicklines\n    \\put(30,20){\\vector(-4,1){30}}\n    \\put(30,20){\\vector(-1,4){5}}\n    \\thinlines\n    \\put(30,20){\\vector(-1,-1){5}}\n    \\put(30,20){\\vector(-1,-4){5}}\n\\end{picture}}\n%\n\\setlength{\\unitlength}{5cm}\n\\begin{picture}(1,1)\n    \\put(0,0){\\line(0,1){1}}\n    \\put(0,0){\\line(1,0){1}}\n    \\put(0,0){\\line(1,1){1}}\n    \\put(0,0){\\line(1,2){.5}}\n    \\put(0,0){\\line(1,3){.3333}}\n    \\put(0,0){\\line(1,4){.25}}\n    \\put(0,0){\\line(1,5){.2}}\n    \\put(0,0){\\line(1,6){.1667}}\n    \\put(0,0){\\line(2,1){1}}\n    \\put(0,0){\\line(2,3){.6667}}\n    \\put(0,0){\\line(2,5){.4}}\n    \\put(0,0){\\line(3,1){1}}\n    \\put(0,0){\\line(3,2){1}}\n    \\put(0,0){\\line(3,4){.75}}\n    \\put(0,0){\\line(3,5){.6}}\n    \\put(0,0){\\line(4,1){1}}\n    \\put(0,0){\\line(4,3){1}}\n    \\put(0,0){\\line(4,5){.8}}\n    \\put(0,0){\\line(5,1){1}}\n    \\put(0,0){\\line(5,2){1}}\n    \\put(0,0){\\line(5,3){1}}\n    \\put(0,0){\\line(5,4){1}}\n    \\put(0,0){\\line(5,6){.8333}}\n    \\put(0,0){\\line(6,1){1}}\n    \\put(0,0){\\line(6,5){1}}\n\\end{picture}\n\n\n\\frame{\n    \\setlength{\\unitlength}{1cm}\n    \\begin{picture}(6,5)\n    \\thicklines\n    \\put(1,0.5){\\line(2,1){3}}\n    \\put(4,2){\\line(-2,1){2}}\n    \\put(2,3){\\line(-2,-5){1}}\n    \\put(0.7,0.3){$A$}\n    \\put(4.05,1.9){$B$}\n    \\put(1.7,2.9){$C$}\n    \\put(3.1,2.5){$a$}\n    \\put(1.3,1.7){$b$}\n    \\put(2.5,1){$c$}\n    \\put(0.3,4){$F=\\sqrt{s(s-a)(s-b)(s-c)}$}\n    \\put(3.5,0.4){$\\displaystyle s:=\\frac{a+b+c}{2}$}\n    \\end{picture}\n}\n\n\\setlength{\\unitlength}{2mm}\n\\begin{picture}(30,20)\n    \\linethickness{0.075mm}\n    \\multiput(0,0)(1,0){26}{\\line(0,1){20}}\n    \\multiput(0,0)(0,1){21}{\\line(1,0){25}}\n    \\linethickness{0.15mm}\n    \\multiput(0,0)(5,0){6}{\\line(0,1){20}}\n    \\multiput(0,0)(0,5){5}{\\line(1,0){25}}\n    \\linethickness{0.3mm}\n    \\multiput(5,0)(10,0){2}{\\line(0,1){20}}\n    \\multiput(0,5)(0,10){2}{\\line(1,0){25}}\n\\end{picture}\n\n\\setlength{\\unitlength}{0.7cm}\n\\begin{picture}(6,4)\n    \\linethickness{0.075mm}\n    \\multiput(0,0)(1,0){7}{\\line(0,1){4}}\n    \\multiput(0,0)(0,1){5}{\\line(1,0){6}}\n    \\thicklines\n    \\put(2,3){\\oval(3,1.8)}\n    \\thinlines\n    \\put(3,2){\\oval(3,1.8)}\n    \\thicklines\n    \\put(2,1){\\oval(3,1.8)[tl]}\n    \\put(4,1){\\oval(3,1.8)[b]}\n    \\put(4,3){\\oval(3,1.8)[r]}\n    \\put(3,1.5){\\oval(1.8,0.4)}\n\\end{picture}\n\n\\setlength{\\unitlength}{0.8cm}\n\\begin{picture}(6,4)\n    \\linethickness{0.075mm}\n    \\multiput(0,0)(1,0){7}{\\line(0,1){4}}\n    \\multiput(0,0)(0,1){5}{\\line(1,0){6}}\n    \\thicklines\n    \\put(0.5,0.5){\\line(1,5){0.5}}\n    \\put(1,3){\\line(4,1){2}}\n    \\qbezier(0.5,0.5)(1,3)(3,3.5)\n    \\thinlines\n    \\put(2.5,2){\\line(2,-1){3}}\n    \\put(5.5,0.5){\\line(-1,5){0.5}}\n    \\linethickness{1mm}\n    \\qbezier(2.5,2)(5.5,0.5)(5,3)\n    \\thinlines\n    \\qbezier(4,2)(4,3)(3,3)\n    \\qbezier(3,3)(2,3)(2,2)\n    \\qbezier(2,2)(2,1)(3,1)\n    \\qbezier(3,1)(4,1)(4,2)\n\\end{picture}\n\n\\end{document}\n```';
}
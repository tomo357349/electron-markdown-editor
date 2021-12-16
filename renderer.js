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
	const html = '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>' + data.name + '</title><style>' + (window.api.highlightstyle || '') + '\n' + (window.api.katexstyle || '') + '\n' + (window.api.viewstyle || '') + '</style></head><body id="viewer">' + viewer.innerHTML + '</body></html>';
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
				strict: false,
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
	return '# Head 1\n## Head 2\n### Head 3\n#### Head 4\nLorem _ipsum_ __dolor__ ~~sit~~ **amet**, [consectetur](https://www.google.com) adipiscing elit, do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n#This is not the header.\n\n# Lists\n* unordered list item 1\n* item 2\n* item3\n\n1. ordered list item 1\n2. item 2\n3. item 3\n\n# Table\n|number|text|date|\n|--:|---|:-:|\n|1|aaa|21-1-1|\n|10|bb|2021-10-10|\n\n# Blockquote\nLorem ipsum dolor sit amet\n\n> Lorem ipsum dolor sit amet, consectetur adipiscing elit, do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nconsectetur adipiscing elit, do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n# Code\n\n```js\nvar x = 10;\nconsole.log(x);\n```\n\n```html\n<html>\n    <body class="sample">aaa</body>\n</html>\n```\n```css\nbody {\n  font-size: 16px;\n}\n\n.warn {\n  color: #f00;\n}\n```\n\n# Math\n```tex\n\\sum_{i=1}^{n} x_i\\\\\ny=2^x\n```\n\n```tex\nc = \\pm\\sqrt{a^2 + b^2}\n```\n\n# Charts\n\n```chart\n{\n  "type": "bar",\n  "width": 0,\n  "height": 0,\n  "margin": {\n    "left": 20,\n    "bottom": 20\n  },\n  "data": [\n    { "id": "item 1", "value": 10 },\n    { "id": "item 2", "value": 8 },\n    { "id": "item 3", "value": 13 }\n  ]\n}\n```\n\n```chart\n{\n  "type": "line",\n  "width": 0,\n  "height": 0,\n  "margin": {\n    "left": 20,\n    "bottom": 20\n  },\n  "scale": {\n    "x": "linear"\n  },\n  "data": [\n    { "id": 1, "value": 5 },\n    { "id": 5, "value": 8 },\n    { "id": 6, "value": 3 }\n  ]\n}\n```\n\n```tree\n{\n  "opts": {\n    "space": {\n      "pad": 20,\n      "w": 100,\n      "h": 30\n    },\n    "rect": {\n      "w": 80,\n      "h": 20\n    }\n  },\n  "data": {\n    "(root)": {\n      "opt": {},\n      "usr": {\n        "bin": {},\n        "lib@mark": {\n          "cron": {},\n          "zsh": {}\n        },\n        "local": {\n          "bin": {}\n        },\n        "sbin": {}\n      }\n    }\n     }\n}\n```\n\n';
}
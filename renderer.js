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

window.api.receive('load-examples', (data) => {
	editor.value = examples();
	refleshViewer(examples(), true);
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
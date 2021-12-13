const fs = require('fs');
const path = require('path');
const { app, contextBridge, ipcRenderer } = require('electron');
const { marked } = require('marked');
const hljs = require('highlight.js/lib/common');
const katex = require('katex');
// const d3 = require('d3');

let highlightcss = null;
let highlightstyle = null;

let katexcss = null;
let katexstyle = null;

let config = {};
(() => {
  let filePath = path.join(process.resourcesPath, 'extra/config.json');
  if (fs.existsSync(filePath)) {
    config = JSON.parse('' + fs.readFileSync(filePath));
  }
  highlightcss = path.join(__dirname, config.highlightcss || './node_modules/highlight.js/styles/dark.css');
  katexcss = path.join(__dirname, config.katexcss || './node_modules/katex/dist/katex.css');
})();

let viewcss = null;
let viewstyle = null;
(() => {
  let filepath = path.join(process.resourcesPath, 'extra/view.css');
  if (fs.existsSync(filepath)) {
    viewcss = filepath;
    viewstyle = '' + fs.readFileSync(filepath);
  } else {
    filepath = './resources/extra/view.css';
    if (fs.existsSync(filepath)) {
      viewcss = filepath;
      viewstyle = '' + fs.readFileSync(filepath);
    } else {
      viewcss = null;
    }
  }
})();

if (fs.existsSync(highlightcss)) {
  highlightstyle = '' + fs.readFileSync(highlightcss);
} else {
  highlightcss = null;
}

if (fs.existsSync(katexcss)) {
  katexstyle = '' + fs.readFileSync(katexcss);
} else {
  katexcss = null;
}

contextBridge.exposeInMainWorld(
  'api', {
    config: config,
    marked: marked,
    hljs: hljs,
    katex: katex,
    // d3: d3,
    viewcss: viewcss,
    viewstyle: viewstyle,
    highlightcss: highlightcss,
    highlightstyle: highlightstyle,
    katexcss: katexcss,
    katexstyle: katexstyle,
    send: (channel, data) => {
      let validChannels = ['theme-change', 'file-save'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      } else {
        console.error('invalid channel', channel);
      }
    },
    receive: (channel, func) => {
      let validChannels = ['log', 'open-file', 'export-html', 'change-theme', 'save-file', 'toggle-renderer', 'show-toast', 'load-examples'];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      } else {
        console.error('invalid channel', channel);
      }
    }
  }
);

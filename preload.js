const path = require('path');
const { app, contextBridge, ipcRenderer } = require('electron');
const { marked } = require('marked');
const hljs = require('highlight.js/lib/common');
const fs = require('fs');

let viewcss = null;
let viewstyle = null;
(function () {
  let filepath = path.join(process.resourcesPath, 'extra/view.css')
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

let highlightcss = './node_modules/highlight.js/styles/dark.css';
let highlightstyle = null;
if (fs.existsSync(highlightcss)) {
  highlightstyle = '' + fs.readFileSync(highlightcss);
} else {
  highlightcss = null;
}

contextBridge.exposeInMainWorld(
  'api', {
    marked: marked,
    hljs: hljs,
    viewcss: viewcss,
    viewstyle: viewstyle,
    highlightstyle: highlightstyle,
    send: (channel, data) => {
      let validChannels = ["toMain", 'file-save'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      } else {
        console.error('invalid channel', channel);
      }
    },
    receive: (channel, func) => {
      let validChannels = ['log', 'open-file', 'export-html', 'change-theme', 'save-file', 'toggle-renderer', 'show-toast'];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      } else {
        console.error('invalid channel', channel);
      }
    }
  }
);

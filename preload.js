// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { app, contextBridge, ipcRenderer } = require('electron');

// window.addEventListener('DOMContentLoaded', () => {
//   const replaceText = (selector, text) => {
//     const element = document.getElementById(selector);
//     if (element) element.innerText = text;
//   }

//   for (const type of ['chrome', 'node', 'electron']) {
//     replaceText(`${type}-version`, process.versions[type])
//   }
// });

contextBridge.exposeInMainWorld(
  'api', {
    send: (channel, data) => {
      let validChannels = ["toMain", 'file-save'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      } else {
        console.error('invalid channel', channel);
      }
    },
    receive: (channel, func) => {
      let validChannels = ['log', 'open-file', 'change-theme', 'save-file', 'toggle-renderer', 'show-toast'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      } else {
        console.error('invalid channel', channel);
      }
    }
  }
);

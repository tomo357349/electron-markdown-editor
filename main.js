const {app, dialog, nativeTheme, ipcMain, BrowserWindow, Menu} = require('electron');
const fs = require('fs');
const path = require('path');

/** @type {boolean} */
const isMac = process.platform === 'darwin';

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    titleBarStyle: 'default',
    // titleBarOverlay: true,
    // titleBarOverlay: {
    //   color: '#2f3241',
    //   symbolColor: '#74b1be'
    // },
    webPreferences: {
      nodeIntegration: true,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  setTimeout(() => {
    mainWindow.webContents.send('log', process.argv);
    const arg1 = process.argv[1] || null;
    if (arg1) openFile(arg1);
  }, 500);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  app.clearRecentDocuments();

  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const template = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      {
        label: 'Open',
        accelerator: 'CmdOrCtrl+O',
        click: openFileDialog
      },
      { type: 'separator' },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: saveFile
      },
      {
        label: 'SaveAs',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: saveFileAs
      },
      { type: 'separator' },
      {
        label:'Print',
        accelerator: 'CmdOrCtrl+P',
        click: printDocument
      },
      {
        label: 'Export',
        submenu: [
          {
            label: 'HTML',
            click: exportHtml
          }
        ]
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  },
  // { role: 'editMenu' }
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac ? [
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [
            { role: 'startSpeaking' },
            { role: 'stopSpeaking' }
          ]
        }
      ] : [
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ])
    ]
  },
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      {
        label: 'Dark Mode',
        type: 'checkbox',
        click: darkMode
      },
      { type: 'separator' },
      {
        label: 'Appearance',
        submenu: [
          {
            label: 'Hide Editor',
            type: 'checkbox',
            click: hideEditor
          },
          {
            label: 'Hide Viewer',
            accelerator: 'CmdOrCtrl+J',
            type: 'checkbox',
            click: hideViewer
          }
        ]
      },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ] : [
        { role: 'close' }
      ])
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Load Examples',
        click: loadExamples
      },
      { type: 'separator' },
      {
        label: 'About',
        click: showAbout
      }
    ]
  }
];
const menus = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menus);

function loadExamples() {
  mainWindow.webContents.send('load-examples', {});
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    message: 'Markdown Editor\nThe MIT License (MIT)\nCopyright © 2021 Tomoaki Takahashi',
    type: 'none',
    title: 'Markdown Editor',
  });
}

let currentFilePath = null;
function openFileDialog() {
  dialog.showOpenDialog({
    properties: ['openFile']
  }).then((res) => {
    const filePath = currentFilePath = res.filePaths[0];
    openFile(filePath);
  });
}

function openFile(filePath) {
  console.log('openFile=' + filePath);
  app.addRecentDocument(filePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return;

  const fileContents = '' + fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  mainWindow.webContents.send('open-file', {
    path: filePath,
    name: fileName,
    contents: fileContents
  });
}

function saveFile() {
  if (!currentFilePath) return;

  mainWindow.webContents.send('save-file', {
    path: currentFilePath,
    name: path.basename(currentFilePath)
  });
}

function saveFileAs() {
  dialog.showSaveDialog(mainWindow, {
    buttonLavel: 'Save',
    filters: [
      {
        extensions: ['txt', 'md']
      }
    ],
    properties: [
      'createDirectory'
    ]
  }).then((data) => {
    if (!data || data.canceled) return;

    currentFilePath = data.filePath;
    saveFile();
  });
}

let currentTheme = 'light';

function darkMode() {
  if (currentTheme == 'light') {
    nativeTheme.themeSource = currentTheme = 'dark';
  } else {
    nativeTheme.themeSource = currentTheme = 'light';
  }
  mainWindow.webContents.send('change-theme', currentTheme);
}

function hideEditor(menu, win, evt) {
  mainWindow.webContents.send('toggle-renderer', {
    target: 'editor',
    toggle: menu.checked
  });
}

function hideViewer(menu, win, evt) {
  mainWindow.webContents.send('toggle-renderer', {
    target: 'viewer',
    toggle: menu.checked
  });
}

function printDocument() {
  mainWindow.webContents.print({
    silent: false,
    printBackground: true,
    margins: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    },
    landscape: false,
  });
}

function exportHtml() {
  dialog.showSaveDialog(mainWindow, {
    buttonLavel: 'Export',
    filters: [
      {
        extensions: ['html', 'xml']
      }
    ],
    properties: [
      'createDirectory'
    ]
  }).then((data) => {
    if (!data || data.canceled) return;

    data.filePath;
    mainWindow.webContents.send('export-html', {
      path: data.filePath,
      name: path.basename(data.filePath),
    });
  });
}

ipcMain.on('theme-change', (evt, data) => {
  console.log('theme=' + data);

  currentTheme = (data === 'dark') ? 'light' : 'dark';
  darkMode();
});

ipcMain.on('file-save', (evt, data) => {
  console.log('path=' + data.path);
  fs.writeFileSync(data.path, data.contents);

  mainWindow.webContents.send('show-toast', {
    message: 'saved: ' + data.name
  });
});

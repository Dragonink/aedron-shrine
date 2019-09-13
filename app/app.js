const path = require('path'),
  fs = require('fs'),
  { app, BrowserWindow, ipcMain } = require('electron');

console.log("{" + app.getName() + " v" + app.getVersion() + "} (Electron v" + process.versions.electron + " | Node v" + process.versions.node + ")");
console.log("");

let focusedWin = null;

if (!app.requestSingleInstanceLock()) {
  console.log("[main] app : Not single instance !");
  app.quit()
} else app.on('second-instance', (event, cmdL, wd) => {
  if (focusedWin !== null) {
    if (focusedWin.isMinimized()) focusedWin.restore();
    focusedWin.focus()
  }
});

app.once('ready', () => {
  console.log("[main] app : Ready.");

  const main = new BrowserWindow({
    title: "Aedron Shrine",
    icon: path.join("resources", "AedronShrine.ico"),
    frame: false,
    backgroundColor: "#212121",
    fullscreen: true,
    movable: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  });
  console.log("[main] BrowserWindow : Created <main>.");
  const loading = new BrowserWindow({
    title: "Loading Aedron Shrine...",
    icon: path.join("resources", "AedronShrine.ico"),
    frame: false,
    height: 400,
    width: 300,
    backgroundColor: "#212121",
    fullscreen: false,
    fullscreenable: false,
    movable: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  });
  console.log("[main] BrowserWindow : Created <loading>.");

  ipcMain.on("log", (event, logs) => console.log(logs));

  loading.loadFile("loading.html");
  loading.once("ready-to-show", () => {
    loading.show();
    loading.focus();
    focusedWin = loading;
    console.log("[main] BrowserWindow : Shown <loading>.");
    main.loadFile("main.html");
    ipcMain.on('loading', (event, progress) => {
      loading.setProgressBar(progress);
      if (progress >= 1.) {
        loading.webContents.send('splash', 2);
        main.once("ready-to-show", () => setTimeout(() => {
          main.show();
          main.focus();
          focusedWin = main;
          console.log("[main] BrowserWindow : Shown <main>.");
          loading.close();
          console.log("[main] BrowserWindow : Closed <loading>.")
        }, 1000)
        );
        ipcMain.removeAllListeners('loading')
      } else if (progress >= .5) loading.webContents.send('splash', 1)
    })
  })
});
app.once("window-all-closed", (event) => app.quit())

const path = require('path'),
  fs = require('fs'),
  { app, BrowserWindow, ipcMain } = require('electron');

console.log("{" + app.getName() + " v" + app.getVersion() + "} (Electron v" + process.versions.electron + " | Node v" + process.versions.node + ")");
console.log("");

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

  loading.webContents.loadFile("loading.html");
  loading.once("ready-to-show", () => {
    loading.show();
    loading.focus();
    console.log("[main] BrowserWindow : Showed <loading>.");
    main.webContents.loadFile("main.html");
    ipcMain.on('loading', (event, progress) => {
      loading.setProgressBar(progress);
      if (progress >= 1.) {
        loading.webContents.send('splash', 1);
        main.once("ready-to-show", () => setTimeout(() => {
          main.show();
          main.focus();
          console.log("[main] BrowserWindow : Showed <main>.");
          loading.close();
          console.log("[main] BrowserWindow : Closed <loading>.")
        }, 1000)
        );
        ipcMain.removeAllListeners('loading')
      }
    })
  })
});
app.once("window-all-closed", (event) => app.quit())

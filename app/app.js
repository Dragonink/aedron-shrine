const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const Library = require('./Library.js');

console.log("{" + app.getName() + " v" + app.getVersion() + "}");
console.log("");

app.once('ready', () => {
  console.log("[main] app : Ready. " + "(Electron v" + process.versions.electron + " | Node v" + process.versions.node + " | Chromium v" + process.versions.chrome + ")");

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
    show: false
  });
  console.log("[main] BrowserWindow : Created <main>.");
  const loading = new BrowserWindow({
    title: "Aedron Shrine",
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
    show: false
  });
  console.log("[main] BrowserWindow : Created <loading>.");

  ipcMain.on("log", (event, logs) => console.log(logs));

  loading.webContents.loadFile("loading.html");
  loading.once("ready-to-show", () => {
    loading.show();
    loading.focus();
    console.log("[main] BrowserWindow : Showed <loading>.");
    var progress = .1;
    loading.setProgressBar(progress);
    new Library(path.join(app.getPath('documents'), 'AedronShrine'), path, fs)
      .initDir()
      .then(library => {
        progress = .2;
        loading.setProgressBar(progress);
        return library.loadCategories()
      })
      .then(library => {
        progress = .5;
        loading.setProgressBar(progress);
        return library.loadGames()
      })
      .then(library => {
        library = Library.clean(library);
        progress = 1.;
        loading.setProgressBar(progress);
        loading.webContents.executeJavaScript("document.getElementById('splash').innerHTML = \"<span style='color: #06ac06'>Completed</span>\"");
        main.webContents.loadFile("main.html");
        main.once("ready-to-show", () => {
          main.webContents.send("ready", library);
          setTimeout(() => {
            main.show();
            main.focus();
            console.log("[main] BrowserWindow : Showed <main>.");
            main.webContents.executeJavaScript("document.getElementById('music').load();document.getElementById('music').play()", true);
            loading.close();
            console.log("[main] BrowserWindow : Closed <loading>.")
          }, 1000)
        })
      })
      .catch(error => {
        loading.flashFrame(true);
        loading.setProgressBar(progress, { mode: 'error' });
        console.error("[main] Library : " + error);
        globalShortcut.register('Esc', app.quit)
        console.log("[main] globalShortcut : Registered [Esc].")
        loading.webContents.executeJavaScript("document.getElementById('splash').innerHTML = \"<span style='color: #fa0606;'>ERROR</span> Press ESC to quit.\"")
      })
  });

  app.once("window-all-closed", (event) => app.quit())
})

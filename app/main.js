// Array.prototype.random()
Object.defineProperty(Array.prototype, 'random', {
  value: function () {
    if (this.length === 0) return undefined
    else return this[Math.floor(Math.random() * this.length)]
  }
});
// Update CSS variables
function updateCSS(variable, value) {
  const style = document.getElementById('styleVars');
  style.innerHTML = style.innerHTML.replace(new RegExp(variable + ':\\s?.+;', 'm'), variable + ': ' + value + ';')
};

/*
* LIBRARY
*/
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR);
if (!fs.existsSync(path.join(DIR, 'games'))) fs.mkdirSync(path.join(DIR, 'games'));
if (!fs.existsSync(path.join(DIR, 'banners'))) fs.mkdirSync(path.join(DIR, 'banners'));
if (!fs.existsSync(path.join(DIR, 'backgrounds'))) fs.mkdirSync(path.join(DIR, 'backgrounds'));
if (!fs.existsSync(path.join(DIR, 'musics'))) fs.mkdirSync(path.join(DIR, 'musics'));
const Library = (function (DIR) {
  let library = new LibraryClass();
  for (const prog of library.buildCategories(DIR)) ipcRenderer.send('loading', prog / 2);
  ipcRenderer.send('log', "<main> Library : Build finished.");
  for (const prog of library.preloadMedia(DIR)) ipcRenderer.send('loading', (1 + prog) / 2);
  ipcRenderer.send('log', "<main> Library : Media preloaded.");
  return Object.freeze(library)
})(DIR);

/*
* INITIALIZATION
*/
const Config = new Store({
  defaults: {
    nbColumns: 3
  }
});
ipcRenderer.send('log', "<main> electron-store : Accessed default store.");
updateCSS('--nbColumns', Config.get('nbColumns'));
const Status = {
  currentBg: null,
  currentMu: null,
  selectedCategory: null,
  shownGames: [null, null],
  addedVoids: 0,
  selectedGame: null,
  subView: null,
  nbColumns: Config.get('nbColumns'),
  nbRows: window.getComputedStyle(document.getElementById('grid')).getPropertyValue('grid-template-rows').split(' ').length,
  nbLines: ~~((window.innerHeight - 2 * 20) / 81)
};
/* Backgrounds */
function background(category = null) {
  const img = (category => {
    if (category === null || category.backgrounds.length === 0) {
      if (Library.backgrounds.length > 0) return Library.backgrounds.random()
      else return null
    } else return category.backgrounds.random()
  })(category);
  if (img === null) return;
  if (Status.currentBg !== null) document.getElementById('app').removeChild(Status.currentBg);
  document.getElementById('app').insertBefore(img, document.getElementById('list'));
  Status.currentBg = img
};
/* Musics */
function music(category = null) {
  const audio = (category => {
    if (category === null || category.musics.length === 0) {
      if (Library.musics.length > 0) return Library.musics.random()
      else return null
    } else return category.musics.random()
  })(category);
  if (audio === null) return;
  if (Status.currentMu !== null) {
    Status.currentMu.removeEventListener('ended', event => music(category));
    Status.currentMu.load()
  };
  audio.play()
    .then(() => {
      audio.addEventListener('ended', event => music(category));
      Status.currentMu = audio
    })
    .catch(err => music(category))
};
/* Controls */
// Basic controls
const controls = async (event) => {
  if (event.defaultPrevented) return;
  switch (event.key) {
    case "PageUp":
      if (Status.subView !== null) break;
      display({ category: Library.search((Status.selectedCategory !== 'secret') ? Status.selectedCategory : -1, true, true) });
      break;
    case "PageDown":
      if (Status.subView !== null) break;
      display({ category: Library.search((Status.selectedCategory !== 'secret') ? Status.selectedCategory : -1, false, true) });
      break;
    case "ArrowUp":
      if (Status.subView !== null) subCursor(Status.selectedGame - 1)
      else cursor(Status.selectedGame - Status.nbColumns);
      break;
    case "ArrowDown":
      if (Status.subView !== null) subCursor(Status.selectedGame + 1)
      else cursor(Status.selectedGame + Status.nbColumns);
      break;
    case "ArrowLeft":
      if (Status.subView === null) cursor(Status.selectedGame - 1);
      break;
    case "ArrowRight":
      if (Status.subView === null) cursor(Status.selectedGame + 1);
      break;
    case "Backspace":
      if (Status.subView === null) break;
      App.superGame = null;
      Status.selectedGame = Status.subView;
      Status.subView = null;
      display({ category: Status.selectedCategory, cursorPos: Status.selectedGame });
      break;
    case "-":
      if (Status.nbColumns <= 3) break;
      Status.nbColumns--;
      await display({ games: [] });
      updateCSS('--nbColumns', Status.nbColumns);
      Status.nbRows = window.getComputedStyle(document.getElementById('grid')).getPropertyValue('grid-template-rows').split(' ').length;
      display({ category: Status.selectedCategory });
      Config.set('nbColumns', Status.nbColumns);
      break;
    case "+":
      Status.nbColumns++;
      await display({ games: [] });
      updateCSS('--nbColumns', Status.nbColumns);
      Status.nbRows = window.getComputedStyle(document.getElementById('grid')).getPropertyValue('grid-template-rows').split(' ').length;
      display({ category: Status.selectedCategory });
      Config.set('nbColumns', Status.nbColumns);
      break;
    case "0":
      if (Status.nbColumns === 3) break;
      Status.nbColumns = 3;
      await display({ games: [] });
      updateCSS('--nbColumns', Status.nbColumns);
      Status.nbRows = window.getComputedStyle(document.getElementById('grid')).getPropertyValue('grid-template-rows').split(' ').length;
      display({ category: Status.selectedCategory });
      Config.set('nbColumns', Status.nbColumns);
      break;
    case "Enter":
      enter();
      break;
    case "F1":
      if (remote.app.isPackaged) shell.openItem(path.join(remote.app.getPath('exe'), '..', 'resources', 'Documentation.url'))
      else shell.openItem(path.join(remote.app.getAppPath(), 'resources', 'Documentation.url'));
      remote.BrowserWindow.getAllWindows()[0].minimize();
      break;
    case "F3":
      toastify({
        text: '<b><u>Aedron Shrine</u> v' + remote.app.getVersion() + '</b> by <i>Dragonink</i>',
        duration: 5000,
        positionLeft: true,
        gravity: 'bottom',
        className: 'version'
      }).showToast();
      if (remote.app.isPackaged) shell.openItem(path.join(remote.app.getPath('exe'), '..', 'resources', 'LICENSES.txt'))
      else shell.openItem(path.join(remote.app.getAppPath(), 'resources', 'LICENSES.txt'));
      remote.BrowserWindow.getAllWindows()[0].blur();
      break;
    case "F5":
      shell.showItemInFolder(path.join(DIR, 'games'));
      remote.BrowserWindow.getAllWindows()[0].minimize();
      break;
    case "Escape":
      remote.app.quit();
      break;
    default:
      break;
  };
  event.preventDefault()
};
window.addEventListener('keyup', controls, true);
ipcRenderer.send('log', "<main> webContents : Registered basic controls.");
// Secret sequence
if (Library.hasSecret) {
  const secretSeq = Library.get('secret').pwd.split('');
  let userInput = new Array(secretSeq.length);
  window.addEventListener('keydown', ({ key }) => {
    if (Status.subView !== null) return;
    userInput = [...userInput.slice(1), key];
    if (secretSeq.every((v, k) => v === userInput[k])) display({ category: 'secret' })
  });
  ipcRenderer.send('log', "<main> webContents : Registered secret sequence.")
};
/* Complete initialization */
if (Library.size > 0) {
  document.getElementById('emptyAlert').style.display = 'none';
  display({ category: Library.search(-1, false, true) })
} else document.getElementById('app').style.display = 'none';

/*
* INTERACTIVITY
*/
/* Display */
function display({ category, sub, games, cursorPos }) {
  if (typeof category !== 'undefined') {
    // Background and Music
    if (Status.currentBg === null || (Library.get(Status.selectedCategory).backgrounds.length === 0 && Library.get(category).backgrounds.length > 0) || (Library.get(Status.selectedCategory).backgrounds.length > 0 && Library.get(category).backgrounds.length === 0)) background(Library.get(category));
    if (Status.currentMu === null || (Library.get(Status.selectedCategory).musics.length === 0 && Library.get(category).musics.length > 0) || (Library.get(Status.selectedCategory).musics.length > 0 && Library.get(category).musics.length === 0)) music(Library.get(category));
    // Categories list
    let categories = new Array(5).fill(null);
    categories[2] = category;
    categories[1] = Library.search(categories[2], true);
    categories[0] = Library.search(categories[1], true);
    categories[3] = Library.search(categories[2]);
    categories[4] = Library.search(categories[3]);
    App.categories = categories;
    // Games grid
    Status.addedVoids = 0;
    games = [];
    let k = 0;
    for (const game of Library.get(category).games.values()) if (k < Status.nbColumns * Status.nbRows) do {
      games.push((game === null) ? null : [category, game.id]);
      if (game === null) Status.addedVoids++;
      k++
    } while (game === null && k < Status.nbColumns * Status.nbRows && k % Status.nbColumns > 0);
    while (games.length > 0 && games[0] === null) games.unshift();
    while (games.length > 0 && games[games.length - 1] === null) games.pop();
    // Update style
    updateCSS('--categoryColor', '#' + Library.get(category).color);
    // Update Status
    Status.selectedCategory = category;
    Status.selectedGame = null;
    Status.shownGames = [0, k - 1];
    Status.addedVoids -= games.filter((game, idx, games) => game === null && games[idx - 1] !== null).length
  } else if (typeof sub !== 'undefined') {
    // Games sub
    games = [];
    let k = 0;
    for (const game of Library.get(Status.selectedCategory).games.get(Status.subView).sub.values()) if (k < Status.nbLines) {
      games.push([Status.selectedCategory, Status.subView, game.id]);
      k++
    };
    // Update Status
    Status.selectedGame = null;
    Status.shownGames = [0, k - 1]
  };
  if (typeof games !== 'undefined') {
    // Games grid
    if (Status.subView === null) App.games = games
    else App.subGames = games;
    return Vue.nextTick()
      .then(() => {
        // Update cursor
        if (Status.subView === null) {
          if (typeof cursorPos !== 'undefined') cursor(cursorPos)
          else cursor(0)
        } else {
          if (typeof cursorPos !== 'undefined') subCursor(cursorPos)
          else subCursor(0)
        }
      })
  }
};
/* Cursor */
function cursor(pos) {
  // Empty category handling
  if (App.games.length === 0 || Library.get(Status.selectedCategory).games.size === 0) return;
  // Void handling
  while (App.games[pos - Status.shownGames[0]] === null) {
    if (pos < Status.selectedGame) pos--
    else pos++
  };
  // Out of screen handling
  if (pos < 0) pos = 0
  else if (pos >= Library.get(Status.selectedCategory).games.size + Status.addedVoids) pos = Library.get(Status.selectedCategory).games.size - 1 + Status.addedVoids;
  // Update Status
  let callDisplay = false;
  if (pos < Status.shownGames[0]) {
    Status.shownGames = Status.shownGames.map(k => k - Status.nbColumns);
    callDisplay = true
  } else if (pos > Status.shownGames[1]) {
    Status.shownGames = Status.shownGames.map(k => k + Status.nbColumns);
    callDisplay = true
  };
  Status.selectedGame = pos;
  // Update games
  for (const game of document.getElementById('grid').children) game.classList.remove('selected');
  if (callDisplay) {
    Status.addedVoids = 0;
    let games = [],
      k = 0;
    for (const game of Library.get(Status.selectedCategory).games.values()) {
      if (k >= Status.shownGames[0] && k <= Status.shownGames[1]) do {
        games.push((game === null) ? null : [Status.selectedCategory, game.id]);
        if (game === null) Status.addedVoids++;
        k++
      } while (game === null && k < Status.shownGames[1] && k % Status.nbColumns > 0)
      else k++
    };
    while (games.length > 0 && games[0] === null) games.unshift();
    while (games.length > 0 && games[games.length - 1] === null) games.pop();
    Status.addedVoids -= games.filter((game, idx, games) => game === null && games[idx - 1] !== null).length;
    display({ games: games, cursorPos: pos })
  };
  document.getElementById('grid').children[Status.selectedGame - Status.shownGames[0]].classList.add('selected')
};
function subCursor(pos) {
  // Empty sub handling
  if (App.subGames.length === 0 || Library.get(Status.selectedCategory).games.get(Status.subView).sub.size === 0) return;
  // Out of screen handling
  if (pos < 0) pos = 0
  else if (pos >= Library.get(Status.selectedCategory).games.get(Status.subView).sub.size) pos = Library.get(Status.selectedCategory).games.get(Status.subView).sub.size - 1;
  // Update Status
  let callDisplay = false;
  if (pos < Status.shownGames[0] || pos > Status.shownGames[1]) {
    Status.shownGames = Status.shownGames.map(k => k - (Status.selectedGame - pos));
    callDisplay = true
  };
  Status.selectedGame = pos;
  // Update games
  for (const game of document.getElementById('subList').children) game.classList.remove('selected');
  if (callDisplay) {
    let games = [],
      k = 0;
    for (const game of Library.get(Status.selectedCategory).games.get(Status.subView).sub.values()) {
      if (k >= Status.shownGames[0] && k <= Status.shownGames[1]) games.push([Status.selectedCategory, Status.subView, game.id]);
      k++
    };
    display({ games: games, cursorPos: pos })
  };
  document.getElementById('subList').children[Status.selectedGame - Status.shownGames[0]].classList.add('selected')
};
/* ENTER action */
function enter() {
  const category = Library.get(Status.selectedCategory);
  if (Status.selectedGame === null && shell.showItemInFolder(path.join(DIR, 'games', category.filename))) remote.app.quit()
  else if (Status.subView === null && category.games.get(Status.selectedGame).type === "super") {
    Status.subView = Status.selectedGame;
    App.superGame = [Status.selectedCategory, Status.subView];
    display({ sub: Status.subView })
  } else if (Status.subView !== null) {
    window.removeEventListener('keyup', controls, true);
    document.getElementById('subList').children[Status.selectedGame - Status.shownGames[0]].classList.add('launching');
    setTimeout(() => document.getElementById('subList').children[Status.selectedGame - Status.shownGames[0]].classList.remove('launching'), 500);
    const superGame = category.games.get(Status.subView),
      game = category.games.get(Status.subView).sub.get(Status.selectedGame);
    toastify({
      text: "Launching <b>" + game.name + "</b>...",
      duration: 3000,
      gravity: 'bottom',
      className: 'launching'
    }).showToast();
    setTimeout(() => {
      if (shell.openItem(path.join(DIR, 'games', category.filename, superGame.filename, game.filename))) remote.app.quit()
      else {
        window.addEventListener('keyup', controls, true);
        toastify({
          text: "ERROR ! Failed to launch <b>" + game.name + "</b>.",
          duration: 3000,
          gravity: 'bottom',
          className: 'error'
        }).showToast()
      }
    }, 1000)
  } else {
    window.removeEventListener('keyup', controls, true);
    document.getElementById('grid').children[Status.selectedGame - Status.shownGames[0]].classList.add('launching');
    setTimeout(() => document.getElementById('grid').children[Status.selectedGame - Status.shownGames[0]].classList.remove('launching'), 500);
    const game = category.games.get(App.games[Status.selectedGame - Status.shownGames[0]][1]);
    toastify({
      text: "Launching <b>" + game.name + "</b>...",
      duration: 3000,
      gravity: 'bottom',
      className: 'launching'
    }).showToast();
    setTimeout(() => {
      if (shell.openItem(path.join(DIR, 'games', category.filename, game.filename))) remote.app.quit()
      else {
        window.addEventListener('keyup', controls, true);
        toastify({
          text: "ERROR ! Failed to launch <b>" + game.name + "</b>.",
          duration: 3000,
          gravity: 'bottom',
          className: 'error'
        }).showToast()
      }
    }, 1000)
  }
}

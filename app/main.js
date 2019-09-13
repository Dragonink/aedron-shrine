/*
* LIBRARY
*/
let libraryBuilder = LibraryClass.build(dir);
var libraryBuilderYield = libraryBuilder.next();
while (!libraryBuilderYield.done) {
  ipcRenderer.send('loading', libraryBuilderYield.value);
  libraryBuilderYield = libraryBuilder.next()
};
const Library = libraryBuilderYield.value;

/*
* INITIALIZATION
*/
var Status = {
  selectedCategory: null,
  shownGames: [null, null],
  selectedGame: null,
  nbRows: window.getComputedStyle(document.getElementById('grid')).getPropertyValue('grid-template-rows').split(' ').length
};
/* Backgrounds */
fs.readdir(path.join(dir, 'backgrounds'), (error, bgList) => {
  if (!error && bgList.length > 0) App.bgSrc = path.join(dir, 'backgrounds', bgList[Math.floor(Math.random() * (bgList.length))])
});
/* Musics */
fs.readdir(path.join(dir, 'musics'), (error, musicList) => {
  if (!error && musicList.length > 0) {
    App.muSrc = path.join(dir, 'musics', musicList[Math.floor(Math.random() * (musicList.length))]);
    document.getElementById("music").addEventListener('ended', (event) => {
      App.muSrc = path.join(dir, 'musics', musicList[Math.floor(Math.random() * (musicList.length))]);
      document.getElementById("music").play()
    })
  }
});
/* Controls */
// Basic controls
const controls = (event) => {
  if (event.defaultPrevented) return;
  switch (event.key) {
    case "PageUp":
      display({ category: Library.search(Status.selectedCategory, true, true) });
      break;
    case "PageDown":
      display({ category: Library.search((Status.selectedCategory !== 'secret') ? Status.selectedCategory : -1, false, true) });
      break;
    case "ArrowUp":
      cursor(Status.selectedGame - 3);
      break;
    case "ArrowDown":
      cursor(Status.selectedGame + 3);
      break;
    case "ArrowLeft":
      cursor(Status.selectedGame - 1);
      break;
    case "ArrowRight":
      cursor(Status.selectedGame + 1);
      break;
    case "Enter":
      launch();
      break;
    case "F1":
      if (remote.app.isPackaged) shell.openItem(path.join(remote.app.getPath('exe'), '..', 'resources', 'Documentation.url'))
      else shell.openItem(path.join(remote.app.getAppPath(), 'resources', 'Documentation.url'));
      remote.BrowserWindow.getAllWindows()[0].minimize();
      break;
    case "F3":
      Toastify({
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
      shell.showItemInFolder(path.join(dir, 'games'));
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
  var userInput = new Array(secretSeq.length);
  window.addEventListener('keydown', ({ key }) => {
    userInput = [...userInput.slice(1), key];
    if (secretSeq.every((v, k) => v === userInput[k])) display({ category: 'secret' })
  });
  ipcRenderer.send('log', "<main> webContents : Registered secret sequence.")
};
/* Complete initialization */
if (Library.size > 0) {
  document.getElementById('emptyAlert').style.display = 'none';
  display({ category: Library.search(-1) })
} else document.getElementById('app').style.display = 'none';

/*
* INTERACTIVITY
*/
/* Display */
function display({ category, games, cursorPos }) {
  if (typeof category !== 'undefined') {
    // Categories list
    let categoriesList = new Array(5).fill(null);
    categoriesList[2] = category;
    categoriesList[1] = Library.search(categoriesList[2], true);
    categoriesList[0] = Library.search(categoriesList[1], true);
    categoriesList[3] = Library.search(categoriesList[2]);
    categoriesList[4] = Library.search(categoriesList[3]);
    App.categories = categoriesList.map(idx => (idx !== null) ? JSON.parse(JSON.stringify(Library.get(idx))) : null);
    // Games grid
    games = [];
    var k = 0;
    for (var game of Library.get(category).games.values()) if (k < 3 * Status.nbRows) {
      games.push(JSON.parse(JSON.stringify(game)));
      k++
    };
    // Update style
    document.body.style.setProperty('--categoryColor', '#' + Library.get(category).color);
    // Update Status
    Status.selectedCategory = category;
    Status.shownGames = [0, k - 1];
    Status.selectedGame = null;
  };
  if (typeof games !== 'undefined') {
    // Games grid
    App.games = games;
    // Update cursor
    Vue.nextTick()
      .then(() => {
        if (typeof cursorPos !== 'undefined') cursor(cursorPos)
        else cursor(0)
      })
  }
};
/* Cursor */
function cursor(pos) {
  // Empty category handling
  if (Library.get(Status.selectedCategory).games.size === 0) return;
  // Out of screen handling
  if (pos < 0) pos = 0
  else if (pos >= Library.get(Status.selectedCategory).games.size) pos = Library.get(Status.selectedCategory).games.size - 1;
  // Update Status
  var callDisplay = false;
  if (pos < Status.shownGames[0]) {
    Status.shownGames = Status.shownGames.map(k => k - 3);
    callDisplay = true
  } else if (pos > Status.shownGames[1]) {
    Status.shownGames = Status.shownGames.map(k => k + 3);
    callDisplay = true
  };
  Status.selectedGame = pos;
  // Update games
  for (var game of document.getElementById('grid').children) game.classList.remove('selected');
  if (callDisplay) {
    var games = [],
      k = 0;
    for (var game of Library.get(Status.selectedCategory).games.values()) {
      if (k >= Status.shownGames[0] && k <= Status.shownGames[1]) games.push(JSON.parse(JSON.stringify(game)));
      k++
    };
    display({ games: games, cursorPos: pos })
  };
  document.getElementById('grid').children[Status.selectedGame - Status.shownGames[0]].classList.add('selected')
};
/* Launch game */
function launch() {
  let category = Library.get(Status.selectedCategory),
    categoryFilename = (category.pwd === null) ?
      (((Status.selectedCategory < 10) ? '0' : '') + Status.selectedCategory) + '--' + category.name + '--' + category.color :
      'secret--' + category.pwd;
  if (Status.selectedGame === null && shell.showItemInFolder(path.join(dir, 'games', categoryFilename))) remote.app.quit()
  else {
    window.removeEventListener('keyup', controls, true);
    document.getElementById('grid').children[Status.selectedGame - Status.shownGames[0]].classList.add('launching');
    setTimeout(() => document.getElementById('grid').children[Status.selectedGame - Status.shownGames[0]].classList.remove('launching'), 500);
    let game = category.games.get(Status.selectedGame),
      gameFilename = fs.readdirSync(path.join(dir, 'games', categoryFilename)).find(el => new RegExp('^\\d{2}--' + game.name + '.(?:lnk|url)$').test(el));
    Toastify({
      text: "Launching <b>" + game.name + "</b>...",
      duration: 3000,
      gravity: 'bottom',
      className: 'launching'
    }).showToast();
    setTimeout(() => {
      if (shell.openItem(path.join(dir, 'games', categoryFilename, gameFilename))) remote.app.quit()
      else {
        window.addEventListener('keyup', controls, true);
        Toastify({
          text: "ERROR ! Failed to launch <b>" + game.name + "</b>.",
          duration: 3000,
          gravity: 'bottom',
          className: 'error'
        }).showToast()
      }
    }, 1000)
  }
}

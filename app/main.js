const path = require('path');
const fs = require('fs');
const { ipcRenderer, shell } = require('electron');
const quit = require('electron').remote.app.quit;

let Library;
ipcRenderer.once("ready", (event, library) => {
  Library = Object.freeze(library);
  init()
});

function init() {
  // Backgrounds
  fs.readdir(path.join(Library.Dir, 'backgrounds'), (error, bgList) => {
    if (!error && bgList.length > 0) document.getElementById('bg').src = path.join(Library.Dir, 'backgrounds', bgList[Math.floor(Math.random() * (bgList.length))])
  });
  // Musics
  fs.readdir(path.join(Library.Dir, 'musics'), (error, musicList) => {
    if (!error && musicList.length > 0) {
      document.getElementById("music").src = path.join(Library.Dir, 'musics', musicList[Math.floor(Math.random() * (musicList.length))]);
      document.getElementById("music").addEventListener('ended', (event) => {
        document.getElementById("music").pause();
        document.getElementById("music").src = path.join(Library.Dir, 'musics', musicList[Math.floor(Math.random() * (musicList.length))]);
        document.getElementById("music").load();
        document.getElementById("music").play()
      })
    }
  });
  // Secret category
  if (Library.edgyCrap) {
    const secretSeq = Library.categories[Library.categoriesCount].pwd.split('');
    let userInput = new Array(secretSeq.length);
    window.addEventListener('keydown', ({ key }) => {
      userInput = [...userInput.slice(1), key];
      if (secretSeq.every((v, k) => v === userInput[k])) {
        category = Library.categoriesCount;
        loadCategory(category)
      }
    });
    ipcRenderer.send('log', "<main> webContents : Registered secret sequence.")
  };

  // Adjust grid
  colWidth = ~~((window.innerWidth - (20 + 4 * 15 + window.innerWidth / 10)) / 3);
  maxCols = 3;
  document.getElementById("list").style.gridTemplateColumns = "5%";
  for (var c = 0; c < 3; c++) document.getElementById("list").style.gridTemplateColumns += " " + colWidth + "px";
  document.getElementById("list").style.gridTemplateColumns += " 5%";
  rowHeight = Math.round(215 * colWidth / 460);
  maxRows = 0;
  while ((maxRows + 1) * (rowHeight + 15) <= window.innerHeight - (115 + 64)) maxRows++;
  if ((maxRows + 1) * rowHeight <= window.innerHeight - (115 + 64)) maxRows++;
  document.getElementById("list").style.gridTemplateRows = "64px";
  for (var r = 0; r < maxRows; r++) document.getElementById("list").style.gridTemplateRows += " " + rowHeight + "px";

  // Register keyboard Events
  category = 0;
  cursorPos = [0, 0];
  controls = (event) => {
    if (event.defaultPrevented) return;
    switch (event.key) {
      case "PageUp":
        category--;
        if (category < 0) category = Library.categoriesCount - 1;
        loadCategory(category);
        break;
      case "PageDown":
        category++;
        if (category >= Library.categoriesCount) category = 0;
        loadCategory(category);
        break;
      case "ArrowUp":
        cursorPos[1]--;
        cursor(cursorPos);
        break;
      case "ArrowDown":
        cursorPos[1]++;
        cursor(cursorPos);
        break;
      case "ArrowLeft":
        cursorPos[0]--;
        cursor(cursorPos);
        break;
      case "ArrowRight":
        cursorPos[0]++;
        cursor(cursorPos);
        break;
      case "Enter":
        launch(cursorPos);
        break;
      case "Escape":
        quit();
        break;
      default:
        break;
    };
    event.preventDefault()
  };
  window.addEventListener('keyup', controls, true);

  // Continue initialization
  (Library.categoriesCount > 0) ? loadCategory(0) : loadCategory('empty')
};

function loadCategory(index) {
  // Empty Library
  if (index === 'empty') {
    var empty = document.createElement("H1");
    document.getElementById("list").appendChild(empty);
    empty.classList.add("list", "games", "empty");
    empty.appendChild(document.createTextNode("Your library is empty."));
    empty.appendChild(document.createElement("BR"));
    empty.appendChild(document.createTextNode("Press ENTER to show the config directory."));
    cursorPos = 'empty';
    return
  };

  cursorPos = [0, 0];
  dispRows = [0, maxRows - 1];

  // Categories
  document.querySelectorAll(".list.categories.selected")[0].innerHTML = Library.categories[index].name;
  document.querySelectorAll(".list.categories.selected")[0].style.color = "#" + Library.categories[index].color;
  document.querySelectorAll(".list.categories.inner")[0].innerHTML = (typeof Library.categories[index - 1] !== 'undefined') ? Library.categories[index - 1].name : "";
  document.querySelectorAll(".list.categories.inner")[1].innerHTML = (typeof Library.categories[index + 1] !== 'undefined' && Library.categories[index + 1].pwd === null) ? Library.categories[index + 1].name : "";
  document.querySelectorAll(".list.categories.outer")[0].innerHTML = (typeof Library.categories[index - 2] !== 'undefined') ? Library.categories[index - 2].name : "";
  document.querySelectorAll(".list.categories.outer")[1].innerHTML = (typeof Library.categories[index + 2] !== 'undefined' && Library.categories[index + 2].pwd === null) ? Library.categories[index + 2].name : "";

  // Games grid
  while (document.querySelectorAll(".list.games").length > 0) document.getElementById('list').removeChild(document.querySelectorAll(".list.games")[0]);

  if (Library.gamesCounts[Library.categories[index].name] === 0) {
    var empty = document.createElement("H1");
    document.getElementById("list").appendChild(empty);
    empty.classList.add("list", "games", "empty");
    empty.appendChild(document.createTextNode(Library.categories[index].name + " is empty"))
  } else {
    for (var game = 0; game < Library.gamesCounts[Library.categories[index].name]; game++) {
      var newGame = document.createElement("IMG");
      var categoryFilename = fs.existsSync(path.join(Library.Dir, 'banners', Library.categories[index].name));
      if (categoryFilename) var bannerFilename = fs.readdirSync(path.join(Library.Dir, 'banners', Library.categories[index].name))
        .find(el => new RegExp('^' + Library.games[Library.categories[category].name][game] + '\\.(jpg|jpeg|png|gif)$').test(el));
      newGame.src = (categoryFilename && typeof bannerFilename !== 'undefined') ?
        path.join(Library.Dir, 'banners', Library.categories[index].name, bannerFilename) :
        "";
      newGame.style.width = colWidth + "px";
      newGame.style.height = rowHeight + "px";
      document.getElementById("list").appendChild(newGame);
      newGame.classList.add("list", "games");
      newGame.style.gridColumn = (game % maxCols) + 2
    }
  };

  cursor(cursorPos)
};
function cursor(pos) {
  // Empty category handling
  if (Library.gamesCounts[Library.categories[category].name] === 0) return;

  // Out of screen handling
  if (pos[1] < 0) pos[1] = 0
  else if ((Library.gamesCounts[Library.categories[category].name] - maxCols * pos[1]) <= 0) pos[1] = ~~((Library.gamesCounts[Library.categories[category].name] - 1) / maxCols);
  if (pos[0] < 0) pos[0] = 0
  else if (pos[1] === ~~(Library.gamesCounts[Library.categories[category].name] / maxCols) && pos[0] >= (Library.gamesCounts[Library.categories[category].name] % maxCols)) pos[0] = (Library.gamesCounts[Library.categories[category].name] % maxCols) - 1
  else if (pos[1] < ~~(Library.gamesCounts[Library.categories[category].name] / maxCols) && pos[0] > 2) pos[0] = 2;
  cursorPos = pos;

  var index = pos[1] * maxCols + pos[0];

  if (pos[1] < dispRows[0]) dispRows = dispRows.map(r => r - 1)
  else if (pos[1] > dispRows[1]) dispRows = dispRows.map(r => r + 1);

  for (var game of document.querySelectorAll(".list.games")) game.style.display = "none";
  for (var game in document.querySelectorAll(".list.games")) if (game >= dispRows[0] * maxCols && game < (dispRows[1] + 1) * maxCols) document.querySelectorAll(".list.games")[game].style.display = "initial";

  // Cursor
  for (var game of document.querySelectorAll(".list.games")) game.style.outline = "none";
  document.querySelectorAll(".list.games")[index].style.outline = "3px solid #" + Library.categories[category].color;
};

function launch(pos) {
  var index = (pos !== 'empty') ? pos[1] * maxCols + pos[0] : 'empty';

  let categoryFilename = (pos !== 'empty') ?
    (Library.categories[category].pwd === null) ?
      fs.readdirSync(path.join(Library.Dir, 'games'))
        .find(el => new RegExp('^(\\d{2})--' + Library.categories[category].name + '--(\\w{6})$').test(el)) :
      fs.readdirSync(path.join(Library.Dir, 'games'))
        .find(el => new RegExp('^secret--(\\w{1,})$').test(el)) :
    'empty';
  let gameFilename = (pos !== 'empty') ?
    fs.readdirSync(path.join(Library.Dir, 'games', categoryFilename))
      .find(el => new RegExp('^(\\d{2})--' + Library.games[Library.categories[category].name][index] + '\\.(\\w{1,})$').test(el)) :
    'empty';
  window.removeEventListener('keyup', controls, true);
  var success = (pos !== 'empty') ?
    shell.openItem(path.join(Library.Dir, 'games', categoryFilename, gameFilename)) :
    shell.showItemInFolder(path.join(Library.Dir, 'games'));
  if (success) quit()
  else window.addEventListener('keyup', controls, true)
}

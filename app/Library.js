class Game {
  constructor(filename, bannersList = []) {
    let matches = /^(\d{2})--([^.\\/:*"<>|]+)(|\.lnk|\.url)$/i.exec(filename);
    this.id = Number(matches[1]);
    this.name = matches[2];
    this.type = (matches[3] === "") ? "super" : (matches[3].toLowerCase() === ".lnk") ? "lnk" : "url";
    this.banner = bannersList.find(el => new RegExp('^' + this.name + '\\.(?:png|jpg|jpeg|gif)$', 'i').test(el));
    this.sub = (this.type === "super") ? new Map() : null;
  };
  get isSuper() {
    return this.type === "super"
  };
  get filename() {
    return ((this.id < 10) ? "0" : "") + this.id + "--" + this.name + ((this.isSuper) ? "" : "." + this.type)
  };
  static check(filename) {
    return /^\d{2}--[^.\\/:*"<>|]+(?:|\.lnk|\.url)$/i.test(filename)
  };
  preloadBanner(DIR, categoryName) {
    if (typeof this.banner === 'undefined') return;
    let img = new Image();
    img.classList.add((this.type !== 'super') ? 'game' : 'super');
    img.src = path.join(DIR, 'banners', categoryName, this.banner);
    (async () => await img.decode())();
    this.banner = img
  };
  * buildSub(DIR, categoryFilename) {
    const subList = fs.readdirSync(path.join(DIR, 'games', categoryFilename, this.filename));
    for (const i in subList) {
      if (Game.check(subList[i])) {
        let game = new Game(subList[i]);
        this.sub.set(game.id, game)
      };
      yield (Number(i) + 1) / subList.length
    };
    return 1.
  }
};
class Category {
  constructor(filename) {
    if (/^\d{2}--[^.\\/:*"<>|]+--[0-9a-f]{6}$/i.test(filename)) {
      let matches = /^(\d{2})--([^.\\/:*"<>|]+)--([0-9a-f]{6})$/i.exec(filename);
      this.id = Number(matches[1]);
      this.name = matches[2];
      this.color = matches[3];
      this.pwd = null
    } else if (/^secret--[a-z]+$/i.test(filename)) {
      let matches = /^secret--([a-z]+)$/i.exec(filename);
      this.id = "secret";
      this.name = "Secret";
      this.color = "fa0606";
      this.pwd = matches[1]
    };
    this.games = new Map();
    this.backgrounds = [];
    this.musics = []
  };
  get isSecret() {
    return this.id === "secret"
  };
  get filename() {
    return (this.isSecret) ?
      "secret--" + this.pwd :
      (((this.id < 10) ? "0" : "") + this.id) + "--" + this.name + "--" + this.color
  };
  static check(filename) {
    return /^\d{2}--[^.\\/:*"<>|]+--[0-9a-f]{6}$/i.test(filename) || /^secret--[a-z]+$/i.test(filename)
  };
  * buildGames(DIR) {
    const gamesList = fs.readdirSync(path.join(DIR, 'games', this.filename)),
      bannersList = (fs.existsSync(path.join(DIR, 'banners', this.name))) ? fs.readdirSync(path.join(DIR, 'banners', this.name)) : [];
    for (const i in gamesList) {
      if (Game.check(gamesList[i])) {
        let game = new Game(gamesList[i], bannersList);
        if (game.isSuper) for (const prog of game.buildSub(DIR, this.filename)) yield prog * (Number(i) + 1) / gamesList.length;
        this.games.set(game.id, game)
      } else if (/^\d{2}$/.test(gamesList[i])) this.games.set(Number(/^(\d{2})$/.exec(gamesList[i])[1]), null);
      yield (Number(i) + 1) / gamesList.length
    };
    let games = Array.from(this.games.entries());
    while (games.length > 0 && games[0][1] === null) this.games.delete(games[0][0]);
    games = Array.from(this.games.entries());
    while (games.length > 0 && games[games.length - 1][1] === null) this.games.delete(games[games.length - 1][0]);
    games = Array.from(this.games.entries());
    for (const game in games) if (games[game][1] === null && games[Number(game) - 1][1] === null) this.games.delete(games[game][0]);
    return 1.
  };
  * preloadMedia(DIR) {
    const steps = fs.existsSync(path.join(DIR, 'backgrounds', this.name)) + fs.existsSync(path.join(DIR, 'musics', this.name)) + fs.existsSync(path.join(DIR, 'banners', this.name));
    let step = 0;
    if (fs.existsSync(path.join(DIR, 'backgrounds', this.name))) {
      step++;
      const bgList = fs.readdirSync(path.join(DIR, 'backgrounds', this.name));
      for (const i in bgList) {
        if (! /\.(?:png|jpg|jpeg|gif)$/.test(bgList[i])) continue;
        let img = new Image();
        img.classList.add('background');
        img.src = path.join(DIR, 'backgrounds', this.name, bgList[i]);
        (async () => await img.decode())();
        this.backgrounds.push(img);
        yield (Number(i) + 1) / bgList.length / steps
      }
    };
    if (fs.existsSync(path.join(DIR, 'musics', this.name))) {
      step++;
      const muList = fs.readdirSync(path.join(DIR, 'musics', this.name));
      for (const i in muList) {
        if (! /\.(?:mp3|mp4|ogg|flac|webm|wav)$/.test(muList[i])) continue;
        let audio = new Audio(path.join(DIR, 'musics', this.name, muList[i]));
        audio.load();
        this.musics.push(audio);
        yield (step + (Number(i) + 1) / muList.length) / steps
      }
    };
    if (fs.existsSync(path.join(DIR, 'banners', this.name))) {
      step++
      let g = 0;
      for (const game of this.games.values()) if (game !== null) {
        g++;
        game.preloadBanner(DIR, this.name);
        yield (step + g / this.games.size) / steps
      }
    };
    return 1.
  }
};
class LibraryClass extends Map {
  constructor() {
    super();
    this.backgrounds = [];
    this.musics = []
  };
  get hasSecret() {
    return this.has('secret')
  };
  get size() {
    return super.size - this.hasSecret
  };
  search(index, inverseOrder = false, loop = false) {
    const keys = Array.from(this.keys()).filter(el => typeof el === "number"),
      i = keys.findIndex(el => el === index);
    if (i === -1) {
      if (inverseOrder) return (loop) ? keys[keys.length - 1] : null
      else return (loop) ? keys[0] : null
    } else if (loop) {
      if (inverseOrder) return keys[(i - 1 + keys.length) % keys.length]
      else return keys[(i + 1) % keys.length]
    } else {
      if (inverseOrder) return (i - 1 < 0) ? null : keys[i - 1]
      else return (i + 1 >= keys.length) ? null : keys[i + 1]
    }
  };
  * buildCategories(DIR) {
    const categoriesList = fs.readdirSync(path.join(DIR, 'games'));
    for (const i in categoriesList) {
      if (Category.check(categoriesList[i])) {
        let category = new Category(categoriesList[i]);
        for (const prog of category.buildGames(DIR)) yield prog * (Number(i) + 1) / categoriesList.length;
        this.set(category.id, category)
      } else yield (Number(i) + 1) / categoriesList.length
    };
    return 1.
  };
  * preloadMedia(DIR) {
    const bgList = fs.readdirSync(path.join(DIR, 'backgrounds'));
    for (const i in bgList) {
      if (! /\.(?:png|jpg|jpeg|gif)$/.test(bgList[i])) continue;
      let img = new Image();
      img.classList.add('background');
      img.src = path.join(DIR, 'backgrounds', bgList[i]);
      (async () => await img.decode())();
      this.backgrounds.push(img);
      yield (Number(i) + 1) / bgList.length / 3
    };
    const muList = fs.readdirSync(path.join(DIR, 'musics'));
    for (const i in muList) {
      if (! /\.(?:mp3|mp4|ogg|flac|webm|wav)$/.test(muList[i])) continue;
      let audio = new Audio(path.join(DIR, 'musics', muList[i]));
      audio.load();
      this.musics.push(audio);
      yield (1 + (Number(i) + 1) / muList.length) / 3
    };
    let c = 0;
    for (const category of this.values()) {
      c++;
      for (const prog of category.preloadMedia(DIR)) yield (2 + prog * c / super.size) / 3
    };
    return 1.
  }
}

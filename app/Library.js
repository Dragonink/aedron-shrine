class Game {
  constructor(filename, dir, bannersList = []) {
    let matches = /^(\d{2})--([^.\\/:*"<>|]+)(|\.lnk|\.url)$/i.exec(filename);
    this.id = Number(matches[1]);
    this.name = matches[2];
    this.type = (matches[3] === "") ? "super" : (matches[3].toLowerCase() === ".lnk") ? "lnk" : "url";
    this.banner = bannersList.find(el => new RegExp('^' + this.name + '.(?:png|jpg|jpeg|gif)$', 'i').test(el));
    this.sub = (this.type === "super") ? new Map() : null;
  };
  get isSuper() {
    return this.type === "super"
  };
  get filename() {
    return ((this.id < 10) ? "0" : "") + this.id + "--" + this.name + ((this.isSuper) ? "" : "." + this.type)
  };
  static check(filename) {
    return /^(?:\d{2})--(?:[^.\\/:*"<>|]+)(?:|\.lnk|\.url)$/i.test(filename)
  };
  * buildSub(dir, categoryFilename) {
    const subList = fs.readdirSync(path.join(dir, 'games', categoryFilename, this.filename));
    for (const i in subList) {
      if (/^(?:\d{2})--(?:[^.\\/:*"<>|]+)(?:\.lnk|\.url)$/i.test(subList[i])) {
        let game = new Game(subList[i], dir);
        this.sub.set(game.id, game)
      };
      yield (Number(i) + 1) / subList.length
    };
    yield 1.
  }
};
class Category {
  constructor(filename) {
    if (/^(?:\d{2})--(?:[^.\\/:*"<>|]+)--(?:[0-9a-f]{6})$/i.test(filename)) {
      let matches = /^(\d{2})--([^.\\/:*"<>|]+)--([0-9a-f]{6})$/i.exec(filename);
      this.id = Number(matches[1]);
      this.name = matches[2];
      this.color = matches[3];
      this.pwd = null
    } else if (/^secret--(?:[a-z]+)$/i.test(filename)) {
      let matches = /^secret--([a-z]+)$/i.exec(filename);
      this.id = "secret";
      this.name = "Secret";
      this.color = "fa0606";
      this.pwd = matches[1]
    };
    this.games = new Map()
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
    return /^(?:\d{2})--(?:[^.\\/:*"<>|]+)--(?:[0-9a-f]{6})$/i.test(filename) || /^secret--(?:[a-z]+)$/i.test(filename)
  };
  * buildGames(dir) {
    const gamesList = fs.readdirSync(path.join(dir, 'games', this.filename)),
      bannersList = (fs.existsSync(path.join(dir, 'banners', this.name))) ? fs.readdirSync(path.join(dir, 'banners', this.name)) : [];
    for (const i in gamesList) {
      if (Game.check(gamesList[i])) {
        let game = new Game(gamesList[i], dir, bannersList);
        if (game.isSuper) for (const prog of game.buildSub(dir, this.filename)) yield prog * (Number(i) + 1) / gamesList.length;
        this.games.set(game.id, game)
      } else yield (Number(i) + 1) / gamesList.length
    };
    yield 1.
  }
};
class LibraryClass extends Map {
  constructor() {
    super()
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
  * buildCategories(dir) {
    const categoriesList = fs.readdirSync(path.join(dir, 'games'));
    for (const i in categoriesList) {
      if (Category.check(categoriesList[i])) {
        let category = new Category(categoriesList[i]);
        for (const prog of category.buildGames(dir)) yield prog * (Number(i) + 1) / categoriesList.length;
        this.set(category.id, category)
      } else yield (Number(i) + 1) / categoriesList.length
    };
    yield 1.
  }
}

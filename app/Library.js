class LibraryClass extends Map {
  constructor() {
    super()
  };
  static * build(dir) {
    var library = new LibraryClass();
    /* Generators */
    function Game(name, banner = null) {
      this.name = name;
      this.banner = banner
    };
    function* buildGames(gamesList, bannersList) {
      for (var gameFileName of gamesList) {
        // Check game compliancy
        if (/^(?:\d{2})--(?:.{1,})\.(?:lnk|url)$/.test(gameFileName)) {
          let matches = /^(\d{2})--(.{1,})\.(?:lnk|url)$/.exec(gameFileName),
            bannerFileName = bannersList.find(el => new RegExp('^' + matches[2] + '.(?:png|jpg|jpeg|gif)$').test(el));
          yield [Number(matches[1]), new Game(matches[2], bannerFileName)]
        }
      }
    };
    function Category(name, color, games, pwd = null) {
      this.name = name;
      this.color = color;
      this.games = games;
      this.pwd = pwd
    };
    function* buildCategories(categoriesList) {
      for (var categoryDirName of categoriesList) {
        // Check category compliancy
        let matches, categoryName;
        if (/^(?:\d{2})--(?:.{1,})--(?:\w{6})$/.test(categoryDirName)) {
          matches = /^(\d{2})--(.{1,})--(\w{6})$/.exec(categoryDirName);
          categoryName = matches[2]
        } else if (/^secret--(?:[a-z]{1,})$/.test(categoryDirName)) {
          matches = /^secret--([a-z]{1,})$/.exec(categoryDirName);
          categoryName = 'Secret'
        } else continue;
        // Add games to category
        var games = new Map();
        let gamesList = fs.readdirSync(path.join(dir, 'games', categoryDirName)),
          bannersList = (fs.existsSync(path.join(dir, 'banners', categoryName))) ?
            fs.readdirSync(path.join(dir, 'banners', categoryName)) : [];
        let gameBuilder = buildGames(gamesList, bannersList);
        var gameBuilderYield = gameBuilder.next();
        while (!gameBuilderYield.done) {
          games.set(...gameBuilderYield.value);
          gameBuilderYield = gameBuilder.next()
        };
        yield (categoryName !== 'Secret') ?
          [Number(matches[1]), new Category(...matches.slice(2), games)] :
          ['secret', new Category('Secret', 'fa0606', games, matches[1])]
      }
    };
    /* Config dir initialization */
    LibraryClass.initDir(dir);
    /* Add categories */
    let categoriesList = fs.readdirSync(path.join(dir, 'games'));
    if (categoriesList.length > 0) {
      var i = 0;
      yield (i++) / categoriesList.length;
      let categoryBuilder = buildCategories(categoriesList);
      var categoryBuilderYield = categoryBuilder.next();
      while (!categoryBuilderYield.done) {
        library.set(...categoryBuilderYield.value);
        categoryBuilderYield = categoryBuilder.next();
        yield (i++) / categoriesList.length;
      }
    } else yield 1.1;
    return library
  };
  static initDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    if (!fs.existsSync(path.join(dir, 'games'))) fs.mkdirSync(path.join(dir, 'games'));
    if (!fs.existsSync(path.join(dir, 'banners'))) fs.mkdirSync(path.join(dir, 'banners'));
    if (!fs.existsSync(path.join(dir, 'backgrounds'))) fs.mkdirSync(path.join(dir, 'backgrounds'));
    if (!fs.existsSync(path.join(dir, 'musics'))) fs.mkdirSync(path.join(dir, 'musics'))
  };
  get size() {
    return super.size - this.hasSecret
  };
  get hasSecret() {
    return this.has('secret')
  };
  search(index, inverseOrder = false, loop = false) {
    if (index === null) return null
    else if (index === 'secret') index = this.size;
    var keys = [];
    for (var key of this.keys()) if (key !== 'secret') keys.push(key);
    var target = (!inverseOrder) ? index + 1 : index - 1;
    if (loop) target = (!inverseOrder) ? target % keys.length : (target + keys.length) % keys.length
    else if (!loop && (0 > target || target >= keys.length)) target = null;
    return (target !== null) ? keys[target] : null
  }
}

module.exports = class Library {
  constructor(dir, path, fs) {
    this.Dir = dir;
    this.path = path;
    this.fs = fs;

    this.categories = [];
    this.edgyCrap = false;
    this.categoriesCount = 0;
    this.games = {};
    this.gamesCounts = {}
  };

  initDir() {
    let self = this;
    return new Promise(function (resolve, reject) {
      try {
        if (!self.fs.existsSync(self.Dir)) self.fs.mkdirSync(self.Dir);
        if (!self.fs.existsSync(self.path.join(self.Dir, 'games'))) self.fs.mkdirSync(self.path.join(self.Dir, 'games'));
        if (!self.fs.existsSync(self.path.join(self.Dir, 'banners'))) self.fs.mkdirSync(self.path.join(self.Dir, 'banners'));
        if (!self.fs.existsSync(self.path.join(self.Dir, 'backgrounds'))) self.fs.mkdirSync(self.path.join(self.Dir, 'backgrounds'));
        if (!self.fs.existsSync(self.path.join(self.Dir, 'musics'))) self.fs.mkdirSync(self.path.join(self.Dir, 'musics'))
      } catch (error) {
        reject("Failed to initialize configuration directory : " + error)
      };
      resolve(self)
    })
  };
  loadCategories() {
    let self = this;
    return new Promise(function (resolve, reject) {
      try {
        var categoriesList = self.fs.readdirSync(self.path.join(self.Dir, 'games'))
      } catch (error) {
        reject("Failed to fetch categories : " + error)
      };
      function Category(name, color, pwd = null) {
        this.name = name;
        this.color = color;
        this.pwd = pwd
      };
      for (var category of categoriesList) {
        if (category.split('--')[0] !== 'secret') {
          self.categories.push(new Category(category.split('--')[1], category.split('--')[2]));
        } else {
          self.categories.push(new Category('Secret', 'fa0606', category.split('--')[1]));
          self.edgyCrap = true
        }
      };
      self.categoriesCount = self.categories.length - self.edgyCrap;
      resolve(self)
    })
  };
  loadGames() {
    let self = this;
    return new Promise(function (resolve, reject) {
      for (var category in self.categories) {
        var categoryFilename = (self.categories[category].pwd === null) ?
          self.fs.readdirSync(self.path.join(self.Dir, 'games'))
            .find(el => new RegExp('^(\\d{2})--' + self.categories[category].name + '--(\\w{6})$').test(el)) :
          self.fs.readdirSync(self.path.join(self.Dir, 'games'))
            .find(el => new RegExp('^secret--(\\w{1,})$').test(el));
        try {
          self.games[self.categories[category].name] = self.fs.readdirSync(self.path.join(self.Dir, 'games', categoryFilename))
        } catch (error) {
          reject("Failed to fetch games from " + categoryFilename + " : " + error)
        };
        try {
          self.games[self.categories[category].name] = self.games[self.categories[category].name].map(val => val.split('--')[1].split('.')[0])
        } catch (error) {
          self.games[self.categories[category].name] = new Array(self.fs.readdirSync(self.path.join(self.Dir, 'games', categoryFilename)).length)
        }
      };
      self.gamesCounts.total = 0;
      for (var category in self.games) {
        self.gamesCounts.total += self.games[category].length;
        self.gamesCounts[category] = self.games[category].length;
      };
      resolve(self)
    })
  };
  static clean(library) {
    delete library.path;
    delete library.fs;
    return library
  }
}

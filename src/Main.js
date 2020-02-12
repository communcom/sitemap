const core = require('cyberway-core-service');
const BasicMain = core.services.BasicMain;

const env = require('./data/env');
const MongoConnect = require('./services/MongoConnect');
const Filler = require('./services/Filler');
const SitemapGenerator = require('./services/SitemapGenerator');

class Main extends BasicMain {
    constructor() {
        super(env);

        this.startMongoBeforeBoot();

        this._mongoConnect = new MongoConnect();
        this._filler = new Filler({ mongoDb: this._mongoConnect });
        this._sitemapGenerator = new SitemapGenerator();

        this.addNested(this._mongoConnect, this._filler, this._sitemapGenerator);
    }
}

module.exports = Main;

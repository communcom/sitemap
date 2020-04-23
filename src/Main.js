const core = require('cyberway-core-service');
const BasicMain = core.services.BasicMain;

const env = require('./data/env');
const Prism = require('./services/Prism');
const MongoConnect = require('./services/MongoConnect');
const FillerPosts = require('./services/FillerPosts');
const FillerCommunities = require('./services/FillerCommunities');
const SitemapGenerator = require('./services/SitemapGenerator');

class Main extends BasicMain {
    constructor() {
        super(env);

        this.startMongoBeforeBoot();

        this._prism = new Prism();

        this._mongoConnect = new MongoConnect();
        this._fillerPosts = new FillerPosts({ mongoDb: this._mongoConnect });
        this._fillerCommunities = new FillerCommunities({ mongoDb: this._mongoConnect });
        this._sitemapGenerator = new SitemapGenerator();

        this.addNested(
            this._prism,
            this._mongoConnect,
            this._fillerPosts,
            this._fillerCommunities,
            this._sitemapGenerator
        );
    }
}

module.exports = Main;

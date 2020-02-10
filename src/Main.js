const core = require('cyberway-core-service');
const BasicMain = core.services.BasicMain;

const env = require('./data/env');
const Filler = require('./services/Filler');
const SitemapGenerator = require('./services/SitemapGenerator');

class Main extends BasicMain {
    constructor() {
        super(env);

        this.startMongoBeforeBoot();

        this._filler = new Filler();
        this._generator = new SitemapGenerator();
    }

    async start() {
        await super.start();

        this.addNested(this._filler, this._generator);

        if (!env.GLS_PAUSE) {
            await this._filler.start();
            await this._generator.start();
        }
    }
}

module.exports = Main;

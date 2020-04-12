const core = require('cyberway-core-service');
const BasicService = core.services.Basic;

const env = require('../data/env');

const SitemapModel = require('../models/Sitemap');
const DataModel = require('../models/Data');

class AbstractFiller extends BasicService {
    async _getData() {
        let data = DataModel.findOne({}, {}, { lean: true });

        if (!data) {
            data = await DataModel.create({});
        }

        return data;
    }

    async _updateData(updates) {
        return DataModel.updateOne(
            {},
            {
                $set: updates,
            }
        );
    }

    async _getOrCreateLastSitemap() {
        console.log(env.GLS_SITEMAP_SIZE - env.GLS_POSTS_REQUEST_LIMIT);
        let sitemap = await SitemapModel.findOne({
            count: { $lte: env.GLS_SITEMAP_SIZE - env.GLS_POSTS_REQUEST_LIMIT },
        }).sort({
            part: -1,
        });

        if (sitemap) {
            return sitemap;
        }

        const lastSitemap = await SitemapModel.findOne({}, { part: true }).sort({
            part: -1,
        });
        const lastPart = (lastSitemap && lastSitemap.part) || 0;

        const date = new Date();

        return SitemapModel.create({
            part: lastPart + 1,
            count: 0,
            creationTime: date,
            updateTime: date,
        });
    }
}

module.exports = AbstractFiller;

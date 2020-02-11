const core = require('cyberway-core-service');
const BasicService = core.services.Basic;
const Logger = core.utils.Logger;
const { last } = require('ramda');

const env = require('../data/env');
const { wait } = require('../utils/common');

const PrismMongo = require('../controllers/PrismMongo');
const DataModel = require('../models/Data');
const PostModel = require('../models/Post');
const SitemapModel = require('../models/Sitemap');

const POSTS_COUNT = 1000;
const POSTS_REQUEST_INTERVAL = 10000;

class Filler extends BasicService {
    constructor() {
        super();

        this._prismMongo = new PrismMongo({ connector: this });
    }

    async start() {
        await this._prismMongo.boot();

        this._proccess();
    }

    async _proccess() {
        while (true) {
            try {
                this._generate();
            } catch (err) {
                Logger.error('Filler tick failed:', err);
            }

            await wait(env.GLS_FILL_EVERY);
        }
    }

    async _generate() {
        let data = await this._getData();

        if (!data) {
            data = await DataModel.create({});
        }

        let lastTime = data.lastPostTime;

        while (true) {
            const posts = await this._prismMongo.getPosts({
                date: lastTime,
                limit: POSTS_COUNT,
            });

            if (!posts || !posts.length) {
                Logger.info(`Wait for next tick because of end of posts"`);
                break;
            }

            const lastPost = last(posts);
            lastTime = lastPost.updateTime || lastPost.creationTime;

            const sitemap = await this._getOrCreateLastSitemap();

            const { upsertedCount, modifiedCount } = await this._createPosts(sitemap.part, posts);

            const needRegenerate = upsertedCount > 0 || modifiedCount > 0;

            if (needRegenerate) {
                const update = {
                    $inc: { count: upsertedCount },
                    $set: {
                        updateTime: lastTime,
                        needRegenerate,
                        needRegenerateAt: new Date(),
                    },
                };

                await sitemap.updateOne(update);
            }

            await this._updateData({ lastPostTime: lastTime });

            Logger.info(
                `Added ${upsertedCount} and modified ${modifiedCount} posts in sitemap "${sitemap.part}", last time: ${lastTime}`
            );

            await wait(POSTS_REQUEST_INTERVAL);
        }
    }

    async _getData() {
        return await DataModel.findOne({}, {}, { lean: true });
    }

    async _updateData(updates) {
        return await DataModel.updateOne(
            {},
            {
                $set: updates,
            }
        );
    }

    async _getOrCreateLastSitemap() {
        let sitemap = await SitemapModel.findOne({ count: { $lt: env.GLS_SITEMAP_SIZE } }).sort({
            part: -1,
        });

        if (sitemap) {
            return sitemap;
        }

        const lastSitemap = await SitemapModel.findOne({}, { part: true }).sort({ part: -1 });
        const lastPart = (lastSitemap && lastSitemap.part) || 0;

        const date = new Date();

        return await SitemapModel.create({
            part: lastPart + 1,
            count: 0,
            creationTime: date,
            updateTime: date,
        });
    }

    async _createPosts(part, items) {
        const ops = [];
        for (const { updateTime, ...item } of items) {
            ops.push({
                updateOne: {
                    filter: { contentId: item.contentId },
                    update: {
                        $set: { updateTime: updateTime || item.creationTime }, // "or" for support old posts
                        $setOnInsert: {
                            ...item,
                            sitemap: part,
                        },
                    },
                    upsert: true,
                },
            });
        }

        return await PostModel.bulkWrite(ops);
    }
}

module.exports = Filler;

const core = require('cyberway-core-service');
const BasicService = core.services.Basic;
const { last } = require('ramda');

const env = require('../data/env');
const { wait } = require('../utils/common');

const PrismMongo = require('../controllers/PrismMongo');
const PostModel = require('../models/Post');
const SitemapModel = require('../models/Sitemap');

const SITEMAP_SIZE = 10000;
const POSTS_COUNT = 1000;

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
        let lastTime = null;

        while (true) {
            const posts = await this._prismMongo.getPosts({ date: lastTime, limit: POSTS_COUNT });

            if (!posts || !posts.length || posts.length < POSTS_COUNT) {
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

            await wait(1000);
        }
    }

    async _getOrCreateLastSitemap() {
        let sitemap = await SitemapModel.findOne({ count: { $lt: SITEMAP_SIZE } }).sort({
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

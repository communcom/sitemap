const core = require('cyberway-core-service');
const BasicService = core.services.Basic;
const Logger = core.utils.Logger;
const { last } = require('ramda');
const wait = require('then-sleep');

const env = require('../data/env');

const PrismMongo = require('../controllers/PrismMongo');
const DataModel = require('../models/Data');
const PostModel = require('../models/Post');
const SitemapModel = require('../models/Sitemap');

class Filler extends BasicService {
    constructor({ mongoDb, ...options }) {
        super(options);

        this._prismMongo = new PrismMongo({ mongoDb });
    }

    start() {
        this._proccess();
    }

    async _proccess() {
        while (true) {
            try {
                await this._actualizeLate();
                await this._generate();
            } catch (err) {
                Logger.error('Filler tick failed:', err);
            }

            await wait(env.GLS_FILL_EVERY);
        }
    }

    async _actualizeLate() {
        const sitemapsObjects = await SitemapModel.find(
            { late: true },
            { _id: false, part: true, late: true },
            { lean: true, sort: { updateTime: -1 } }
        );

        for (const { part, late } of sitemapsObjects) {
            const count = await PostModel.countDocuments({ sitemap: part, late });

            if (count === 0) {
                await PostModel.findOneAndDelete({ sitemap: part, late });

                Logger.info(`Sitemap "${part}${late ? '_late' : ''}" deleted due 0 count of posts`);
            } else {
                SitemapModel.update(
                    { part, late },
                    {
                        $set: {
                            count,
                        },
                    }
                );

                Logger.info(
                    `Sitemap "${part}${late ? '_late' : ''}" updated count of posts: ${count}`
                );
            }
        }

        Logger.info(`Actualizing done`);
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
                limit: env.GLS_POSTS_REQUEST_LIMIT,
            });

            if (!posts.length) {
                Logger.info(`Wait for next tick because of end of posts`);
                break;
            }

            const lastPost = last(posts);
            lastTime = new Date(lastPost.updateTime || lastPost.creationTime);

            await this._processPosts(posts, lastTime);

            await this._updateData({ lastPostTime: lastTime });

            await wait(env.GLS_POSTS_REQUEST_INTERVAL);
        }
    }

    async _getData() {
        return DataModel.findOne({}, {}, { lean: true });
    }

    async _getOrCreateLastSitemap() {
        let sitemap = await SitemapModel.findOne({
            count: { $lte: env.GLS_SITEMAP_SIZE - env.GLS_POSTS_REQUEST_LIMIT },
            late: false,
        }).sort({
            part: -1,
        });

        if (sitemap) {
            return sitemap;
        }

        const lastSitemap = await SitemapModel.findOne({ late: false }, { part: true }).sort({
            part: -1,
        });
        const lastPart = (lastSitemap && lastSitemap.part) || 0;

        const date = new Date();

        return SitemapModel.create({
            late: false,
            part: lastPart + 1,
            count: 0,
            creationTime: date,
            updateTime: date,
        });
    }

    async _getOrCreateLateSitemap() {
        let sitemap = await SitemapModel.findOne({
            count: { $lte: env.GLS_SITEMAP_SIZE - env.GLS_POSTS_REQUEST_LIMIT },
            late: true,
        }).sort({
            part: -1,
        });

        if (sitemap) {
            return sitemap;
        }

        const lastSitemap = await SitemapModel.findOne({ late: true }, { part: true }).sort({
            part: -1,
        });
        const lastPart = (lastSitemap && lastSitemap.part) || 0;

        const date = new Date();

        return SitemapModel.create({
            late: true,
            part: lastPart + 1,
            count: 0,
            creationTime: date,
            updateTime: date,
        });
    }

    async _processPosts(items, lastTime) {
        const lateDate = new Date();
        lateDate.setDate(lateDate.getDate() - 7);

        const sitemap = await this._getOrCreateLastSitemap();
        const lateSitemap = await this._getOrCreateLateSitemap();

        let late = false;
        const ops = [];
        const lateOps = [];

        for (const { updateTime, ...item } of items) {
            if (!late) {
                late = lateDate < updateTime || lateDate < item.creationTime;
            }

            if (late) {
                lateOps.push({
                    updateOne: {
                        filter: { contentId: item.contentId },
                        update: {
                            $set: {
                                updateTime: updateTime || item.creationTime,
                                late,
                            }, // "or" for support old posts
                            $setOnInsert: {
                                ...item,
                                sitemap: lateSitemap.part,
                            },
                        },
                        upsert: true,
                    },
                });

                continue;
            }

            ops.push({
                updateOne: {
                    filter: { contentId: item.contentId },
                    update: {
                        $set: {
                            updateTime: updateTime || item.creationTime,
                        }, // "or" for support old posts
                        $setOnInsert: {
                            ...item,
                            late: false,
                            sitemap: sitemap.part,
                        },
                    },
                    upsert: true,
                },
            });
        }

        if (ops.length) {
            await this._generatePosts(ops, sitemap, lastTime);
        }

        if (lateOps.length) {
            await this._generatePosts(lateOps, lateSitemap, lastTime);
        }
    }

    async _generatePosts(ops, sitemap, lastTime) {
        const { upsertedCount, modifiedCount } = await PostModel.bulkWrite(ops);

        // need or not to regenerate last sitemap
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

        Logger.info(
            `Added ${upsertedCount} and modified ${modifiedCount} posts in sitemap "${
                sitemap.part
            }${sitemap.late ? '_late' : ''}", last time: ${lastTime.toISOString()}`
        );
    }

    async _updateData(updates) {
        return DataModel.updateOne(
            {},
            {
                $set: updates,
            }
        );
    }
}

module.exports = Filler;

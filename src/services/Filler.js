const { getLateDate } = require('../utils/time');

const core = require('cyberway-core-service');
const Logger = core.utils.Logger;
const { last } = require('ramda');
const wait = require('then-sleep');

const env = require('../data/env');

const AbstractFiller = require('./AbstractFiller');
const PrismMongo = require('../controllers/PrismMongo');
const PostModel = require('../models/Post');
const SitemapModel = require('../models/Sitemap');

class Filler extends AbstractFiller {
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
        const lateDate = getLateDate();

        const sitemapsObjects = await SitemapModel.find(
            { late: true },
            { _id: false, part: true, late: true },
            { lean: true, sort: { updateTime: -1 } }
        );

        for (const { part, late } of sitemapsObjects) {
            const posts = await PostModel.find(
                {
                    $or: [{ creationTime: { $lte: lateDate } }, { updateTime: { $lte: lateDate } }],
                    sitemap: part,
                    late,
                },
                {},
                { lean: true }
            );

            if (!posts.length) {
                continue;
            }

            const lastPost = last(posts);
            const lastTime = new Date(lastPost.updateTime || lastPost.creationTime);

            await this._processPosts(posts, lastTime);

            // const count = await PostModel.countDocuments({ sitemap: part, late });
            //
            // if (count === 0) {
            //     await PostModel.findOneAndDelete({ sitemap: part, late });
            //
            //     Logger.info(`Sitemap "${part}${late ? '_late' : ''}" deleted due 0 count of posts`);
            // } else {
            //     SitemapModel.update(
            //         { part, late },
            //         {
            //             $set: {
            //                 count,
            //             },
            //         }
            //     );
            //
            //     Logger.info(
            //         `Sitemap "${part}${late ? '_late' : ''}" updated count of posts: ${count}`
            //     );
            // }
        }

        Logger.info(`Actualizing done`);
    }

    async _generate() {
        const data = await this._getData();

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

    async _processPosts(items, lastTime, late = false) {
        const lateDate = getLateDate();

        const sitemap = await this._getOrCreateLastSitemap();
        const lateSitemap = await this._getOrCreateLastSitemap(true);

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
                            late: false,
                        }, // "or" for support old posts
                        $setOnInsert: {
                            ...item,
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
}

module.exports = Filler;

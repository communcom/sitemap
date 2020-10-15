const { getLateDate } = require('../utils/time');

const core = require('cyberway-core-service');
const Logger = core.utils.Logger;
const { last } = require('ramda');
const wait = require('then-sleep');

const env = require('../data/env');

const AbstractFiller = require('./AbstractFiller');
const PrismMongo = require('../controllers/PrismMongo');
const PostModel = require('../models/Post');

class FillerPosts extends AbstractFiller {
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

            await wait(env.GLS_POSTS_FILL_EVERY);
        }
    }

    async _actualizeLate() {
        const lateDate = getLateDate();

        // set late false for posts what older than lateDate
        await PostModel.updateMany(
            {
                $or: [{ creationTime: { $lte: lateDate } }, { updateTime: { $lte: lateDate } }],
                late: true,
            },
            {
                $set: {
                    late: false,
                },
            }
        );

        // set late false for posts which does not fit in sitemap size
        const latePost = await PostModel.findOne({
            late: true,
        }).skip(500);

        if (latePost) {
            await PostModel.updateMany(
                {
                    $or: [
                        { creationTime: { $lte: latePost.creationTime } },
                        { updateTime: { $lte: latePost.updateTime } },
                    ],
                    late: true,
                },
                {
                    $set: {
                        late: false,
                    },
                }
            );
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

    async _processPosts(items, lastTime) {
        const lateDate = getLateDate();

        const sitemap = await this._getOrCreateLastSitemap('posts');

        let late = false;
        const ops = [];

        for (const { updateTime, ...item } of items) {
            if (!late) {
                late = lateDate < updateTime || lateDate < item.creationTime;
            }

            ops.push({
                updateOne: {
                    filter: { contentId: item.contentId },
                    update: {
                        $set: {
                            updateTime: updateTime || item.creationTime,
                            late,
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
            }", last time: ${lastTime.toISOString()}`
        );
    }
}

module.exports = FillerPosts;

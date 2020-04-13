const { getLateDate } = require('../utils/time');

const core = require('cyberway-core-service');
const Logger = core.utils.Logger;
const { last } = require('ramda');
const wait = require('then-sleep');

const env = require('../data/env');

const AbstractFiller = require('./AbstractFiller');
const PrismMongo = require('../controllers/PrismMongo');
const CommunityModel = require('../models/Community');

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
                await this._generate();
            } catch (err) {
                Logger.error('Filler tick failed:', err);
            }

            await wait(env.GLS_COMMUNITIES_FILL_EVERY);
        }
    }

    async _generate() {
        const data = await this._getData();

        let lastTime = data.lastCommunityTime;

        while (true) {
            const communities = await this._prismMongo.getCommunities({
                date: lastTime,
                limit: env.GLS_COMMUNITIES_REQUEST_LIMIT,
            });

            if (!communities.length) {
                Logger.info(`Wait for next tick because of end of communities`);
                break;
            }

            const lastCommunity = last(communities);
            lastTime = new Date(lastCommunity.updateTime || lastCommunity.creationTime);

            await this._processCommunities(communities, lastTime);

            await this._updateData({ lastCommunityTime: lastTime });

            await wait(env.GLS_COMMUNITIES_REQUEST_INTERVAL);
        }
    }

    async _processCommunities(items, lastTime) {
        const sitemap = await this._getOrCreateLastSitemap('communities');

        const ops = [];

        for (const { updateTime, ...item } of items) {
            ops.push({
                updateOne: {
                    filter: { communityAlias: item.communityAlias },
                    update: {
                        $set: {
                            updateTime: updateTime || item.creationTime,
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
            await this._generateCommunities(ops, sitemap, lastTime);
        }
    }

    async _generateCommunities(ops, sitemap, lastTime) {
        const { upsertedCount, modifiedCount } = await CommunityModel.bulkWrite(ops);

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
            `Added ${upsertedCount} and modified ${modifiedCount} communities in sitemap "${
                sitemap.part
            }", last time: ${lastTime.toISOString()}`
        );
    }
}

module.exports = FillerPosts;

const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const Logger = core.utils.Logger;
const { MongoClient } = require('mongodb');

const env = require('../data/env');

class PrismMongo extends BasicController {
    async boot() {
        this._client = await this._initializeClient();
    }

    async _initializeClient() {
        return new Promise((resolve, reject) => {
            const client = new MongoClient(env.GLS_PRISM_MONGO_CONNECT);

            client.connect((err, client) => {
                if (err) {
                    Logger.error('Error while connectiong to prism MongoDB: ', err);
                    reject(err);
                    return;
                }

                Logger.info('Successfully connected to prisma MongoDB');

                resolve(client);
            });
        });
    }

    _collection({ name }) {
        const db = this._client.db();
        return db.collection(name);
    }

    async getPosts({ date, limit = 1000 }) {
        const query = {};

        if (date) {
            query.$or = [
                { 'meta.creationTime': { $gt: date } },
                { 'meta.updateTime': { $gt: date } },
            ];
        }

        const aggregation = [
            { $match: query },
            {
                $sort: {
                    'meta.updateTime': 1,
                    'meta.creationTime': 1,
                },
            },
            {
                $limit: limit,
            },
            {
                $lookup: {
                    from: 'profiles',
                    localField: 'contentId.userId',
                    foreignField: 'userId',
                    as: 'profile',
                },
            },
            {
                $lookup: {
                    from: 'communities',
                    localField: 'contentId.communityId',
                    foreignField: 'communityId',
                    as: 'community',
                },
            },
            {
                $addFields: {
                    creationTime: '$meta.creationTime',
                    updateTime: '$meta.updateTime',
                },
            },
            {
                $project: {
                    _id: false,
                    contentId: true,
                    author: {
                        $let: {
                            vars: {
                                profile: { $arrayElemAt: ['$profile', 0] },
                            },
                            in: {
                                username: '$$profile.username',
                            },
                        },
                    },
                    community: {
                        $let: {
                            vars: {
                                community: { $arrayElemAt: ['$community', 0] },
                            },
                            in: {
                                alias: '$$community.alias',
                            },
                        },
                    },
                    creationTime: true,
                    updateTime: true,
                },
            },
        ];

        return this._collection({ name: 'posts' })
            .aggregate(aggregation)
            .toArray();
    }
}

module.exports = PrismMongo;

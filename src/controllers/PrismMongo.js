const { MongoClient } = require('mongodb');
const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;

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
                    reject(err);
                    return;
                }
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
            query['meta.creationTime'] = { $gt: date };
            query['meta.updateTime'] = { $gt: date };
        }

        const aggregation = [
            { $match: query },
            {
                $sort: {
                    'meta.creationTime': 1,
                    'meta.updateTime': 1,
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

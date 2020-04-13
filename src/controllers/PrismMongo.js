const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;

class PrismMongo extends BasicController {
    constructor({ mongoDb, ...options } = {}) {
        super(options);

        this._mongoDb = mongoDb;
    }

    _collection({ name }) {
        const db = this._mongoDb.getClient().db();
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
                    authorUsername: { $arrayElemAt: ['$profile.username', 0] },
                    communityAlias: { $arrayElemAt: ['$community.alias', 0] },
                    creationTime: true,
                    updateTime: true,
                },
            },
        ];

        return this._collection({ name: 'posts' })
            .aggregate(aggregation)
            .toArray();
    }

    async getCommunities({ date, limit = 1000 }) {
        const query = {};

        if (date) {
            query.$or = [{ createdAt: { $gt: date } }, { updatedAt: { $gt: date } }];
        }

        const aggregation = [
            { $match: query },
            {
                $sort: {
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
            {
                $limit: limit,
            },
            {
                $addFields: {
                    communityAlias: '$alias',
                    creationTime: '$createdAt',
                    updateTime: '$updatedAt',
                },
            },
            {
                $project: {
                    _id: false,
                    communityAlias: true,
                    creationTime: true,
                    updateTime: true,
                },
            },
        ];

        return this._collection({ name: 'communities' })
            .aggregate(aggregation)
            .toArray();
    }
}

module.exports = PrismMongo;

const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Post',
    {
        sitemap: {
            type: Number,
            required: true,
        },
        contentId: {
            communityId: {
                type: String,
                required: true,
            },
            userId: {
                type: String,
                required: true,
            },
            permlink: {
                type: String,
                required: true,
            },
        },
        author: {
            username: {
                type: String,
                required: true,
            },
        },
        community: {
            alias: {
                type: String,
                required: true,
            },
        },
        creationTime: {
            type: Date,
            default: null,
        },
        updateTime: {
            type: Date,
            default: null,
        },
    },
    {
        index: [
            {
                fields: {
                    'contentId.userId': 1,
                    'contentId.permlink': 1,
                    'contentId.communityId': 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                fields: {
                    sitemap: 1,
                },
            },
            {
                fields: {
                    sitemap: 1,
                },
            },
        ],
    }
);

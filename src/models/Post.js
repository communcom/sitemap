const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Post',
    {
        late: {
            type: Boolean,
            default: false,
            required: true,
        },
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
        authorUsername: {
            type: String,
            required: true,
        },
        communityAlias: {
            type: String,
            required: true,
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
                    late: 1,
                },
            },
            {
                fields: {
                    creationTime: 1,
                    updateTime: 1,
                    sitemap: 1,
                    late: 1,
                },
            },
        ],
    }
);

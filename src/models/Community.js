const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Community',
    {
        sitemap: {
            type: Number,
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
                    communityAlias: 1,
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
        ],
    }
);

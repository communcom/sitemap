const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Sitemap',
    {
        late: {
            type: Boolean,
            default: false,
        },
        part: {
            type: Number,
            required: true,
        },
        count: {
            type: Number,
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
        needRegenerate: {
            type: Boolean,
            default: false,
        },
        needRegenerateAt: {
            type: Date,
            default: null,
        },
    },
    {
        index: [
            {
                fields: {
                    lastPostTime: 1,
                },
            },
            {
                fields: {
                    count: 1,
                    part: -1,
                },
            },
            {
                fields: {
                    part: -1,
                },
            },
            {
                fields: {
                    needRegenerate: 1,
                    count: 1,
                    part: -1,
                },
            },
            {
                fields: {
                    count: 1,
                    updateTime: -1,
                },
            },
            {
                fields: {
                    part: 1,
                    needRegenerateAt: 1,
                },
            },
        ],
    }
);

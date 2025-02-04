const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Sitemap',
    {
        type: {
            type: String,
            required: true,
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
                    type: 1,
                }
            },
            {
                fields: {
                    type: 1,
                    count: 1,
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

const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Sitemap',
    {
        late: {
            type: Boolean,
            default: false,
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
                    late: 1,
                },
            },
            {
                fields: {
                    count: 1,
                },
            },
            {
                fields: {
                    count: 1,
                    late: 1,
                    part: -1,
                },
            },
            {
                fields: {
                    late: 1,
                    part: -1,
                },
            },
            {
                fields: {
                    needRegenerate: 1,
                    late: 1,
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
                    late: 1,
                },
            },
        ],
    }
);

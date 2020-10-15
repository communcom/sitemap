const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Data',
    {
        lastPostTime: {
            type: Date,
            default: null,
        },
        lastCommunityTime: {
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
                    lastCommunityTime: 1,
                },
            },
        ],
    }
);

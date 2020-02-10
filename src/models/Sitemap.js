const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel('Sitemap', {
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
});

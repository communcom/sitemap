const core = require('cyberway-core-service');
const BasicService = core.services.Basic;
const { Logger } = core.utils;
const wait = require('then-sleep');

const env = require('../data/env');
const {
    createCommonSitemap,
    createIndexSitemap,
    createSitemap,
    postToSitemapXml,
    communityToSitemapXml,
} = require('../utils/sitemap');
const { formatDate } = require('../utils/time');
const commonList = require('../data/commonList');

const PostModel = require('../models/Post');
const CommunityModel = require('../models/Community');
const SitemapModel = require('../models/Sitemap');

const CHUNK_SIZE = 1000;

class SitemapGenerator extends BasicService {
    start() {
        this._proccess();
    }

    async _proccess() {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                await this._generateBulk();
            } catch (err) {
                Logger.error('SitemapGenerator tick failed:', err);
            }

            await wait(env.GLS_SITEMAP_GENERATE_EVERY);
        }
    }

    async _generateBulk() {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const sitemapsUpdated = await this._generateParts('posts');

            if (sitemapsUpdated < CHUNK_SIZE) {
                break;
            }
        }

        await this._generatePostsLate();

        while (true) {
            const sitemapsUpdated = await this._generateParts('communities');

            if (sitemapsUpdated < CHUNK_SIZE) {
                break;
            }
        }

        await this._generateCommonSitemap();
        await this._writeIndexSitemap();
    }

    async _generateParts(type) {
        const generateStartTime = new Date();

        const sitemapsObjects = await SitemapModel.find(
            { type, needRegenerate: true },
            { _id: false, part: true },
            { lean: true, limit: CHUNK_SIZE, sort: { part: -1 } }
        );

        const parts = sitemapsObjects.map(({ part }) => part);

        for (const part of parts) {
            try {
                switch (type) {
                    case 'posts':
                        await this._generatePostsPart(part);
                        break;
                    case 'communities':
                        await this._generateCommunitiesPart(part);
                        break;
                    default:
                        throw Error('Wrong type for generateParts', type);
                }
            } catch (err) {
                Logger.error(`Can't create sitemap for part: (${part}) ${type}:`, err);
            }
        }

        await SitemapModel.updateMany(
            {
                $and: [
                    {
                        type,
                    },
                    {
                        part: {
                            $in: parts,
                        },
                    },
                    {
                        needRegenerateAt: {
                            $lte: generateStartTime,
                        },
                    },
                ],
            },
            {
                $set: {
                    needRegenerate: false,
                    needRegenerateAt: null,
                },
            }
        );

        return sitemapsObjects.length;
    }

    async _generatePostsPart(part) {
        const posts = await PostModel.aggregate([
            {
                $match: {
                    sitemap: part,
                    $or: [{ late: false }, { late: { $exists: false } }],
                },
            },
            {
                $sort: {
                    updateTime: -1,
                },
            },
            {
                $project: {
                    sitemap: true,
                    contentId: true,
                    authorUsername: true,
                    communityAlias: true,
                    creationTime: true,
                    updateTime: true,
                },
            },
        ]);

        const xmlLines = posts.map(postToSitemapXml);

        await createSitemap(xmlLines, `posts_${part}`);

        Logger.info(`Created sitemap "${part}" with ${posts.length} posts`);
    }

    async _generateCommunitiesPart(part) {
        const posts = await CommunityModel.aggregate([
            {
                $match: {
                    sitemap: part,
                },
            },
            {
                $sort: {
                    updateTime: -1,
                },
            },
            {
                $project: {
                    sitemap: true,
                    communityAlias: true,
                    creationTime: true,
                    updateTime: true,
                },
            },
        ]);

        const xmlLines = posts.map(communityToSitemapXml);

        await createSitemap(xmlLines, `communities_${part}`);

        Logger.info(`Created sitemap "${part}" with ${posts.length} communities`);
    }

    async _generatePostsLate() {
        const posts = await PostModel.aggregate([
            {
                $match: {
                    late: true,
                },
            },
            {
                $sort: {
                    updateTime: -1,
                },
            },
            {
                $project: {
                    contentId: true,
                    authorUsername: true,
                    communityAlias: true,
                    creationTime: true,
                    updateTime: true,
                },
            },
        ]);

        const xmlLines = posts.map(postToSitemapXml);

        await createSitemap(xmlLines, 'posts_late');

        Logger.info(`Created sitemap "late" with ${posts.length} posts`);
    }

    async _generateCommonSitemap() {
        await createCommonSitemap(commonList);

        Logger.info(`Created sitemap "common"`);
    }

    async _writeIndexSitemap() {
        return new Promise(async (resolve, reject) => {
            const cursor = SitemapModel.find(
                { count: { $ne: 0 } },
                { _id: false, type: true, part: true, updateTime: true },
                { lean: true, sort: { updateTime: -1 } }
            ).cursor();

            const list = [
                {
                    loc: {
                        '#text': `${env.GLS_HOSTNAME}/sitemap_common.xml`,
                    },
                    lastmod: {
                        '#text': formatDate(new Date()),
                    },
                },
            ];

            const countLatePosts = await PostModel.countDocuments({ late: true });

            if (countLatePosts) {
                list.push({
                    loc: {
                        '#text': `${env.GLS_HOSTNAME}/sitemap_late.xml`,
                    },
                    lastmod: {
                        '#text': formatDate(new Date()),
                    },
                });
            }

            cursor.on('data', ({ type, part, updateTime }) => {
                list.push({
                    loc: {
                        '#text': `${env.GLS_HOSTNAME}/sitemap_${type}_${part}.xml`,
                    },
                    lastmod: {
                        '#text': formatDate(updateTime),
                    },
                });
            });

            cursor.on('close', async () => {
                try {
                    await createIndexSitemap(list);

                    Logger.info(`Created index sitemap with ${list.length} entries`);

                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });
    }
}

module.exports = SitemapGenerator;

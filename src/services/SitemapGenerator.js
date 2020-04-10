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
} = require('../utils/sitemap');
const commonList = require('../data/commonList');

const PostModel = require('../models/Post');
const SitemapModel = require('../models/Sitemap');

const CHUNK_SIZE = 1000;

function formatDate(date) {
    return date.toJSON().substr(0, 19) + '+00:00';
}

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

            await wait(env.GLS_GENERATE_EVERY);
        }
    }

    async _generateBulk() {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const sitemapsUpdated = await this._generateParts();

            if (sitemapsUpdated < CHUNK_SIZE) {
                break;
            }
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const sitemapsUpdated = await this._generateParts(true);

            if (sitemapsUpdated < CHUNK_SIZE) {
                break;
            }
        }

        await this._generateCommonSitemap();
        await this._writeIndexSitemap();
    }

    async _generateParts(late = false) {
        const generateStartTime = new Date();

        const sitemapsObjects = await SitemapModel.find(
            { needRegenerate: true, late },
            { _id: false, part: true },
            { lean: true, limit: CHUNK_SIZE, sort: { part: -1 } }
        );

        const parts = sitemapsObjects.map(({ part }) => part);

        for (const part of parts) {
            try {
                await this._generatePart(part, late);
            } catch (err) {
                Logger.error(
                    `Can't create sitemap for part: (${part}${late ? '_late' : ''}):`,
                    err
                );
            }
        }

        await SitemapModel.updateMany(
            {
                $and: [
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
                    {
                        late,
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

    async _generatePart(part, late) {
        const posts = await PostModel.aggregate([
            {
                $match: {
                    sitemap: part,
                    late,
                },
            },
            {
                $sort: {
                    updateTime: -1,
                },
            },
            {
                $project: {
                    late: true,
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

        await createSitemap(xmlLines, `${part}${late ? '_late' : ''}`);

        Logger.info(`Created sitemap "${part}${late ? '_late' : ''}" with ${posts.length} posts`);
    }

    async _generateCommonSitemap() {
        await createCommonSitemap(commonList);

        Logger.info(`Created sitemap "common"`);
    }

    async _writeIndexSitemap() {
        return new Promise((resolve, reject) => {
            const cursor = SitemapModel.find(
                { count: { $ne: 0 } },
                { _id: false, part: true, updateTime: true },
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

            cursor.on('data', ({ part, late, updateTime }) => {
                list.push({
                    loc: {
                        '#text': `${env.GLS_HOSTNAME}/sitemap_${part}${late ? '_late' : ''}.xml`,
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

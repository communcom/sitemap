const path = require('path');
const fs = require('fs-extra');
const xmlbuilder = require('xmlbuilder');
const dayjs = require('dayjs');

const env = require('../data/env');

const XML_NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9';

function getChangeFreq(date) {
    const weekAgo = dayjs().subtract(7, 'day');
    const ts = dayjs(date);

    if (ts.isAfter(weekAgo, 'day')) {
        return 'daily';
    }

    const monthAgo = dayjs().subtract(30, 'day');

    if (ts.isAfter(monthAgo, 'day')) {
        return 'weekly';
    }

    return 'monthly';
}

function formatDate(date) {
    return date.toJSON().substr(0, 19) + '+00:00';
}

async function _writeXml(fileName, doc) {
    const fullFileName = path.join(env.GLS_DESTINATION_FOLDER, fileName);
    const swapFullFileName = `${fullFileName}.swap`;

    await fs.writeFile(swapFullFileName, doc.end({ pretty: true }));
    await fs.rename(swapFullFileName, fullFileName);
}

async function createIndexSitemap(list) {
    const doc = xmlbuilder.create(
        {
            sitemapindex: {
                '@xmlns': XML_NAMESPACE,
                sitemap: list,
            },
        },
        { encoding: 'utf-8' }
    );

    await _writeXml('sitemap.xml', doc);
}

async function createCommonSitemap(list) {
    const now = new Date();

    const doc = xmlbuilder.create(
        {
            urlset: {
                '@xmlns': XML_NAMESPACE,
                url: list.map(({ url, changeFreq }) => ({
                    loc: {
                        '#text': `${env.GLS_HOSTNAME}${url}`,
                    },
                    lastmod: {
                        '#text': formatDate(now),
                    },
                    changefreq: {
                        '#text': changeFreq,
                    },
                })),
            },
        },
        { encoding: 'utf-8' }
    );

    await _writeXml('sitemap_common.xml', doc);
}

async function createSitemap(list, part) {
    const doc = xmlbuilder.create(
        {
            urlset: {
                '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
                url: list,
            },
        },
        { encoding: 'utf-8' }
    );

    await _writeXml(`sitemap_${part}.xml`, doc);
}

function postToSitemapXml({ contentId, author, community, creationTime, updateTime }) {
    const username = author.username ? author.username : contentId.userId;
    const date = updateTime || creationTime; // "or" for support old posts

    return {
        loc: {
            '#text': `${env.GLS_HOSTNAME}/${community.alias}/@${username}/${contentId.permlink}`,
        },
        lastmod: {
            '#text': formatDate(date),
        },
        changefreq: {
            '#text': getChangeFreq(date),
        },
    };
}

module.exports = {
    createIndexSitemap,
    createCommonSitemap,
    createSitemap,
    postToSitemapXml,
};

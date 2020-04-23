const { Logger } = require('cyberway-core-service').utils;

const Post = require('./Post');

const ALLOWED_CONTRACTS = ['c.gallery'];

function isAllowedAction({ code, receiver }) {
    return ALLOWED_CONTRACTS.includes(code) && ALLOWED_CONTRACTS.includes(receiver);
}

class Main {
    constructor() {
        this._post = new Post();

        this._clearActions();
    }

    async disperse({ transactions, blockNum, blockTime }) {
        for (const { id, actions } of transactions) {
            for (const action of actions) {
                if (isAllowedAction(action)) {
                    await this._disperseAction(action, { blockNum, blockTime, trxId: id });
                }
            }
        }

        const flow = {
            gallery: [...this._galleryActions],
        };

        for (const stageKey of Object.keys(flow)) {
            await Promise.all(
                flow[stageKey].map(wrappedAction =>
                    wrappedAction().catch(error => {
                        Logger.warn(error);
                    })
                )
            );
        }

        this._clearActions();
    }

    async _disperseAction(action, { blockNum, blockTime, trxId }) {
        const pathName = [action.code, action.action].join('->');
        const communityId = this._extractCommunityId(action);
        const actionArgs = action.args;
        const events = action.events;

        const meta = {
            communityId,
            blockNum,
            blockTime,
            trxId,
            events,
        };

        switch (pathName) {
            case 'c.gallery->remove':
                this._galleryActions.push(() => {
                    return this._post.handleDelete(actionArgs, meta);
                });
                break;

            case 'c.gallery->ban':
                this._galleryActions.push(() => {
                    return this._post.handleBan(actionArgs);
                });
                break;
        }
    }

    _extractCommunityId(action) {
        const calledCodeName = action.code;

        return calledCodeName.split('.')[0];
    }

    _clearActions() {
        this._galleryActions = [];
    }
}

module.exports = Main;

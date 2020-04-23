const core = require('cyberway-core-service');
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const { Logger } = core.utils;

const env = require('../data/env');
const MainPrismController = require('../controllers/prism/Main');

class Prism extends BasicService {
    constructor({ imagesMeta, ...options } = {}) {
        super(options);

        this.getEmitter().setMaxListeners(Infinity);
    }

    async start() {
        this._blockInProcessing = false;
        this._blockQueue = [];
        this._recentTransactions = new Set();
        this._mainPrismController = new MainPrismController();

        this._subscriber = new BlockSubscribe({
            handler: this._handleEvent.bind(this),
        });

        const lastBlockInfo = await this._subscriber.getLastBlockMetaData();
        Logger.info('Last block info:', lastBlockInfo);

        try {
            await this._subscriber.start();
        } catch (error) {
            Logger.error('Cant start block subscriber:', error);
        }
    }

    /**
     * Обработка событий из BlockSubscribe.
     * @param {'BLOCK'|'FORK'|'IRREVERSIBLE_BLOCK'} type
     * @param {Object} data
     * @private
     */
    async _handleEvent({ type, data }) {
        switch (type) {
            case BlockSubscribe.EVENT_TYPES.BLOCK:
                await this._registerNewBlock(data);
                break;
            default:
        }
    }

    async _registerNewBlock(block) {
        this._blockQueue.push(block);
        await this._handleBlockQueue(block.blockNum);
    }

    async _handleBlockQueue() {
        if (this._blockInProcessing) {
            return;
        }

        this._blockInProcessing = true;

        let block;

        while ((block = this._blockQueue.shift())) {
            await this._handleBlock(block);
        }

        this._blockInProcessing = false;
    }

    async _handleBlock(block) {
        try {
            await this._mainPrismController.disperse(block);

            this._emitHandled(block);
        } catch (error) {
            Logger.error(`Cant disperse block, num: ${block.blockNum}, id: ${block.id}`, error);
            process.exit(1);
        }
    }

    _emitHandled(block) {
        const blockNum = block.blockNum;

        this.emit('blockDone', blockNum);

        for (const transaction of block.transactions) {
            if (!transaction || !transaction.actions) {
                Logger.warn(`Empty transaction - ${blockNum}`);
                return;
            }

            const id = transaction.id;

            this.emit('transactionDone', id);

            this._recentTransactions.add(id);

            setTimeout(
                // Clean lexical scope for memory optimization
                (id => () => this._recentTransactions.delete(id))(id),
                env.GLS_RECENT_TRANSACTION_ID_TTL
            );
        }
    }
}

module.exports = Prism;

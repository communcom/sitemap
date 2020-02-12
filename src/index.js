if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
require('cyberway-core-service').utils.defaultStarter(require('./Main'));

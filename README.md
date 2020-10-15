# SITEMAP-SERVICE

**SITEMAP-SERVICE** is a service that creates a sitemap of a site based on the disperse of CyberWay blockchain data of commun DAP, the result of which gets into the path [commun.com/sitemap.xml ](https://commun.com/sitemap.xml).

Dependencies:

[prism-service](https://github.com/communcom/prism) must be run

To run:

-  Install `docker` and `docker-compose`
-  Set the required ENV variables to the `.env` file (the template is in the `.env.example`)
-  Call the command `docker-compose up --build` in the root of the project

Possible environment variables ʻENV`:

-   `GLS_BLOCKCHAIN_BROADCASTER_CLIENT_NAME` - name of the client to connect to the sender mailer.
-   `GLS_BLOCKCHAIN_BROADCASTER_CONNECT` - connection string to the block sender, may contain authorization.
-   `GLS_RECENT_TRANSACTION_ID_TTL` - storage interval for identifiers of processed transactions. 
    The default value is `180000` _ (3 minutes) _
-    `GLS_PRISM_MONGO_CONNECT` - connection string to the MongoDB prism service database.
-    `GLS_MONGO_CONNECT` - MongoDB database connection string for storing service data.

-    `GLS_SITEMAP_GENERATE_EVERY` - sitemap generation interval. The default value is `3600000` _ (1 hour) _
-    `GLS_DESTINATION_FOLDER` - folder where sitemap's xml will be located. The default value is `./sitemap`
-    `GLS_HOSTNAME` - site address that will be specified in sitemap's the paths. The default value is `https://commun.com`
-    `GLS_SITEMAP_SIZE` - maximum number of items in one part of the sitemap. The default value is `40000` items
-    `GLS_LATE_DAYS_COUNT` - for what period of time posts are considered fresh and get into the main sitemap. The default value is `7` days
-    `GLS_POSTS_FILL_EVERY` - interval of replenishment of the database with new posts. The default value is `1800000` _ (30 minutes) _
-    `GLS_POSTS_REQUEST_LIMIT` - limit on the number of items in one request for posts. The default value is `1000` items
-    `GLS_POSTS_REQUEST_INTERVAL` - interval between requests for posts. The default value is `10000` _ (10 seconds) _
-    `GLS_COMMUNITIES_FILL_EVERY` - interval of replenishment of the database with new communities. The default value is `86400000` _ (1 day) _
-    `GLS_COMMUNITIES_REQUEST_LIMIT` - limit on the number of items in one request for communities. The default value is `1000` items
-    `GLS_COMMUNITIES_REQUEST_INTERVAL` - interval between requests for communities. The default value is `30000` _ (30 seconds) _



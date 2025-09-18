/**
 * This template is a production ready boilerplate for developing with `PlaywrightCrawler`.
 * Use this to bootstrap your projects using the most up-to-date code.
 * If you're looking for examples or want to learn more, see README.
 */

// For more information, see https://docs.apify.com/sdk/js
import { Actor } from 'apify';
// For more information, see https://crawlee.dev
import { enqueueLinks, PlaywrightCrawler } from 'crawlee';

// this is ESM project, and as such, it requires you to specify extensions in your relative imports
// read more about this here: https://nodejs.org/docs/latest-v18.x/api/esm.html#mandatory-file-extensions
// note that we need to use `.js` even when inside TS files
import { router } from './routes.js';
import { start } from 'repl';

interface Input {
    startUrls: (string | { url: string })[];
    maxRequestsPerCrawl: number;
}

// Initialize the Apify SDK
await Actor.init();



// Structure of input is defined in input_schema.json
const { startUrls = ['https://www.ebay.com/itm/277297314715','https://www.govdeals.com/en/asset/30734/3934','https://shopgoodwill.com/item/237682556',
    'https://auctions.yahoo.co.jp/jp/auction/l1195204499','https://buyee.jp/item/jdirectitems/auction/t1194609512'], maxRequestsPerCrawl = 100 } =
    (await Actor.getInput<Input>()) ?? ({} as Input);
const proxyConfiguration = await Actor.createProxyConfiguration();

console.log(startUrls);
const requests = startUrls.map(u => {
    const actualUrl = typeof u === 'string' ? u : u.url;
    let label = 'default';

    if (actualUrl.includes('ebay')) label = 'ebay';
    else if (actualUrl.includes('govdeals')) label = 'govdeals';
    else if (actualUrl.includes('shopgoodwill')) label = 'shopgoodwill';
    else if (actualUrl.includes('yahoo.co.jp')) label = 'yahoo';
    else if (actualUrl.includes('buyee.jp')) label = 'buyee';

    return { url: actualUrl,
        label:label };
});
console.log(requests)
const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    maxRequestsPerCrawl,
    requestHandler: router,
    launchContext: {
        launchOptions: {
            args: [
                '--disable-gpu', // Mitigates the "crashing GPU process" issue in Docker containers
            ],
        },
    },
});
await crawler.addRequests(requests);
console.log(`Adding ${requests.length} requests to the queue`);
await crawler.run();

// Exit successfully
await Actor.exit();

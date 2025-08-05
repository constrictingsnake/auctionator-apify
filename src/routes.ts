import { createPlaywrightRouter, Dataset } from 'crawlee';

export const router = createPlaywrightRouter();


function ebayDurationToISO(durationStr: String) {
    // Normalize and extract numbers
    const days = parseInt((durationStr.match(/(\d+)\s*d/) || [])[1]) || 0;
    const hours = parseInt((durationStr.match(/(\d+)\s*h/) || [])[1]) || 0;
    const minutes = parseInt((durationStr.match(/(\d+)\s*m/) || [])[1]) || 0;

    // Calculate total milliseconds from now
    const totalMs = ((days * 24 * 60) + (hours * 60) + minutes) * 60 * 1000;

    // Add to current time
    const endDate = new Date(Date.now() + totalMs);

    return endDate.toISOString(); // Standard ISO 8601
}


router.addDefaultHandler(async ({ log }) => {
    log.info(`unlabeled url`);
    
});

router.addHandler('default', async ({ request, page, log }) => {
    const title = await page.title();
    log.info(`Ran the default label handler`);

    await Dataset.pushData({
        url: request.loadedUrl,
        title,
    });
});

router.addHandler('ebay', async ({ request, page, log}) => {
    const platform = 'ebay';
    const itemTitle = await page.locator('.x-item-title__mainTitle').innerText();
    const currentPrice = await page.locator('.x-price-primary').innerText();
    const bids = await page.locator('.x-bid-count').innerText();
    const endTime = ebayDurationToISO(await page.locator('[data-testid="ux-timer_timer"]').innerText());

    log.info(`${itemTitle}`);
    log.info(`${currentPrice}`);
    log.info(`${bids}`);
    log.info(`${endTime}`);

    await Dataset.pushData({
        url: request.loadedUrl,
        itemTitle,
    });
});

router.addHandler('govdeals', async ({ request, page, log}) => {
    const title = await page.title();
    log.info(`${title}`, { url: request.loadedUrl });

    await Dataset.pushData({
        url: request.loadedUrl,
        title,
    });
});

router.addHandler('shopgoodwill', async ({ request, page, log}) => {
    const title = await page.title();
    log.info(`${title}`, { url: request.loadedUrl });

    await Dataset.pushData({
        url: request.loadedUrl,
        title,
    });
});

router.addHandler('yahoo', async ({ request, page, log}) => {
    const title = await page.title();
    log.info(`${title}`, { url: request.loadedUrl });

    await Dataset.pushData({
        url: request.loadedUrl,
        title,
    });
});

router.addHandler('buyee', async ({ request, page, log}) => {
    const title = await page.title();
    log.info(`${title}`, { url: request.loadedUrl });

    await Dataset.pushData({
        url: request.loadedUrl,
        title,
    });
});
import { createPlaywrightRouter, Dataset } from 'crawlee';
import { stat } from 'fs';

export const router = createPlaywrightRouter();


function ebayDurationToISO(durationStr: String) {
    const days = parseInt((durationStr.match(/(\d+)\s*d/) || [])[1]) || 0;
    const hours = parseInt((durationStr.match(/(\d+)\s*h/) || [])[1]) || 0;
    const minutes = parseInt((durationStr.match(/(\d+)\s*m/) || [])[1]) || 0;

    const totalMs = ((days * 24 * 60) + (hours * 60) + minutes) * 60 * 1000;

    const endDate = new Date(Date.now() + totalMs);

    return endDate.toISOString(); 
}

function GovDealsConvertToISO(dateStr: String) {


    const months:Record<string, string> = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    };

    const regex = /([A-Za-z]+) (\d{2}), (\d{4}) (\d{2}):(\d{2}) (AM|PM) ([A-Z]+)/;
    const match = dateStr.match(regex);

    if (!match) throw new Error("Invalid date format");

    let [, monthStr, day, year, hour, minute, meridian, tz] = match;
    const month = months[monthStr];
    let hours = parseInt(hour, 10);


    if (meridian === 'PM' && hours !== 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;

    
    const tzOffsets: Record<string, string> = {
        EST: '-05:00', EDT: '-04:00',
        CST: '-06:00', CDT: '-05:00',
        MST: '-07:00', MDT: '-06:00',
        PST: '-08:00', PDT: '-07:00'
    };         
    const offset = tzOffsets[tz] || 'Z'; 


    return `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${minute}:00${offset}`;
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
    const rawPrice = await page.locator('.x-price-primary').first().innerText();
    let currency = "USD";
    if(!(rawPrice.includes("USD"))) {
        currency = "IDK";
    }
    const strPrice = rawPrice.replace(/\D/g, "");
    const currentPrice = parseFloat(strPrice.slice(0, -2) + "." + strPrice.slice(-2)).toFixed(2);
    const rawbids = await page.locator('.x-bid-count').innerText();
    const rawbidnum = rawbids.replace(/\D/g, "");
    const bids = Number(rawbidnum);
    const endTime = ebayDurationToISO(await page.locator('[data-testid="ux-timer_timer"]').innerText());
    let status = 'Active';
    if (!(new Date(endTime).getTime() > Date.now())) {
        status = 'Ended';
    }
    const itemUrl = request.loadedUrl;

    const iframe = await page.locator('#desc_ifr');
    const iframeUrl = await iframe.getAttribute('src');
    let description = "";
    if (iframeUrl) {
        const response = await page.request.get(iframeUrl);
        const htmlContent = await response.text();
        description = htmlContent;
    }
    
    //const descriptionLocator = page.getByTestId('x-product-details').getByTestId('ux-layout-section-module-evo');
    //const description = await descriptionLocator.innerText();
    const sellerName = await page.getByTestId('x-sellercard-atf').getByRole('link').first().innerText();
    const sellerFeedback =  (await page.locator('.ux-textspans.ux-textspans--SECONDARY').first().innerText()).slice(1, -1);
    const rawText = await page.locator('.ux-textspans.ux-textspans--PSEUDOLINK').filter({ hasText: '% positive' }).innerText();
    const sellerFeedbackPercentage = rawText.split('%')[0];
    log.info(`${itemTitle}`);
    log.info(`${currentPrice}`);
    log.info(`${bids}`);
    log.info(`${status}`);
    log.info(`${endTime}`);
    log.info(`${sellerName}`);
    log.info(`${sellerFeedback}`);
    log.info(`${sellerFeedbackPercentage}`);
    log.info(`${description}`);

    
    await Dataset.pushData({
        itemId: request.loadedUrl.split("/").pop() ?? "",  
        platform: platform,
        url: request.loadedUrl,
        title: itemTitle,
        currentPrice: currentPrice,        
        currency: currency,
        endTime: endTime,                 
        status: status,
        bids: bids,
        description: description,
        sellerName: sellerName,
        sellerFeedback: sellerFeedback,
        sellerFeedbackPercentage: sellerFeedbackPercentage,
        images: [],                        
        metadata: {                       
            scrapedAt: new Date().toISOString()
        }
    });

});

router.addHandler('govdeals', async ({ request, page, log}) => {
    const platform = "govdeals";
    await page.waitForLoadState('networkidle')
    const title = await page.title();
    log.info(`${title}`, { url: request.loadedUrl });
    const itemTitle = await page.locator('.product-title.text-break.h2').innerText();
    let currentPrice = (await page.locator('#currentBid').innerText()).slice(1, -1);
    let currency = "USD";
    currentPrice = currentPrice.slice(0, (currentPrice.length) - 3)
    const bids = -1;
    let endTime = (await page.locator('.numberofbids span:has-text("(")').last().innerText());
    endTime = endTime.slice(1, endTime.length - 1);
    endTime = GovDealsConvertToISO(endTime);
    let status = 'Active';
    if (!(new Date(endTime).getTime() > Date.now())) {
        status = 'Ended';
    }
    const sellerName = await page.locator('div.bid-body p.float-right a').first().innerText();
    const sellerFeedback = "N/A"
    const sellerFeedbackPercentage = "N/A"
    const description = await page.locator('p.long-description .py-3').innerText();
    await Dataset.pushData({
        itemId: request.loadedUrl.split("/").pop() ?? "",  
        platform: platform,
        url: request.loadedUrl,
        title: itemTitle,
        currentPrice: currentPrice,        
        currency: currency,
        endTime: endTime,                  
        status: status,
        bids: bids,
        description: description,
        sellerName: sellerName,
        sellerFeedback: sellerFeedback,
        sellerFeedbackPercentage: sellerFeedbackPercentage,
        images: [],                        
        metadata: {                        
            scrapedAt: new Date().toISOString()
        }
    });
    log.info(`${itemTitle}`);
    log.info(`${currentPrice}`);
    log.info(`${endTime}`);
    log.info(`${status}`);
    log.info(`${sellerName}`);
    log.info(`${sellerFeedback}`);
    log.info(`${sellerFeedbackPercentage}`);
    log.info(`${description}`);

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
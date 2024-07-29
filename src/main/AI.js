import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

// /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome_dev_session"
// сначала использовать это, чтобы создать браузер, к которому puppeteer.connect будет подключаться
// DevTools listening on ws://127.0.0.1:9222/devtools/browser/6cc87c92-3a56-490a-9230-7e2b50b7c74f
// сообщение после ws надо вставить в browserWSEndpoint:

export class AI {
  constructor() {
    this.browser = null;
    this.pages = [];
  }

  async init() {
    this.browser = await puppeteer.connect({
      browserWSEndpoint:
        'ws://127.0.0.1:9222/devtools/browser/27f89448-71c0-4a91-9d1c-11d87d59109d',
    });

    this.pages = await this.browser.pages();
    console.log('Pages count:', this.pages.length);
    // await this.setPage(1, this.self);
  }

  // async setPage(id, self) {
  //   this.pages = await this.browser.pages();
  //   const page = this.pages[id];

  //   if (self) {
  //     await page.waitForSelector('#systemPrompt');
  //     await page.type('#systemPrompt', self);
  //   }
  // }

  async generate(text, pageId = 0) {
    console.log('Generating answer...', pageId);

    const page = await this.pages[pageId];
    const inputSelector = 'input[placeholder="Send a message"]';
    await page.waitForSelector(inputSelector);
    await page.click(inputSelector);
    await page.type(inputSelector, text, {
      delay: 100,
    });
    await page.keyboard.press('Enter');

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const answer = await page.evaluate(() => {
      const container = document.querySelector('.pb-24');
      const divs = container.querySelectorAll('div');
      return divs[divs.length - 1].innerText;
    });

    await new Promise((resolve) => setTimeout(resolve, 12000));

    return answer;
  }

  async close() {
    await this.browser.close();
  }
}

async function run() {
  const ai = new AI();
  console.log('Initializing AI...');

  await ai.init();
  const response = await ai.generate('привет', 1);
  console.log(response);
}

run().catch((err) => {
  console.error(err);
});

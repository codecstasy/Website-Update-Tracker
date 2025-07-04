const axios = require('axios');
const cron = require('node-cron');
const crypto = require('crypto');
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

const CHECK_INTERVAL = '0 * * * *';   // 1 hour interval

const TELEGRAM_BOT_TOKEN = config.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = config.TELEGRAM_CHAT_ID;

// Debug logging
console.log('Bot Token:', TELEGRAM_BOT_TOKEN ? 'Found' : 'MISSING');
console.log('Chat ID:', TELEGRAM_CHAT_ID ? 'Found' : 'MISSING');

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

const websites = [
    'https://www.buet.ac.bd/web/#/admission/2',
    'https://cse.buet.ac.bd/home/news_detail/208',
];

let siteHashes = {};

async function fetchWebsite(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });
        return response.data;
    } catch (error) {
        console.error(`Fetch error for ${url}:`, error.message);
        return null;
    }
}

function generateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}

async function sendTelegramAlert(url) {
    try {
        await bot.sendMessage(
            TELEGRAM_CHAT_ID,
            `*Website Update Detected!* \n\n` +
            `*URL:* ${url}\n` +
            `*Change detected at:* ${new Date().toLocaleString()}\n`,
            { parse_mode: 'Markdown' }
        );
        console.log(`✅ Alert sent for ${url}`);
    } catch (error) {
        console.error('❌ Failed to send Telegram alert:', error.message);
    }
}

async function checkForUpdates() {
    console.log(`[${new Date().toLocaleString()}] Checking for updates...`);
    
    for (const url of websites) {
        const content = await fetchWebsite(url);
        if (!content) {
            console.log(`⚠️  Failed to fetch ${url}`);
            continue;
        }

        const currentHash = generateHash(content);
        const previousHash = siteHashes[url];

        if (previousHash && currentHash !== previousHash) {
            console.log(`🔔 Change detected on ${url}`);
            await sendTelegramAlert(url);
        } else if (!previousHash) {
            console.log(`📝 Initial hash stored for ${url}`);
        } else {
            console.log(`✅ No changes on ${url}`);
        }

        siteHashes[url] = currentHash;
    }
}

console.log('🚀 Website monitor started!');
console.log(`📅 Check interval: ${CHECK_INTERVAL}`);
console.log(`👀 Monitoring ${websites.length} websites`);

cron.schedule(CHECK_INTERVAL, checkForUpdates);
checkForUpdates();
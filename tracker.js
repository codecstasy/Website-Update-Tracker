const axios = require('axios');
const cron = require('node-cron');
const crypto = require('crypto');
const TelegramBot = require('node-telegram-bot-api');

const URL = 'https://www.prothomalo.com';
const CHECK_INTERVAL = '*/1 * * * *';   // 1 min interval

require('dotenv').config();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let previousHash = null;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

async function fetchWebsite() {
    try {
        const response = await axios.get(URL, {
            headers: {  // Masking as a non-bot
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });
        return response.data;
    } catch (error) {
        console.error('Fetch error:', error.message);
        return null;
    }
}

function generateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}

async function sendTelegramAlert() {
    await bot.sendMessage(
        TELEGRAM_CHAT_ID,
        `*Website Update Detected!* \n\n` +
        `*URL:* ${URL}\n` +
        `*Change detected at:* ${new Date().toLocaleString()}\n`,
        { parse_mode: 'Markdown' }
    );
}

async function checkForUpdates() {
    console.log(`[${new Date().toLocaleString()}] Checking for updates...`);
    const content = await fetchWebsite();
    if (!content) return;

    const currentHash = generateHash(content);
    console.log('Current hash:', currentHash);

    if (previousHash !== null && currentHash !== previousHash) {
        console.log('Change detected!');
        await sendTelegramAlert();
    } else {
        console.log('No changes found.');
    }

    previousHash = currentHash;
}

console.log('🚀 Monitoring the website!');
cron.schedule(CHECK_INTERVAL, checkForUpdates);
checkForUpdates();
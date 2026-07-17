const KEEP_ALIVE = 14400000;
const TWITCH_URL = 'wss://irc-ws.chat.twitch.tv/';
const SEVEN_TV_URL = 'wss://events.7tv.io/v3';
const BTTV_GLOBAL = "https://api.betterttv.net/3/cached/emotes/global";
const SEVEN_TV_GLOBAL = "https://7tv.io/v3/emote-sets/global";
const SEVEN_TV_USER = "https://7tv.io/v3/users/twitch";
const BTTV_USER = "https://api.betterttv.net/3/cached/users/twitch";
const BADGES_URL = "https://storage-json.vercel.app/api/data/get?id=61430bf9-eca4-4f36-a29a-4ed4f4ead8ce";

const COMMANDS = ['!hide ', '!show ', '!focus ', '!unfocus ', '!hidden', '!focused', '!commands'];

const COMMAND_HELP = [
    `!hide [username] - Hides user's messages from the chat`,
    `!show [username] - Shows user's messages if previously hidden`,
    `!focus [username] - Highlights the user's messages in chat`,
    `!unfocus [username] - Removes the user's previous highlighting`,
    `!hidden - Shows the list of users whose messages are hidden`,
    `!focused - Shows the list of users whose messages are highlighted`,
    `!commands - Shows the list of available commands`
];

const COLORS = [
    'red', 'green', 'blue', 'rgb(178,34,34)', 'rgb(255,127,80)', 'rgb(154,205,50)', 'rgb(255,69,0)',
    'rgb(46,139,87)', 'rgb(218,165,32)', 'rgb(210,105,30)', 'rgb(95,158,160)', 'rgb(30,144,255)',
    'rgb(255,105,180)', 'rgb(138,43,226)', 'rgb(0,255,127)'
];
const channels = new Set();
const hidden = new Set(["Fossabot", "PotatBotat", "Nightbot", "StreamElements"].map((bot) => { return bot.toLowerCase() }));
const highlightUsers = new Set();

const channelEmotes = {};
const updateEmotes = {};
const twitchEmotes = {};
const usernameToId = {};
const idToUsername = {};
const abortControllers = {};

const isFetching = new Set();
const preloadedBadgesSet = new Set();
const subscribed7TV = new Set();
const currentlyRemoving = new Set();
const addedMessages = new Set();

let globalEmotes = {};
let globalBadges = {};
let idToEmoteSet = {};
let emoteSetToId = {};
let profileImages = {};
let maxMessages = 250;
let lastRecAttempt = null;

let BTTVController = new AbortController();
let seventTvController = new AbortController();
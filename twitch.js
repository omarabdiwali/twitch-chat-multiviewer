const KEEP_ALIVE = 14400000; // 4 hours before re-fetch of channel emotes
const BTTV_GLOBAL = "https://api.betterttv.net/3/cached/emotes/global";
const SEVEN_TV_GLOBAL = "https://7tv.io/v3/emote-sets/global";
const SEVEN_TV_USER = "https://7tv.io/v3/users/twitch";
const BTTV_USER = "https://api.betterttv.net/3/cached/users/twitch";
const BADGES_URL = "https://storage-json.vercel.app/api/data/get?id=61430bf9-eca4-4f36-a29a-4ed4f4ead8ce";
const COLORS = [
    'red', 'green', 'blue', 'rgb(178,34,34)', 'rgb(255,127,80)', 'rgb(154,205,50)', 'rgb(255,69,0)',
    'rgb(46,139,87)', 'rgb(218,165,32)', 'rgb(210,105,30)', 'rgb(95,158,160)', 'rgb(30,144,255)',
    'rgb(255,105,180)', 'rgb(138,43,226)', 'rgb(0,255,127)'
];

const channels = new Set();
const roomIds = new Set();
const bots = new Set(["Fossabot", "PotatBotat", "Nightbot", "StreamElements"].map((bot) => { return bot.toLowerCase() }));

const channelEmotes = {};
const updateEmotes = {};
const twitchEmotes = {};
const usernameToId = {};
const idToUsername = {};

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

const getNestedProperty = (data, keys, allowUndefined = true) => {
    let current = data;
    let prevKey = null;
    const errorMessage = `Key '${keys.join(".")}' does not exist.`

    for (const key of keys) {
        if (current === null || current === undefined) {
            if (allowUndefined) return undefined;
            else throw new Error(`${errorMessage} Missing ${prevKey}.${key}.`);
        }
        current = current[key];
        prevKey = key;
    }

    if (current === undefined && !allowUndefined) throw new Error(errorMessage);
    return current;
}

const buildBttvEmoteUrl = (id, imageType) => {
    return `https://cdn.betterttv.net/emote/${encodeURIComponent(id)}/1x.${imageType}`;
}

const build7tvEmoteUrl = (host) => {
    return 'https:' + host + '/1x.avif';
}

const buildTwitchEmoteUrl = (id) => {
    return `https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(id)}/default/dark/1.0`
}

const buildTwitchChannelUrl = (username) => {
    return `https://twitch.tv/${encodeURI(username)}`;
}

const buildProfileImageUrl = (avatarUrl) => {
    return avatarUrl.replace("300x300.png", "70x70.png");
}

const getFromLocalStorage = (key) => {
    try {
        return JSON.parse(window.localStorage.getItem(key));
    } catch (e) {
        return null;
    }
}

const setToLocalStorage = (key, value) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        return;
    }
}

const updateLocalStorage = (id) => {
    if (id in updateEmotes && updateEmotes[id] == 2) return;
    else if (id in updateEmotes) {
        updateEmotes[id] += 1;
        setToLocalStorage(id, id == "global" ? globalEmotes : channelEmotes[id]);
        if (id != "global") {
            const timestampKey = `${id}-timestamp`;
            setToLocalStorage(timestampKey, new Date().getTime());
        }
        return;
    } else {
        updateEmotes[id] = 1;
    }
}

const isValidWebUrl = (string) => {
    const url = URL.parse(string);
    return url !== null && (url.protocol === "http:" || url.protocol === "https:");
}

const pickRandomColor = () => {
    const randIndex = Math.floor(Math.random() * COLORS.length);
    return COLORS[randIndex];
}

const makeColorViewable = (color) => {
    if (color.length != 7) return color;

    const hexVal = color.slice(1);
    let r = parseInt(hexVal.slice(0, 2), 16);
    let g = parseInt(hexVal.slice(2, 4), 16);
    let b = parseInt(hexVal.slice(4, 6), 16);

    const combination = r + g + b;
    if (combination >= 240) return color;

    const remainder = 240 - combination;
    const splitVal = Math.floor(remainder / 3);
    r = Math.min(255, r + splitVal);
    g = Math.min(255, g + splitVal);
    b = Math.min(255, b + splitVal);

    const newHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    return newHex;
}

const setInitialElements = () => {
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => el.remove());
    document.body.innerHTML = '';
    document.body.style.background = 'oklch(12.9% 0.042 264.695)';

    const baseCSS = document.createElement('link');
    baseCSS.rel = "stylesheet";
    baseCSS.href = "https://note-session.vercel.app/_next/static/chunks/00irns679c33c.css";
    baseCSS.id = "base-website-id";

    document.head.append(baseCSS);

    const chatContainer = document.createElement('div');
    chatContainer.id = 'chat-container';
    document.body.append(chatContainer);

    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'buttons';

    const addChannelInput = document.createElement('input');
    addChannelInput.id = "channel-input";
    addChannelInput.placeholder = "Add channel - Ctrl+M to show/hide";
    addChannelInput.addEventListener('keydown', (e) => {
        if (e.key == 'Enter') {
            e.preventDefault();
            if (ws.readyState != ws.OPEN) return;

            const inputedChannel = addChannelInput.value.trim();
            if (inputedChannel.length > 3 && !inputedChannel.includes(' ')) {
                joinChannel(inputedChannel);
            }

            addChannelInput.value = "";
        }
    })

    const changeUIView = (e) => {
        const channelInput = document.getElementById('channel-input');
        const buttonList = document.getElementById('buttons');

        if (channelInput && buttonList && e.ctrlKey && !e.shiftKey && e.code == 'KeyM') {
            e.preventDefault();
            channelInput.classList.toggle('hidden');
            buttonList.classList.toggle('hidden');
        }
    }

    document.addEventListener('keydown', changeUIView);
    document.body.append(addChannelInput);

    const closeSocketButton = document.createElement('button');
    closeSocketButton.id = "close-socket";
    closeSocketButton.innerText = 'STOP';

    closeSocketButton.addEventListener('click', () => {
        buttonContainer.remove();
        addChannelInput.remove();
        if (ws.readyState != ws.OPEN) return;
        ws.close();
        if (sevenTVws.readyState != sevenTVws.OPEN) return;
        sevenTVws.close();
    })

    const clearChatButton = document.createElement('button');
    clearChatButton.id = 'clear-button';
    clearChatButton.innerText = 'CLEAR';

    clearChatButton.addEventListener('click', () => {
        const chatContainer = document.getElementById('chat-container');
        if (!chatContainer) return;
        chatContainer.replaceChildren();
    })

    buttonContainer.append(closeSocketButton);
    buttonContainer.append(clearChatButton);
    document.body.append(buttonContainer);

    const stylesheet = document.createElement('style');
    stylesheet.id = 'stylesheet-global';
    stylesheet.textContent = `
        #chat-container {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex-direction: column-reverse;
            overflow-y: auto;
            overflow-x: hidden;
            overscroll-behavior: contain;
            font-family: Inter, Roobert, "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 16px;
            height: 98vh;
            min-height: 0;
            padding: 0 10px 0 10px;
            contain: content;
        }

        .parent, .parent-highlighted {
            display: inline;
            margin: 2px;
        }

        .parent-highlighted {
            background-color: #cd38cd27;
            border-inline-start: .25rem solid #cd38cd;
            border-inline-end: .25rem solid #cd38cd;
            padding: 2px 6px 2px 6px;
        }
        
        .username {
            display: inline;
            font-weight: bold;
            margin-right: 4px;
            cursor: pointer;
        }

        .username:hover {
            text-decoration: underline;
        }

        .message, .message-highlighted {
            padding-right: 5px;
            display: inline;
            color: white;
        }

        .message-highlighted {
            background: #755ebc;
            border: 4px solid #755ebc;
        }

        .emote, .badges {
            overflow-clip-margin: content-box;
            overflow: clip;
            object-fit: contain;
            width: auto;
            vertical-align: middle;
            display: inline;
            margin-left: 2px;
            cursor: pointer;
        }

        .emote {
            height: 20px;
        }
        
        .badges {
            height: 16px;
            margin: 0 2px 0 2px;
            border-radius: 3px;
        }

        .url {
            display: inline;
            color: lightblue;
        }

        .url:hover {
            color: #29c0f3;
            text-decoration: underline;
        }
        
        #buttons {
            display: flex;
            flex-direction: column;
            position: absolute;
            top: 15%;
            left: 75%;
            width: 20%;
            z-index: 100;
            gap: 3px;
        }
        
        .hidden {
            display: none !important;
        }
        
        .leave-button, #close-socket, #clear-button {
            color: black;
            border-radius: 7px;
            padding: 3px;
            font-weight: bold;
        }

        .leave-button {
            background: blue;
        }
        
        .leave-button:hover {
            background: lightblue;
        }

        #close-socket {
            background: red;
        }

        #close-socket:hover {
            background: #FFCCCB;
        }

        #clear-button {
            background: green;
        }

        #clear-button:hover {
            background: lightgreen;
        }

        #channel-input {
            background: white;
            color: black;
            position: absolute;
            top: 2%;
            left: 58%;
            width: 40%;
            height: 5%;
            padding: 7px;
        }

        #jump-to-bottom {
            position: absolute;
            background: #146890;
            color: white;
            bottom: 5%;
            left: 45%;
            border: 1px solid #146890;
            border-radius: 15px;
            z-index: 100;
            padding: 5px;
            width: 5%;
            font-weight: bold;
        }

        #jump-to-bottom:hover {
            background: #0d80b5;
        }
    `
    document.head.append(stylesheet);
}

const getGlobalBadges = () => {
    const parsedBadges = getFromLocalStorage('twitch-badges');
    if (parsedBadges != null) {
        globalBadges = parsedBadges;
        return;
    }

    fetch(BADGES_URL).then(res => res.json()).then(obj => {
        if (obj.success) {
            const parsedBadges = JSON.parse(obj.data);
            globalBadges = parsedBadges;
            setToLocalStorage('twitch-badges', globalBadges);
        }
    }).catch(err => console.error(err));
}

const get7tvGlobalEmotes = () => {
    fetch(SEVEN_TV_GLOBAL).then(res => res.json()).then(data => {
        const emotes = data.emotes;
        emotes.map((item) => {
            const host = build7tvEmoteUrl(item.data.host.url);
            globalEmotes[item.name] = host;
        })
    }).then(() => {
        console.log(`%c[7TV Emotes]%c Done fetching global emotes...`, 'color: orange; font-weight: bold;', '');
    }).catch(err => console.error(err)).finally(() => updateLocalStorage('global'))
}

const getBttvGlobalEmotes = () => {
    fetch(BTTV_GLOBAL).then(res => res.json()).then(data => {
        if ("message" in data) return;
        data.map((item) => {
            if (item.code in globalEmotes) {
                const currentImageUrl = globalEmotes[item.code];
                if (!currentImageUrl.startsWith('https://cdn.betterttv.net/emote')) return;
            }
            globalEmotes[item.code] = buildBttvEmoteUrl(item.id, item.imageType);
        })
    }).then(() => {
        console.log(`%c[BetterTTV Global]%c Done fetching global emotes...`, 'color: orange; font-weight: bold;', '');
    }).catch(err => console.error(err)).finally(() => updateLocalStorage('global'));
}

const get7tvChannelEmotes = (id) => {
    fetch(`${SEVEN_TV_USER}/${id}`).then(res => res.json()).then(data => {
        const profileImage = getNestedProperty(data, ['user', 'avatar_url']);
        if (profileImage && !(id in profileImages)) {
            profileImages[id] = buildProfileImageUrl(profileImage);
            setToLocalStorage('profile-images', profileImages);
        }

        if ("emote_set" in data && data.emote_set != null) {
            const emotes = data.emote_set.emotes;
            const emoteSetId = data.emote_set_id;

            emotes && emotes.map((item) => {
                const host = build7tvEmoteUrl(item.data.host.url);
                channelEmotes[id][item.name] = host;
            })

            if (emoteSetId) {
                idToEmoteSet[id] = emoteSetId;
                emoteSetToId[emoteSetId] = id;
                setToLocalStorage('id-to-emote-set', idToEmoteSet);
                setToLocalStorage('emote-set-to-id', emoteSetToId);
            }
        }
    }).catch(err => console.error(err)).finally(() => {
        console.log(`[7TV] Done fetching ${id} emotes.`);
        updateLocalStorage(id);
    })
}

const getBttvChannelEmotes = (id) => {
    fetch(`${BTTV_USER}/${id}`).then(res => res.json()).then(data => {
        if (!("message" in data)) {
            const allEmotes = data.channelEmotes.concat(data.sharedEmotes);
            allEmotes.map((item) => {
                const host = buildBttvEmoteUrl(item.id, item.imageType)
                if (item.code in channelEmotes[id]) {
                    const currentImageUrl = channelEmotes[id][item.code];
                    if (!currentImageUrl.startsWith('https://cdn.betterttv.net/emote')) return;
                }
                channelEmotes[id][item.code] = host;
            })
        }
    }).catch(err => console.error(err)).finally(() => {
        console.log(`[BTTV] Done fetching ${id} emotes.`);
        updateLocalStorage(id);
    })
}

const getGlobalEmotes = () => {
    const cached = getFromLocalStorage('global');
    if (cached != null) {
        globalEmotes = cached;
        console.log("[GLOBAL] Emotes from cache!");
        return;
    }

    get7tvGlobalEmotes();
    getBttvGlobalEmotes();
}

const getChannelEmotes = (id) => {
    if (id in channelEmotes) return;

    const timestamp = getFromLocalStorage(`${id}-timestamp`);
    const currentTime = new Date().getTime();
    const cached = getFromLocalStorage(id);

    if (cached && timestamp && currentTime - timestamp < KEEP_ALIVE) {
        console.log(`[${id}] Channel emotes from cache!`);
        channelEmotes[id] = cached;
        return;
    }

    const trackingEmoteSetId = idToEmoteSet[id];
    delete emoteSetToId[trackingEmoteSetId];
    delete idToEmoteSet[id];

    channelEmotes[id] = {};
    get7tvChannelEmotes(id);
    getBttvChannelEmotes(id);
}

const getProfileImages = () => {
    const cached = getFromLocalStorage('profile-images');
    if (cached) {
        profileImages = cached;
        return;
    }
}

const buildUsernameText = (displayName, username) => {
    const compDisplay = displayName.toLowerCase();
    const compUsername = username.toLowerCase();
    return compDisplay == compUsername ? `${displayName}:` : `${displayName} (${username}):`;
}

const appendToPage = (data) => {
    const { displayName, username, message, color, id, badges, emotes, channelName, isFirstMsg, isHighlighted } = data;
    const chatContainer = document.getElementById('chat-container');
    const emoteObj = id in channelEmotes ? channelEmotes[id] : {};
    const tokens = message.split(' ');
    const channelProfileImage = profileImages[id];

    const parentDiv = document.createElement('div');
    parentDiv.className = isFirstMsg ? 'parent-highlighted' : 'parent';

    const usernameDiv = document.createElement('a');
    usernameDiv.target = "_blank";
    usernameDiv.href = buildTwitchChannelUrl(username);
    usernameDiv.style.color = color ? makeColorViewable(color) : pickRandomColor();
    usernameDiv.className = 'username';
    usernameDiv.innerText = buildUsernameText(displayName, username);

    const msgEl = document.createElement('div');
    msgEl.className = isHighlighted ? 'message-highlighted' : 'message';

    const badgeFragment = document.createDocumentFragment();
    let foundBadge = false;

    if (channelProfileImage && channels.size > 1) {
        foundBadge = true;
        const profileImg = document.createElement('img');
        profileImg.className = 'badges';
        profileImg.src = channelProfileImage;
        profileImg.alt = channelName;
        profileImg.title = channelName;
        badgeFragment.append(profileImg);
    }

    for (const fullBadge of badges) {
        const backslashIdx = fullBadge.indexOf('/');
        const badge = fullBadge.slice(0, backslashIdx);

        if (badge in globalBadges) {
            foundBadge = true;
            const badgeUrl = globalBadges[badge];

            if (!preloadedBadgesSet.has(badgeUrl)) {
                const preloading = new Image();
                preloading.src = badgeUrl;
                preloadedBadgesSet.add(badgeUrl);
            }

            const badgeImg = document.createElement('img');
            badgeImg.className = 'badges';
            badgeImg.src = badgeUrl;
            badgeImg.alt = badge;
            badgeImg.title = badge;
            badgeFragment.append(badgeImg);
        }
    }

    const validEmote = new Set();

    for (const emote of emotes) {
        if (emote.length == 0) continue;
        const [emoteId, allRanges] = emote.split(':');
        const firstRange = allRanges.split(',').at(0);
        const range = firstRange.split('-').map(num => parseInt(num));
        const emoteText = message.slice(range[0], range[1] + 1);
        validEmote.add(emoteText);
        if (emoteText in twitchEmotes) continue;
        twitchEmotes[emoteText] = buildTwitchEmoteUrl(emoteId);
    }

    parentDiv.append(badgeFragment);
    let pendingText = "";

    for (const token of tokens) {
        const isEmote = token in emoteObj || token in globalEmotes || (token in twitchEmotes && validEmote.has(token));
        const isUrl = !isEmote && isValidWebUrl(token);

        if (isEmote || isUrl) {
            if (pendingText) {
                msgEl.append(document.createTextNode(pendingText));
                pendingText = "";
            }
            if (msgEl.hasChildNodes()) {
                msgEl.append(document.createTextNode(' '));
            }
        }

        if (isEmote) {
            const emoteImg = document.createElement('img');
            emoteImg.className = 'emote';
            emoteImg.src = token in emoteObj ? emoteObj[token] : token in twitchEmotes && validEmote.has(token)
                ? twitchEmotes[token] : globalEmotes[token];
            emoteImg.alt = token;
            emoteImg.title = token;
            msgEl.append(emoteImg);

        } else if (isUrl) {
            const url = document.createElement('a');
            url.className = 'url';
            url.textContent = token;
            url.href = token;
            url.target = "_blank";
            msgEl.append(url);

        } else {
            pendingText += (pendingText || msgEl.hasChildNodes() ? ' ' : '') + token;
        }
    }

    if (pendingText) {
        msgEl.append(document.createTextNode(pendingText));
    }

    if (foundBadge) {
        usernameDiv.style.marginLeft = '3px';
    }

    parentDiv.append(usernameDiv);
    parentDiv.appendChild(msgEl);

    const isAtBottom = chatContainer.scrollTop >= -30;
    const jumpButton = document.getElementById('jump-to-bottom');
    let maxMessages = isAtBottom ? 100 : 300;

    if (isAtBottom) {
        jumpButton && jumpButton.remove();
        chatContainer.scrollTop = 0;
    } else {
        if (!jumpButton) {
            const button = document.createElement('button');
            button.textContent = '\u2193';
            button.id = 'jump-to-bottom';

            button.addEventListener('click', () => {
                button.remove();
                chatContainer.scrollTop = 0;
                maxMessages = 100;
            })

            document.body.append(button);
        }
    }

    chatContainer.prepend(parentDiv);

    while (chatContainer.childElementCount > maxMessages) {
        chatContainer.lastChild.remove();
    }
}

const parseRawData = (rawData) => {
    const events = rawData.split('\r\n');
    return events.at(-1) == "" ? events.slice(0, -1) : events;
}

const checkValueIsInteger = (val) => {
    if (val == null || val == undefined || val.length == 0) return false;
    return /^\d+$/.test(val);
}

const getEmoteSetInfo = () => {
    const cachedIdToEmote = getFromLocalStorage('id-to-emote-set');
    const cachedEmoteToId = getFromLocalStorage('emote-set-to-id');
    if (cachedIdToEmote) {
        idToEmoteSet = cachedIdToEmote;
    }
    if (cachedEmoteToId) {
        emoteSetToId = cachedEmoteToId;
    }
}

const send7TVMessage = (id, type) => {
    const emoteSetId = id in idToEmoteSet ? idToEmoteSet[id] : null;
    if (sevenTVws.readyState != sevenTVws.OPEN || emoteSetId == null) return

    const payload = {
        "op": type == 'subscribe' ? 35 : 36,
        "d": {
            "type": "emote_set.update",
            "condition": {
                "object_id": `${emoteSetId}`
            }
        }
    }
    sevenTVws.send(JSON.stringify(payload));
}

setInitialElements();
getEmoteSetInfo();
getGlobalBadges();
getGlobalEmotes();
getProfileImages();

const ws = new WebSocket('wss://irc-ws.chat.twitch.tv/');
const sevenTVws = new WebSocket('wss://events.7tv.io/v3');

ws.onopen = () => {
    console.log(`%c[Connected]%c Requesting access to ${[...channels].join(", ")}...`, 'color: green; font-weight: bold;', '');
    ws.send('PASS SCHMOOPIIE');
    ws.send('NICK justinfan61935');
    ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
    for (const channel of channels) {
        ws.send(`JOIN #${channel}`);
        createLeaveButton(channel);
    }
};

ws.onmessage = (event) => {
    const messageEvents = parseRawData(event.data);

    for (const rawData of messageEvents) {
        if (rawData.startsWith('PING')) {
            ws.send('PONG :tmi.twitch.tv');
            return;
        }

        const obj = {};
        const dataItems = rawData.split(';');

        for (const item of dataItems) {
            const keyVal = item.split('=');
            if (keyVal.length == 2) {
                const [key, val] = keyVal;
                obj[key] = val;
            }
        }

        const roomId = obj['room-id'];
        const isValidRoomId = checkValueIsInteger(roomId);

        if (rawData.includes('ROOMSTATE')) {
            const startIdx = rawData.indexOf('ROOMSTATE');
            const hashtag = rawData.indexOf('#', startIdx);
            obj.channelName = rawData.slice(hashtag + 1).trim().toLowerCase();

            if (!(obj.channelName in usernameToId)) {
                if (isValidRoomId) {
                    usernameToId[obj.channelName] = roomId;
                    idToUsername[roomId] = obj.channelName;
                }
            }
        }

        if (isValidRoomId && !currentlyRemoving.has(roomId) && !isFetching.has(roomId)) {
            const username = idToUsername[roomId];
            if (username && !channels.has(username)) return;
            isFetching.add(roomId);
            console.log(`%c[Emotes]%c Fetching emotes...`, 'color: yellow; font-weight: bold;', '');
            getChannelEmotes(roomId);
        }

        if (isValidRoomId && !currentlyRemoving.has(roomId) && roomId in idToEmoteSet && !(roomId in subscribed7TV)) {
            const username = idToUsername[roomId];
            if (username && !channels.has(username)) return;
            if (sevenTVws.readyState == sevenTVws.OPEN) {
                subscribed7TV.add(roomId);
                send7TVMessage(roomId, 'subscribe');
            }
        }

        if (rawData.includes('PRIVMSG')) {
            const privMsgIdx = rawData.indexOf('PRIVMSG');
            const messageStart = privMsgIdx != -1 ? rawData.indexOf(" :", privMsgIdx) : -1;
            const message = messageStart != -1 ? rawData.slice(messageStart + 2).trim() : '';
            const channelName = rawData.slice(privMsgIdx + 9, messageStart);
            const displayName = obj['display-name'];

            let username = displayName;
            const userType = obj["user-type"];

            if (userType) {
                const usernameStart = userType.indexOf(':') + 1;
                const usernameEnd = userType.indexOf('!');
                username = userType.slice(usernameStart, usernameEnd);
            }

            obj.channelName = channelName.toLowerCase();
            obj.message = message;
            obj.badges = obj.badges.split(',');
            obj.emotes = obj.emotes.split('/');

            if (obj.message && !bots.has(displayName.toLowerCase())) {
                const sourceRoomId = obj['source-room-id'];
                const sourceId = obj['source-id'];
                const sourceChannel = sourceRoomId in idToUsername ? idToUsername[sourceRoomId] : null;
                const shouldSkip = sourceRoomId && sourceRoomId != roomId && sourceChannel && channels.has(sourceChannel);

                if (!shouldSkip && (!sourceId || !addedMessages.has(sourceId))) {
                    if (sourceId) {
                        if (1000 - addedMessages.size < 5) addedMessages.clear();
                        addedMessages.add(sourceId);
                    }
                    const message = obj.message;
                    const color = obj.color;
                    const isFirstMsg = obj['first-msg'] == '1';
                    const isHighlightedMsg = obj['msg-id'] == 'highlighted-message';
                    const pageObj = {
                        displayName, username, message, color, id: roomId, badges: obj.badges,
                        emotes: obj.emotes, channelName: obj.channelName, isFirstMsg, isHighlightedMsg
                    }
                    appendToPage(pageObj);
                }
            }
        }

        if (obj.channelName && !(obj.channelName in usernameToId)) {
            if (isValidRoomId) {
                usernameToId[obj.channelName] = roomId;
                idToUsername[roomId] = obj.channelName;
            }
        }
    }
};

ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
};

ws.onclose = () => {
    console.log('%c[Disconnected]%c Connection closed.', 'color: red; font-weight: bold;', '');
};

sevenTVws.onopen = () => {
    console.log(`%c[7TV Connected]%c Connected to 7TV WebSocket.`, 'color: green; font-weight: bold;', '');
}

sevenTVws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.op == 2) return;
    if (message.op == 0) {
        const data = message.d;
        const emoteSetId = getNestedProperty(data, ['body', 'id']);
        const body = getNestedProperty(message, ['d', 'body']);

        if (!data || !emoteSetId || !body || !(emoteSetId in emoteSetToId)) return;

        let isChanged = false;
        const roomId = emoteSetId in emoteSetToId ? emoteSetToId[emoteSetId] : null;
        const pulled = body.pulled;
        const pushed = body.pushed;
        const updated = body.updated;

        if (pulled) {
            for (const emote of pulled) {
                const name = getNestedProperty(emote, ['old_value', 'name']);
                if (name && roomId in channelEmotes && name in channelEmotes[roomId]) {
                    delete channelEmotes[roomId][name];
                    isChanged = true;
                }
            }
        }

        if (pushed) {
            for (const emote of pushed) {
                const name = getNestedProperty(emote, ['value', 'name']);
                const url = getNestedProperty(emote, ['value', 'data', 'host', 'url']);
                if (!name || !url) continue;

                if (!(roomId in channelEmotes)) {
                    channelEmotes[roomId] = {};
                }

                channelEmotes[roomId][name] = build7tvEmoteUrl(url);
                isChanged = true;
            }
        }

        if (updated) {
            for (const changes of updated) {
                const oldName = getNestedProperty(changes, ['old_value', 'name']);
                const newName = getNestedProperty(changes, ['value', 'name']);
                const newUrl = getNestedProperty(changes, ['value', 'data', 'host', 'url']);

                if (oldName in channelEmotes[roomId] && newName && newUrl) {
                    channelEmotes[roomId][newName] = channelEmotes[roomId][oldName];
                    delete channelEmotes[roomId][oldName];
                    isChanged = true;
                }
            }
        }

        if (isChanged) {
            const timestampKey = `${roomId}-timestamp`;
            setToLocalStorage(roomId, channelEmotes[roomId]);
            setToLocalStorage(timestampKey, new Date().getTime());
        }
    }
}

sevenTVws.onerror = (error) => {
    console.error('7TV WebSocket Error:', error);
};

sevenTVws.onclose = () => {
    console.log('%c[7TV Disconnected]%c 7TV connection closed.', 'color: red; font-weight: bold;', '');
}

const leaveChannel = (channelName) => {
    channelName = channelName.toLowerCase();
    if (ws == undefined || !channels.has(channelName)) return;
    channels.delete(channelName);
    ws.send(`PART #${channelName}`);
    removeChannelFromData(channelName);
}

const joinChannel = (channelName) => {
    channelName = channelName.toLowerCase();
    if (ws == undefined || channels.has(channelName)) return;
    if (channels.size >= 20) {
        alert(`Max connections reached - ${channels.size}.`);
        return;
    }
    channels.add(channelName);
    ws.send(`JOIN #${channelName}`);
    createLeaveButton(channelName);
}

const createLeaveButton = (channelName) => {
    const leaveChannelButton = document.createElement('button');
    const buttonContainer = document.getElementById('buttons');

    leaveChannelButton.className = 'leave-button';
    leaveChannelButton.innerText = `LEAVE #${channelName}`;

    leaveChannelButton.addEventListener('click', () => {
        leaveChannel(channelName);
        leaveChannelButton.remove();
    })

    buttonContainer.append(leaveChannelButton);
}

const removeChannelFromData = (channelName) => {
    const id = channelName in usernameToId ? usernameToId[channelName] : null;
    if (id != null && !currentlyRemoving.has(id)) {
        currentlyRemoving.add(id);
        isFetching.delete(id);
        delete channelEmotes[id];
        delete updateEmotes[id];
        if (subscribed7TV.has(id)) {
            send7TVMessage(id, 'unsubscribe');
            subscribed7TV.delete(id);
        }
        currentlyRemoving.delete(id);
    }
}

const addBot = (bot) => {
    bot = bot.toLowerCase();
    bots.add(bot);
}

const removeBot = (bot) => {
    bot = bot.toLowerCase();
    bots.delete(bot);
}
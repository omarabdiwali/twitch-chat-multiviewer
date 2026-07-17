const isValidTwitchUsername = (username) => {
    const regex = /^[a-zA-Z][a-zA-Z0-9_]{2,24}$/;
    return regex.test(username);
}

const purgeLocalStorage = () => {
    const currentTime = new Date().getTime();
    const removalIds = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.endsWith('-timestamp')) {
            const idEnd = key.indexOf('-');
            const id = key.slice(0, idEnd);
            const timestamp = JSON.parse(localStorage.getItem(key));
            if (currentTime - timestamp < KEEP_ALIVE) continue;
            removalIds.push(id);
        }
    }
    for (const id of removalIds) {
        localStorage.removeItem(id);
        localStorage.removeItem(`${id}-timestamp`);
    }
}

const parseCommandMessage = (message) => {
    const command = COMMANDS.find((cmd) => message.startsWith(cmd));

    if (command == '!commands') {
        if (message != command) return false;
        let infoMessage = "[username] - Adds the user's chat to the viewer.\n";
        for (let i = 0; i < COMMANDS.length; i++) {
            infoMessage += `${COMMAND_HELP.at(i)}.\n`;
        }
        alert(infoMessage);
        return true;
    } else if (command == '!hidden' || command == '!focused') {
        if (message != command) return false;
        let infoMessage = "";
        const data = message == '!hidden' ? hidden : highlightUsers;

        if (data.size == 0) {
            infoMessage = `There are currently no ${command.slice(1)} users.`;
        } else {
            infoMessage += `Current ${command.slice(1)} users:\n`;
            const users = [...data].join(' - ');
            infoMessage += `${users}`;
        }

        alert(infoMessage);
        return true;
    }

    const usernameStart = message.indexOf(' ');
    if (usernameStart == -1 || command == undefined) return false;
    const username = message.slice(usernameStart + 1);
    if (!isValidTwitchUsername(username)) return false;

    if (command == '!hide ' || command == '!show ') {
        command == '!hide ' ? hideUser(username) : showUser(username);
    } else if (command == '!focus ' || command == '!unfocus ') {
        command == '!focus ' ? highlightUsers.add(username) : highlightUsers.delete(username);
    }

    return true;
}

const getNestedProperty = (data, keys, allowUndefined = true) => {
    let current = data;
    let prevKey = null;
    const errorMessage = `Key '${keys.join(".")}' does not exist.`;

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
    return `https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(id)}/default/dark/1.0`;
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

const setToLocalStorage = (key, value, retry = false) => {
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

const buildUsernameText = (displayName, username) => {
    const compDisplay = displayName.toLowerCase();
    const compUsername = username.toLowerCase();
    return compDisplay == compUsername ? `${displayName}:` : `${displayName} (${username}):`;
}

const parseRawData = (rawData) => {
    const events = rawData.split('\r\n');
    return events.at(-1) == "" ? events.slice(0, -1) : events;
}

const checkValueIsInteger = (val) => {
    if (val == null || val == undefined || val.length == 0) return false;
    return /^\d+$/.test(val);
}

const hideUser = (user) => {
    user = user.toLowerCase();
    hidden.add(user);
}

const showUser = (user) => {
    user = user.toLowerCase();
    hidden.delete(user);
}

const buildErrorMessage = (twitchState, sevenTvState, comparison) => {
    let message = "";

    if (twitchState != comparison) {
        message += "Twitch";
    }
    
    if (sevenTvState != comparison) {
        if (message) {
            message += " and 7TV WebSockets are";
        } else {
            message += "7TV WebSocket is";
        }
    } else if (message) {
        message += " WebSocket is"
    }

    if (message.length == 0) return message;
    return `${message} not yet ${comparison != 3 ? 'connected' : 'disconnected'}. Try again later.`;
}
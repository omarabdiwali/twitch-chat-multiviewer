const setInitialElements = () => {
    const chatContainer = document.getElementById('chat-container');
    const reconnectButton = document.getElementById('reconnect-button');
    const errorMessage = document.getElementById('error-message');
    const jumpToBottom = document.getElementById('jump-to-bottom');
    const addChannelInput = document.getElementById('channel-input');
    const closeSocketButton = document.getElementById('close-socket');
    const clearChatButton = document.getElementById('clear-button');
    const leaveAllButton = document.getElementById('leave-all');

    const changeUIView = (e) => {
        const channelInput = document.getElementById('channel-input');
        const buttonList = document.getElementById('buttons');
        const reconnectButtonEl = document.getElementById('reconnect-button');

        if (channelInput && buttonList && e.ctrlKey && !e.shiftKey && e.code == 'KeyM') {
            if (reconnectButtonEl && !reconnectButtonEl.classList.contains('hidden')) return;
            e.preventDefault();
            channelInput.classList.toggle('hidden');
            buttonList.classList.toggle('hidden');
        }
    }

    document.addEventListener('keydown', changeUIView);

    reconnectButton.addEventListener('click', () => {
        const message = buildErrorMessage(ws.readyState, sevenTVws.readyState, ws.CLOSED);
        
        if (message) {
            if (errorMessage.isConnected) {
                errorMessage.textContent = message;
                errorMessage.classList.remove('hidden');
            }
            return;
        }
        
        const currentTime = new Date().getTime();
        errorMessage.isConnected && errorMessage.classList.add('hidden');
        
        if (lastRecAttempt == null || currentTime - lastRecAttempt > 2500) {
            toggleElementsVisibility(false);
            ws = twitchWebSocket();
            sevenTVws = sevenTVWebSocket();
        } else {
            reconnectButton.textContent = 'Reconnecting...';
            reconnectButton.disabled = true;
            
            setTimeout(() => {
                toggleElementsVisibility(false);
                ws = twitchWebSocket();
                sevenTVws = sevenTVWebSocket();
                reconnectButton.textContent = 'Reconnect';
                reconnectButton.disabled = false;
            }, 2500);
        }
        lastRecAttempt = currentTime;
    })

    jumpToBottom.addEventListener('click', () => {
        const chatContainerEl = document.getElementById('chat-container');
        if (!chatContainerEl) return;
        chatContainerEl.scrollTop = 0;
        maxMessages = 250;
    })

    chatContainer.addEventListener('scroll', (e) => {
        const isAtBottom = chatContainer.scrollTop >= -40;
        if (isAtBottom) {
            jumpToBottom.isConnected && jumpToBottom.classList.add('hidden');
            maxMessages = 250;
        } else {
            jumpToBottom.isConnected && jumpToBottom.classList.remove('hidden');
            maxMessages = 500;
        }
    })

    addChannelInput.addEventListener('keydown', (e) => {
        if (e.key == 'Enter') {
            e.preventDefault();
            
            const message = buildErrorMessage(ws.readyState, sevenTVws.readyState, ws.OPEN);
            if (message) {
                if (errorMessage.isConnected) {
                    errorMessage.textContent = message;
                    errorMessage.classList.remove('hidden');
                }
                return;
            }
            
            const inputedChannel = addChannelInput.value.trim().toLowerCase();
            const isCommand = parseCommandMessage(inputedChannel);
            const isValidUsername = isValidTwitchUsername(inputedChannel);

            if (!isCommand && !isValidUsername) {
                errorMessage.textContent = "Invalid command/username!"
                errorMessage.isConnected && errorMessage.classList.remove('hidden');
            } else if (!isCommand && isValidUsername) {
                errorMessage.isConnected && errorMessage.classList.add('hidden');
                joinChannel(inputedChannel);
            }

            addChannelInput.value = "";
        } else {
            errorMessage.isConnected && errorMessage.classList.add('hidden');
        }
    })

    closeSocketButton.addEventListener('click', () => {
        const message = buildErrorMessage(ws.readyState, sevenTVws.readyState, ws.OPEN);
        if (message) {
            if (errorMessage.isConnected) {
                errorMessage.textContent = message;
                errorMessage.classList.remove('hidden');
            }
            return;
        }
        
        errorMessage.isConnected && errorMessage.classList.add('hidden');
        toggleElementsVisibility(true);
        ws.close();
        sevenTVws.close();
    })

    clearChatButton.addEventListener('click', () => {
        const chatContainerEl = document.getElementById('chat-container');
        if (!chatContainerEl) return;
        chatContainerEl.replaceChildren();
    })

    leaveAllButton.addEventListener('click', () => {
        if (channels.size <= 1) return;
        const message = buildErrorMessage(ws.readyState, sevenTVws.readyState, ws.OPEN);
        
        if (message) {
            if (errorMessage.isConnected) {
                errorMessage.textContent = message;
                errorMessage.classList.remove('hidden');
            }
            return;
        }

        for (const channel of channels) {
            const leaveButton = document.getElementById(`leave-button-${channel}`);
            leaveChannel(channel);
            leaveButton && leaveButton.remove();
        }
    })
}

const appendToPage = (data) => {
    const { displayName, username, message, color, id, badges, emotes, channelName, isFirstMsg, isHighlighted } = data;
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;

    const emoteObj = id in channelEmotes ? channelEmotes[id] : {};
    const tokens = message.split(' ');
    const channelProfileImage = profileImages[id];

    const parentDiv = document.createElement('div');
    const highlightUser = highlightUsers.has(username.toLowerCase()) || highlightUsers.has(displayName.toLowerCase());
    parentDiv.className = isFirstMsg ? 'parent-highlighted' : highlightUser ? 'highlight-user' : 'parent';

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

    const isAtBottom = chatContainer.scrollTop >= -40;
    if (isAtBottom) {
        chatContainer.scrollTop = 0;
    }

    chatContainer.prepend(parentDiv);

    while (chatContainer.childElementCount > maxMessages) {
        chatContainer.lastChild.remove();
    }
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

const get7tvChannelEmotes = (id) => {
    const abortController = abortControllers[id];
    if (abortController.signal.aborted) return;

    fetch(`${SEVEN_TV_USER}/${id}`, { signal: abortController.signal }).then(res => res.json()).then(data => {
        const profileImage = getNestedProperty(data, ['user', 'avatar_url']);
        if (profileImage) {
            const previousURL = profileImages[id];
            const currentURL = buildProfileImageUrl(profileImage);
            if (previousURL != currentURL) {
                profileImages[id] = currentURL;
                setToLocalStorage('profile-images', profileImages);
            }
        }

        if ("emote_set" in data && data.emote_set != null) {
            const emotes = data.emote_set.emotes;
            const emoteSetId = data.emote_set_id;

            emotes && emotes.map((item) => {
                const host = build7tvEmoteUrl(item.data.host.url);
                if (!(id in channelEmotes)) {
                    channelEmotes[id] = {};
                }
                channelEmotes[id][item.name] = host;
            })

            if (emoteSetId) {
                idToEmoteSet[id] = emoteSetId;
                emoteSetToId[emoteSetId] = id;
                setToLocalStorage('id-to-emote-set', idToEmoteSet);
                setToLocalStorage('emote-set-to-id', emoteSetToId);
            }
        }
    }).then(() => {
        console.log(`[7TV] Done fetching ${id} emotes.`);
        updateLocalStorage(id);
    }).catch(err => {
        console.error(err);
        if (err.name != 'AbortError') {
            console.log(`[7TV] Done fetching ${id} emotes.`);
            updateLocalStorage(id);
        }
    })
}

const getBttvChannelEmotes = (id) => {
    const abortController = abortControllers[id];
    if (abortController.signal.aborted) return;
    
    fetch(`${BTTV_USER}/${id}`, { signal: abortController.signal }).then(res => res.json()).then(data => {
        if (!("message" in data)) {
            const allEmotes = data.channelEmotes.concat(data.sharedEmotes);
            allEmotes.map((item) => {
                const host = buildBttvEmoteUrl(item.id, item.imageType)
                if (item.code in channelEmotes[id]) {
                    const currentImageUrl = channelEmotes[id][item.code];
                    if (!currentImageUrl.startsWith('https://cdn.betterttv.net/emote')) return;
                }
                if (!(id in channelEmotes)) {
                    channelEmotes[id] = {};
                }
                channelEmotes[id][item.code] = host;
            })
        }
    }).then(() => {
        console.log(`[BTTV] Done fetching ${id} emotes.`);
        updateLocalStorage(id);
    }).catch(err => {
        console.error(err);
        if (err.name != 'AbortError') {
            console.log(`[BTTV] Done fetching ${id} emotes.`);
            updateLocalStorage(id);
        }
    })
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
    abortControllers[id] = new AbortController();
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

const toggleElementsVisibility = (hide) => {
    const buttons = document.getElementById("buttons");
    const inputEl = document.getElementById("channel-input");
    const reconnect = document.getElementById('reconnect-button');
    if (hide) {
        if (buttons) buttons.classList.add('hidden');
        if (inputEl) inputEl.classList.add('hidden');
        if (reconnect) reconnect.classList.remove('hidden');
    } else {
        if (buttons) buttons.classList.remove('hidden');
        if (inputEl) inputEl.classList.remove('hidden');
        if (reconnect) reconnect.classList.add('hidden');
    }
}

const checkLeaveAllVisibility = () => {
    const leaveAllButton = document.getElementById('leave-all');
    if (!leaveAllButton) return;
    if (channels.size > 1) leaveAllButton.classList.remove('hidden');
    else leaveAllButton.classList.add('hidden');
}

const twitchWebSocket = () => {
    let ws = new WebSocket(TWITCH_URL);

    ws.onopen = () => {
        toggleElementsVisibility(false);
        console.log(`%c[Twitch Connected]%c Connected to Twitch WebSocket.`, 'color: green; font-weight: bold;', '');
        ws.send('PASS SCHMOOPIIE');
        ws.send('NICK justinfan61935');
        ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        for (const channel of channels) {
            ws.send(`JOIN #${channel}`);
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

                if (obj.message && !hidden.has(displayName.toLowerCase())) {
                    const sourceRoomId = obj['source-room-id'];
                    const sourceId = obj['source-id'];
                    const sourceChannel = sourceRoomId in idToUsername ? idToUsername[sourceRoomId] : null;
                    const shouldSkip = sourceRoomId && sourceRoomId != roomId && sourceChannel && channels.has(sourceChannel);

                    if (!shouldSkip && (!sourceId || !addedMessages.has(sourceId))) {
                        if (sourceId) {
                            if (1000 - addedMessages.size < 5) addedMessages.clear();
                            addedMessages.add(sourceId);
                        }
                        const msg = obj.message;
                        const color = obj.color;
                        const isFirstMsg = obj['first-msg'] == '1';
                        const isHighlightedMsg = obj['msg-id'] == 'highlighted-message';
                        const pageObj = {
                            displayName, username, message: msg, color, id: roomId, badges: obj.badges,
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
        console.error('Twitch WebSocket Error:', error);
    };

    ws.onclose = () => {
        toggleElementsVisibility(true);
        console.log('%c[Twitch Disconnected]%c Twitch Connection closed.', 'color: red; font-weight: bold;', '');
    }

    return ws;
}

const sevenTVWebSocket = () => {
    let sevenTVws = new WebSocket(SEVEN_TV_URL);

    sevenTVws.onopen = () => {
        toggleElementsVisibility(false);
        console.log(`%c[7TV Connected]%c Connected to 7TV WebSocket.`, 'color: green; font-weight: bold;', '');
        for (const id of subscribed7TV) {
            send7TVMessage(id, 'subscribe');
        }
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
        toggleElementsVisibility(true);
        console.log('%c[7TV Disconnected]%c 7TV connection closed.', 'color: red; font-weight: bold;', '');
    }

    return sevenTVws;
}

const leaveChannel = (channelName) => {
    channelName = channelName.toLowerCase();
    if (ws == undefined || !channels.has(channelName)) return;
    channels.delete(channelName);
    ws.send(`PART #${channelName}`);
    removeChannelFromData(channelName);
    checkLeaveAllVisibility();
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
    checkLeaveAllVisibility();
}

const createLeaveButton = (channelName) => {
    const leaveChannelButton = document.createElement('button');
    const buttonContainer = document.getElementById('buttons');
    if (!buttonContainer) return;

    leaveChannelButton.className = 'leave-button';
    leaveChannelButton.id = `leave-button-${channelName}`;
    leaveChannelButton.innerText = `LEAVE #${channelName}`;

    leaveChannelButton.addEventListener('click', () => {
        const id = usernameToId[channelName];
        const abortController = abortControllers[id];
        abortController && abortController.abort();
        leaveChannel(channelName);
        leaveChannelButton.remove();
    })

    buttonContainer.append(leaveChannelButton);
}

const removeChannelFromData = (channelName) => {
    const id = usernameToId[channelName];
    if (id && !currentlyRemoving.has(id)) {
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

setInitialElements();
purgeLocalStorage();
getEmoteSetInfo();
getGlobalBadges();
getGlobalEmotes();
getProfileImages();

let ws = twitchWebSocket();
let sevenTVws = sevenTVWebSocket();
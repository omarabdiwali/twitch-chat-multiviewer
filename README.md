# Twitch Chat Multiviewer

A self-contained, browser-based Twitch chat client that joins multiple channels over anonymous IRC, renders messages in a custom UI, and augments them with **BetterTTV**, **7TV**, and native Twitch emotes, badges, and profile images.

## Live Demo

🚀 **Try it now at: https://multichat-twitch.vercel.app**

No downloads or setup required - just open the link and start adding channels!

## Features

- **Multi-channel chat** – Join up to 20 Twitch channels concurrently and view their messages merged in a single scrolling container (newest at bottom).
- **Anonymous connection** – Uses Twitch's public IRC WebSocket with dummy credentials; no account or OAuth token required.
- **Third-party emotes**
  - Global & per-channel **BetterTTV** emotes
  - Global & per-channel **7TV** emotes
  - Native **Twitch** emotes (parsed from IRC tags)
- **Live 7TV updates** – Subscribes to the 7TV events socket to instantly add, remove, or rename channel emotes.
- **Badges & avatars**
  - Global Twitch badges fetched from a JSON bin and cached.
  - When more than one channel is joined, each message shows that channel's avatar as a badge.
- **Message enhancements**
  - First-message highlighting (`first-msg`)
  - Moderator highlighted messages (`highlighted-message`)
  - Clickable usernames (open channel in new tab)
  - Clickable URLs (safe `http:`/`https:` only)
  - Random or Twitch-assigned username colors (with automatic lightening for readability)
- **Bot filtering** – Ignores messages from common bots (Fossabot, PotatBotat, Nightbot, StreamElements).
- **LocalStorage caching** – Emotes, badges, profile images, and emote-set mappings are cached to reduce API calls (channel emotes refresh after 4 hours).
- **Simple controls**
  - Input box to add channels (press **Enter**)
  - `LEAVE #channel` buttons
  - `STOP` (close sockets), `CLEAR` (empty chat), and a temporary `↓` jump-to-bottom button.
  - `Ctrl+M` toggles visibility of the input box and control panel (distraction-free "zen mode").
- **Ready-to-use `index.html`** – The repo ships with a minimal `index.html` that loads the script, so you can just open it directly.

## Getting Started

### Option 1: Use the Live Version (Recommended)
Simply visit **https://multichat-twitch.vercel.app** in your browser - no installation needed!

### Option 2: Run Locally

#### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, etc.)
- Internet access (for WebSocket connections and API fetches)

#### Method A: Standalone HTML page
The project includes an `index.html` in the repository root that loads `twitch.js`. To run locally:
1. Download/clone the repo so that `index.html` and `twitch.js` sit in the same folder.
2. Open `index.html` in your browser. The script immediately clears the page and builds its own UI.

#### Method B: Browser console / Bookmarklet
1. Open a blank tab or any page you don't mind replacing.
2. Open the developer console (F12).
3. Paste the entire contents of `twitch.js` and press **Enter**.
  *(You could also wrap the code in an IIFE and save it as a bookmarklet.)*

## Using the Interface

1. **Add a channel** – Type the channel name (e.g., `xqc`) in the top input field and hit **Enter**. A `LEAVE #xqc` button appears in the side panel.
2. **Leave a channel** – Click its `LEAVE` button; the script sends `PART`, removes emote data, and unsubscribes from 7TV updates.
3. **Stop all** – Click `STOP` to close both the Twitch IRC and 7TV WebSockets and remove the control panel.
4. **Clear chat** – Click `CLEAR` to empty the message list.
5. **Scrolling** – The chat uses `flex-direction: column-reverse`. If you scroll up, a `↓` button appears to jump back to the latest messages.
6. **Hide/Show controls** – Press `Ctrl+M` to toggle the visibility of the channel input and button container. This is handy for a clean, distraction-free view of just the chat messages (press `Ctrl+M` again to bring the controls back).

## How It Works (Technical Overview)

| Component | Description |
|-----------|-------------|
| `ws` | WebSocket to `wss://irc-ws.chat.twitch.tv/`. Sends `PASS SCHMOOPIIE`, `NICK justinfan61935`, and `CAP REQ :twitch.tv/tags twitch.tv/commands`. |
| `sevenTVws` | WebSocket to `wss://events.7tv.io/v3` for `emote_set.update` events. |
| `getGlobalEmotes()` | Fetches BTTV global (`/3/cached/emotes/global`) and 7TV global (`/v3/emote-sets/global`) emotes. |
| `getChannelEmotes(id)` | For a given `room-id`, fetches BTTV (`/3/cached/users/twitch/{id}`) and 7TV (`/v3/users/twitch/{id}`) channel emotes, using cache if fresh. |
| `appendToPage(data)` | Builds DOM nodes for badges, username, and message tokens (text, emote `<img>`, or `<a>` for URLs). |
| `parseRawData()` | Splits IRC messages on `\r\n` and parses tag key-value pairs. |
| LocalStorage | Keys: `global`, `{roomId}`, `{roomId}-timestamp`, `twitch-badges`, `profile-images`, `id-to-emote-set`, `emote-set-to-id`. |

### Emote Resolution Order
For each word in a message:
1. Channel-specific emote (from `channelEmotes[roomId]`)
2. Twitch emote (from `twitchEmotes` built via IRC `emotes` tag)
3. Global emote (from `globalEmotes` – 7TV/BTTV)
4. Otherwise treated as text or URL.

## Configuration

Edit the constants near the top of `twitch.js`:

```js
const KEEP_ALIVE = 14400000; // 4 hours before re-fetch of channel emotes
const COLORS = [ /* fallback username colors */ ];
const bots = new Set([...]); // lowercase bot names to ignore
```

You can also change API URLs (`BTTV_GLOBAL`, `SEVEN_TV_GLOBAL`, `BADGES_URL`, etc.) if they change.

## Limitations & Notes

- **Read-only** – The script only listens; you cannot send chat messages.
- **No historical chat** – Only messages received after joining are shown.
- **Single-file** – No build step, no external JS libraries.
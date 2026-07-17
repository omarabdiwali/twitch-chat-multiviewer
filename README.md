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
- **User Management Commands**
  - Hide specific users with `!hide [username]`
  - Show hidden users with `!show [username]`
  - Focus specific users with `!focus [username]`
  - Unfocus users with `!unfocus [username]`
  - View hidden/focused users with `!hidden` and `!focused`
- **Bot filtering** – Ignores messages from common bots (Fossabot, PotatBotat, Nightbot, StreamElements).
- **Input Validation** – Real-time validation of Twitch usernames and commands with helpful error messages.
- **LocalStorage caching** – Emotes, badges, profile images, and emote-set mappings are cached to reduce API calls (channel emotes refresh after 4 hours).
- **Connection resilience**
  - Automatic handling of socket disconnections
  - **Reconnect** button appears when connections are lost, allowing manual reconnection
- **Simple controls**
  - Input box to add channels or execute commands (press **Enter**)
  - `LEAVE #channel` buttons
  - `STOP` (close sockets), `CLEAR` (empty chat), and a temporary `↓` jump-to-bottom button.
  - `Ctrl+M` toggles visibility of the input box and control panel (distraction-free "zen mode").
- **Modular JavaScript architecture** – Clean separation of concerns with individual modules:
  - `webview/config.js` - Configuration constants and API endpoints
  - `webview/state.js` - Application state management
  - `webview/utils.js` - Utility functions and helpers
  - `webview/main.js` - Main application logic and WebSocket handlers

## Getting Started

### Option 1: Use the Live Version (Recommended)
Simply visit **https://multichat-twitch.vercel.app** in your browser - no installation needed!

### Option 2: Run Locally

#### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, etc.)
- Internet access (for WebSocket connections and API fetches)

The project uses a modular JavaScript structure. To run locally:
1. Download/clone the repo ensuring the directory structure is maintained:
   ```
   your-project-folder/
   ├── index.html
   ├── styles.css
   └── webview/
       ├── config.js
       ├── state.js
       ├── utils.js
       └── main.js
   ```
2. Open `index.html` in your browser. The scripts will load automatically and build the chat interface.

## Using the Interface

### Basic Operations
1. **Add a channel** – Type the channel name (e.g., `xqc`) in the top input field and hit **Enter**. A `LEAVE #xqc` button appears in the side panel.
2. **Leave a channel** – Click its `LEAVE` button; the script sends `PART`, removes emote data, and unsubscribes from 7TV updates.
3. **Stop all** – Click `STOP` to close both the Twitch IRC and 7TV WebSockets and remove the control panel.
4. **Clear chat** – Click `CLEAR` to empty the message list.
5. **Scrolling** – The chat uses `flex-direction: column-reverse`. If you scroll up, a `↓` button appears to jump back to the latest messages.
6. **Hide/Show controls** – Press `Ctrl+M` to toggle the visibility of the channel input and button container. This is handy for a clean, distraction-free view of just the chat messages (press `Ctrl+M` again to bring the controls back).
7. **Reconnect** – If the WebSocket connections drop (due to network issues or server maintenance), a **Reconnect** button will appear. Click it to restore your chat connections without refreshing the page.

### User Management Commands

You can use special commands in the input field to manage which users appear in the chat:

| Command | Description |
|---------|-------------|
| `!hide [username]` | Hides user's messages from the chat |
| `!show [username]` | Shows user's messages if previously hidden |
| `!focus [username]` | Highlights the user's messages in chat |
| `!unfocus [username]` | Removes the user's previous highlighting |
| `!hidden` | Shows the list of users whose messages are hidden |
| `!focused` | Shows the list of users whose messages are highlighted |
| `!commands` | Shows the list of available commands |

**Note:** All usernames must be valid Twitch usernames (3-25 characters, starting with a letter, containing only letters, numbers, and underscores) and are case-insensitive. Invalid commands or usernames will trigger an error message.

## How It Works (Technical Overview)

| Component | Description |
|-----------|-------------|
| `ws` | WebSocket to `wss://irc-ws.chat.twitch.tv/`. Sends `PASS SCHMOOPIIE`, `NICK justinfan61935`, and `CAP REQ :twitch.tv/tags twitch.tv/commands`. |
| `sevenTVws` | WebSocket to `wss://events.7tv.io/v3` for `emote_set.update` events. |
| `getGlobalEmotes()` | Fetches BTTV global (`/3/cached/emotes/global`) and 7TV global (`/v3/emote-sets/global`) emotes. |
| `getChannelEmotes(id)` | For a given `room-id`, fetches BTTV (`/3/cached/users/twitch/{id}`) and 7TV (`/v3/users/twitch/{id}`) channel emotes, using cache if fresh. |
| `appendToPage(data)` | Builds DOM nodes for badges, username, and message tokens (text, emote `<img>`, or `<a>` for URLs). |
| `parseRawData()` | Splits IRC messages on `\r\n` and parses tag key-value pairs. |
| `parseCommandMessage()` | Parses and executes user management commands like hide/show/focus/unfocus. |
| `isValidTwitchUsername()` | Validates usernames against Twitch's naming conventions using regex. |
| `toggleElementsVisibility()` | Manages UI visibility state when connections are lost/restored. |
| LocalStorage | Keys: `global`, `{roomId}`, `{roomId}-timestamp`, `twitch-badges`, `profile-images`, `id-to-emote-set`, `emote-set-to-id`. |

### Module Structure
- **config.js** - Contains all configuration constants including API endpoints, cache durations, username colors, and bot lists
- **state.js** - Manages application state using Maps and Sets for channels, emotes, hidden users, focused users, etc.
- **utils.js** - Pure utility functions for validation, URL building, storage operations, and data parsing
- **main.js** - Core application logic including WebSocket connections, message handling, and UI interactions

### Emote Resolution Order
For each word in a message:
1. Channel-specific emote (from `channelEmotes[roomId]`)
2. Twitch emote (from `twitchEmotes` built via IRC `emotes` tag)
3. Global emote (from `globalEmotes` – 7TV/BTTV)
4. Otherwise treated as text or URL.

### Command Processing Flow
When you press Enter in the input field:
1. The input is validated as either a valid Twitch username or a recognized command
2. Invalid inputs show an error message
3. Valid commands are parsed and executed (hide/show/focus/unfocus)
4. Valid usernames result in joining that channel
5. The input field is cleared after processing

### Reconnection Mechanism
When WebSocket connections are lost:
1. The control panel and input are hidden, and a **Reconnect** button appears
2. Clicking Reconnect attempts to re-establish both Twitch IRC and 7TV WebSocket connections
3. Reconnection attempts are rate-limited to prevent spamming (minimum 2.5 second interval)
4. On successful reconnection, all previously joined channels are automatically rejoined
5. The UI returns to normal state with controls visible again

## Configuration

Edit the constants near the top of `webview/config.js`:

```js
const KEEP_ALIVE = 14400000; // 4 hours before re-fetch of channel emotes
const COLORS = [ /* fallback username colors */ ];
const bots = new Set([...]); // lowercase bot names to ignore
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
```

You can also change API URLs (`BTTV_GLOBAL`, `SEVEN_TV_GLOBAL`, `BADGES_URL`, etc.) if they change.

## Limitations & Notes

- **Read-only** – The script only listens; you cannot send chat messages.
- **No historical chat** – Only messages received after joining are shown.
- **Modular single-file setup** – No build step, no external JS libraries, cleanly separated modules.
- **Command scope** – Hide/focus commands only affect the current session and are not persisted.
- **Reconnection state** – The Reconnect button only restores connections; it does not preserve channel subscriptions across page refreshes.
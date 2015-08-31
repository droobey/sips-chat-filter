# Sips Chat Filter
A chat filter and bet tracker for Sips twitch chat

This script was adapted from the [Twitch Plays Pokemon Chat Filter by jpgohlke](https://github.com/jpgohlke/twitch-chat-filter)

## Features
* Hides !bets and !bet commands from chat
* Displays current bet in banner at the top of the chat

## Installing the script using Greasemonkey (Firefox)

Installing the userscript via Greasemonkey will automatically run it everytime you watch Sips stream.

1. Install the [Greasemonkey extension](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) for Firefox.

2. Click this link to navigate to the script URL: https://github.com/droobey/sips-chat-filter/raw/master/sips_chat_filter.user.js

3. Greasemonkey will detect the userscript and ask what to do with it. Tell it to "Install" the script.

4. Refresh Sips stream.


## Installing the script using Tampermonkey (Chrome)

Tampermonkey lets you install userscripts in Chrome, similarly to how Greasemonkey does it in Firefox.

1. Install the [Tampermonkey extension](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo/related) for Chrome.

2. Click this link to navigate to the script URL: https://github.com/droobey/sips-chat-filter/raw/master/sips_chat_filter.user.js

3. Tampermonkey will detect the userscript and will open a new tab. Click on `Install to Tampermonkey` and click Ok.

4. Refresh Sips stream.

## TODO
* Get it to play nicely with [BetterTTV](https://nightdev.com/betterttv/)
* Add !bankheist support
* Add your current bet to banner when betting is still open
* Add close button to banner
* Filter only version for [Twitch ReChat](https://www.rechat.org/)

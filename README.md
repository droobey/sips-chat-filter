# Sips Chat Filter
A chat filter and bet tracker for Sips twitch chat

This script was adapted from the [Twitch Plays Pokemon Chat Filter by jpgohlke](https://github.com/jpgohlke/twitch-chat-filter)

## Features
* Hides !bets and !bet commands from chat
* Displays current bet in banner at the top of the chat

## Using the script as a JavaScript bookmark

Fast and lightweight way to run the script.

1. Go to the bookmark menu of your browser and add a new bookmark with the title of your choice.

2. Copy the following snippet and paste it into the URL-Field: `javascript:(function(){document.body.appendChild(document.createElement('script')).src='http://github.com/droobey/sips-chat-filter/raw/master/sips_chat_filter.user.js';})();`

3. Save the Bookmark.

4. From now on, you can just click on that bookmark when you have Sips stream tab open to enable the script.

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

## Run the script via the console (no extensions needed)

If you don't want or can't install one of the previously mentioned browser extensions, one possibility is to run the script via the developer console. However, you will need to rerun the script every time you refresh the stream.

1. On the Sips stream page, open your broser's developer console.
    * On Firefox, press `Ctrl` + `Shift` + `K`
    * On Chrome, press `Ctrl` + `Shift` + `J`
    * On Safari, press `Ctrl` + `Alt` + `I`
    * On IE9+, press `F12`
    * On Opera, press `Ctrl` + `Shift` + `I`
    * If you are having trouble opening your console, try reading the in depth explanation [here](http://webmasters.stackexchange.com/questions/8525/how-to-open-the-javascript-console-in-different-browsers)

2. Copy the following snippet and paste it into the developer console on Sips stream page: `javascript:(function(){document.body.appendChild(document.createElement('script')).src='http://github.com/droobey/sips-chat-filter/raw/master/sips_chat_filter.user.js';})();`

3. Press `Enter` to run the code.

## TODO
* Get it to play nicely with [BetterTTV](https://nightdev.com/betterttv/)
* Add !bankheist support
* Add your current bet to banner when betting is still open
* Add close button to banner
* Filter only version for [Twitch ReChat](https://www.rechat.org/)

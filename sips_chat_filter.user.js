// ==UserScript==
// @name        Sips Chat Filter
// @namespace   https://github.com/droobey/sips-chat-filter
// @description Tracks and hides !bets from Sips twitch chat. Made for /r/sips
// @author      /u/droobey
// @updateURL   http://droobey.github.io/sips-chat-filter/sips_chat_filter.meta.js
// @downloadURL   https://raw.githubusercontent.com/droobey/sips-chat-filter/master/sips_chat_filter.user.js
// @include     /^https?://(www|beta)\.twitch\.tv\/(sips_(/(chat.*)?)?|chat\/.*channel=sips_.*)$/
// @version     1.01
// @grant       none
// @run-at      document-end
// ==/UserScript==

/*
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished
 * to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/*
 * sips_chat_filter.user.js
 *
 * Feel free to review/compress it yourself; good internet security is important!
 * Passes http://www.jshint.com on default settings
 
 * Adapted from Twitch Plays Pokemon Chat Filter
 * https://github.com/jpgohlke/twitch-chat-filter
 */


// ******************
//  CODING GUIDELINES
// ******************

// - Make sure that the code passes JSHint (http://www.jshint.com)
// - Write all code inside the wrapper IIFE to avoid creating global variables.
// - Constants and global variables are UPPER_CASE.

/* jshint 
    lastsemic:true,
    eqeqeq:true,
    sub:true
*/
/* global 
    $: false,
    localStorage: false,
    App: false,
*/

(function(code){
"use strict";

    // ----------------------------
    // Greasemonkey support
    // ----------------------------
    // Greasemonkey userscripts run in a separate environment and cannot use global
    // variables from the page directly. Because of this, we package all out code inside
    // a script tag and have it run in the context of the main page.

    // TODO: is there a way to get better error messages? It won't show any line numbers.

    var s = document.createElement('script');
    s.appendChild(document.createTextNode(
       '(' + code.toString() + '());'
    ));
    document.body.appendChild(s);

}(function(){
"use strict";

if (!window.$) { return; }

var TCF_VERSION = "1.0";
var TCF_INFO = "Sips Chat Filter version " + TCF_VERSION + " loaded. ";

// ============================
// Array Helpers
// ============================

function forEach(xs, f){
    for(var i=0; i<xs.length; i++){
        f(xs[i], i, xs);
    }
}

function any(xs, pred){
    for(var i=0; i<xs.length; i++){
        if(pred(xs[i])) return true;
    }
    return false;
}

function all(xs, pred){
   for(var i=0; i<xs.length; i++){
        if(!pred(xs[i])) return false;
   }
   return true;
}

function forIn(obj, f){
    for(var k in obj){
        if(Object.prototype.hasOwnProperty.call(obj, k)){
            f(k, obj[k]);
        }
    }
}

function str_contains(string, pattern){
    string = string.toLowerCase();
    return (string.indexOf(pattern.toLowerCase()) >= 0);
}

// ============================
// Initialization code
// ============================

var tcf_initializers = [];

function add_initializer(init){
    tcf_initializers.push(init);
}

function run_initializers(){
    forEach(tcf_initializers, function(init){
        init();
    });
}

// ============================
// Configuration Settings
// ============================

var REQUIRED_SETTING_PARAMS = [
    'name',     // Unique identifier for the setting,
                // used to store it persistently or to generate CSS classes
    'comment',  // Short description of the setting
    'category', // What menu to put this setting under
    'defaultValue' // Can be either boolean or list of strings.
];

var OPTIONAL_SETTING_PARAMS = [
    'longComment', // Longer description that shows when you hover over.
    
    'message_filter',  // When active, filter new chat messages using this predicate
    'message_css',     // When active, modify the existing chat lines with these CSS rules.
    'message_rewriter' // When active, replace the text of the message with the result of this function

];

function Setting(kv){
    // Check for required parameters and typos:
    forEach(REQUIRED_SETTING_PARAMS, function(param){
        if(!(param in kv)){
            throw new Error("Missing param " + param);
        }
    });
    forIn(kv, function(param){
        if(
            REQUIRED_SETTING_PARAMS.indexOf(param) < 0 &&
            OPTIONAL_SETTING_PARAMS.indexOf(param) < 0
        ){
            throw new Error("Unexpected param " + param);
        }
    });
    
    // Initialize members
    
    var that = this;
    forIn(kv, function(key, val){
        that[key] = val;
    });
    
    this._value = null;
    this._observers = [];
}

Setting.prototype.getValue = function(){
    if(this._value !== null){
        return this._value;
    }else{
        return this.defaultValue;
    }
};

Setting.prototype.setValue = function(value){
    var oldValue = this.getValue();
    this._value = value;
    var newValue = this.getValue();
    
    forEach(this._observers, function(obs){
        obs(newValue, oldValue);
    });
};

Setting.prototype.reset = function(){
    this.setValue(null);
};

Setting.prototype.observe = function(onChange){
    this._observers.push(onChange);
};

Setting.prototype.forceObserverUpdate = function(){
    var value = this.getValue();
    forEach(this._observers, function(obs){
        obs(value, value);
    });
};


var TCF_SETTINGS_LIST = [];
var TCF_SETTINGS_MAP  = {};

var TCF_FILTERS   = [];
var TCF_REWRITERS = [];
var TCF_STYLERS   = [];

function add_setting(kv){
    var setting = new Setting(kv);
    
    TCF_SETTINGS_LIST.push(setting);
    TCF_SETTINGS_MAP[setting.name] = setting;
    
    if(setting.message_filter  ){ TCF_FILTERS.push(setting); }
    if(setting.message_css     ){ TCF_STYLERS.push(setting); }
    if(setting.message_rewriter){ TCF_REWRITERS.push(setting); }
}

function get_setting_value(name){
    return TCF_SETTINGS_MAP[name].getValue();
}


// ----------------------------
// Persistence
// ----------------------------

var STORAGE_KEY = "sips-chat-filter-settings";

function get_local_storage_item(key){
    var item = localStorage.getItem(key);
    return (item ? JSON.parse(item) : null);
}

function set_local_storage_item(key, value){
    localStorage.setItem(key, JSON.stringify(value));
}

function load_settings(){
    var persisted;
    if(window.localStorage){
        persisted = get_local_storage_item(STORAGE_KEY) || get_old_saved_settings();
    }else{
        persisted = {};
    }
    
    forIn(TCF_SETTINGS_MAP, function(name, setting){
        if(name in persisted){
            setting.setValue(persisted[name]);
        }else{
            setting.setValue(null);
        }
    });
}

function save_settings(){
    if(!window.localStorage) return;
    
    var persisted = {};
    forIn(TCF_SETTINGS_MAP, function(name, setting){
        if(setting._value !== null){
            persisted[name] = setting._value;
        }
    });
    
    set_local_storage_item(STORAGE_KEY, persisted);
}

add_initializer(function(){
    forEach(TCF_SETTINGS_LIST, function(setting){
        setting.observe(function(){
            save_settings();
        });
    });
});

// ============================
// UI
// ============================

var CHAT_ROOM_SELECTOR = '.chat-room';
var CHAT_MESSAGE_SELECTOR = '.message';
var CHAT_FROM_SELECTOR = '.from';
var CHAT_LINE_SELECTOR = '.chat-line';

var CHAT_TEXTAREA_SELECTOR = ".chat-interface textarea";
var CHAT_BUTTON_SELECTOR = "button.send-chat-button";

function add_custom_css(parts){
    $('head').append('<style>' + parts.join("") + '</style>');
}
    
var bbox =  $('<div></div>');
    bbox.attr("id","sips-bet");
    bbox.css( "background-color", "#65a2d5");
    bbox.css( "color", "white");
    bbox.css( "z-index", "9999");
    bbox.css("position" , "absolute");
    bbox.css("top","0px");
    bbox.css("right","0px");
    bbox.css("width","100%");
    bbox.css( "font-size", "120%");
    bbox.css( "display", "none");
    
function drawBetBar(h){
        //Does the bar exist?
        if($('#sips-bet').length<=0){
            //No - append
            $(".chat-room").append(bbox);
        }
        
        $("#sips-bet").html(h);
       $("#sips-bet").show();

    }

// ============================
// Features
// ============================
// In this part we define all the settings and filters that we support
// and all code that needs to run when the script gets initialized.
    
    if(!Twitch.user.displayName()){
    var user="";
    }else{
    var user = Twitch.user.displayName().toLowerCase();
    }
    
    var dicks = 0;
    var bet_option = 0;
    
// ---------------------------
// Command Filter
// ---------------------------

var TPP_COMMANDS = [
    "!bets", "!bet "
];

function word_is_command(word,u,label){

    
    if(word.substring(0, "!betting".length) == "!betting"){
        return d;
    }
    
    var d = any(TPP_COMMANDS, function(cmd){
        if(word.substring(0, cmd.length) === cmd){
            if(word.substring(0, cmd.length) === TPP_COMMANDS[0] && u === user && get_setting_value('SipsTrackBet') ){
            var params = word.split(" ");
            dicks=params[1];
            bet_option=params[2];
            }
           
            return true;
        }
    });
    return d;
}




add_setting({
    name: 'SipsHideBet',
    comment: "Hide !bets",
    longComment: TPP_COMMANDS.join(", "),
    category: 'filters_category',
    defaultValue: true,
    
    message_filter: word_is_command
});

// -------------------------
//  Show current bet
//  -----------------------
    
// Choose winner
// !betting winoption 1
    
// Open bet
//                 max  min?   title          options
//  !betting start 2000 0 Win_Lose_Draw? Win Lose Draw    

var OPEN_BET = "!betting start";
var CLOSE_BET = "!betting close";
var WIN_BET = "!betting winoption";
var cur_options = [];    

    
    
function check_bet(cmd,u,label){
    var mod_check=false;
    if(label[0] == "owner" || label[0] == "mod"){
        mod_check=true;
    }
    if(cmd.substring(0, OPEN_BET.length) === OPEN_BET){
        
        if(!mod_check){return true;}
        
        cur_options=[];
        var params = cmd.split(" ");
        clearTimeout(barTimeout);
        var o = "Betting is open!<br/>";
        
       
        
        o += params[4].replace(/_/g," ")+"<br/>";        

         if(parseInt(params[3])>0){
         o += " Minimum bet of "+params[3];
         }
        
        if(parseInt(params[2])>0){
         o += "Max bet of "+params[2]+ " dicks";
         }
        o += "<br/>";
        var i = 1;
        for (index = 5; index < params.length; ++index) {
            o += i+") "+params[index]+" ";
            cur_options.push(params[index]);
            i++;
        }    
        drawBetBar(o);
        
        
    }
    
    if(cmd.substring(0, CLOSE_BET.length) === CLOSE_BET){
        if(!mod_check || cur_options==[]){return true;}
        
        var c = "Betting is now closed!<br/>";
        
        if(bet_option>0){
           c += "You bet "+dicks+" on "+cur_options[ parseInt(bet_option)-1 ];
    }else{
        c += "You did not bet any dicks!";
    }
        drawBetBar(c);

    }
    
    if(cmd.substring(0, WIN_BET.length) === WIN_BET){
        if(!mod_check || cur_options==[]){return true;}
        
        var params = cmd.split(" ");
        var winner = cur_options[ parseInt(params[2])-1 ] ;
        var w = "Bet result<br/>"+params[2] + ") " + winner + " won!";
        
        if(parseInt(params[2]) == bet_option){
         w += "<br/>You won!";
        }else{
         w += "<br/>You lost "+dicks+ " dicks!"; 
        }
      

        drawBetBar(w);

        dicks = 0;
        bet_option = 0;
        
        var barTimeout = setTimeout(function(){ $("#sips-bet").hide(); }, 30000);
        
    }
   
    
    return false;
}




add_setting({
    name: 'SipsTrackBet',
    comment: "Track !betting",
    longComment: TPP_COMMANDS.join(", "),
    category: 'filters_category',
    defaultValue: true,
    
    message_filter: check_bet
});


// ============================
// Settings Control Panel
// ============================

//var SETTINGS_BUTTON_SELECTOR = "button.settings";
var SETTINGS_MENU_SELECTOR   = ".chat-settings";

add_initializer(function(){

    add_custom_css([
        ".chat-room { z-index: inherit !important; }",
        ".chat-settings { z-index: 100 !important; }",
        
        ".custom_list_menu li {background: #bbb; display: block; list-style: none; margin: 1px 0; padding: 0 2px}",
        ".custom_list_menu li a {float: right;}"
    ]);

    var settingsMenu = $(SETTINGS_MENU_SELECTOR);

    // Add a scrollbar to the settings menu if its too long
    // We need to dynamically update the menu height because its a sibling of the
    // chat-room div, not its immediate child.
    var chat_room = $(CHAT_ROOM_SELECTOR);
    settingsMenu.css("overflow-y", "auto");
    function updateMenuHeight(){
        var h = chat_room.height();
        if(h > 0){
           //If we call updateMenuHeight too soon, we might get a
           // height of zero and would end up hiding the menu 
           settingsMenu.css("max-height", 0.9 * h);
       }
    }
    updateMenuHeight();
    setInterval(updateMenuHeight, 500); //In case the initial update cant see the real height yet.
    $(window).resize(updateMenuHeight);


    function addBooleanSetting(menuSection, option){
    
        menuSection.append(
            $('<label>').attr('for', option.name).attr('title', option.longComment || "")
            .append( $('<input type="checkbox">').attr('id', option.name) )
            .append( document.createTextNode(' ' + option.comment) )
        );
 
        var checkbox = $('#' + option.name);
        
        checkbox.on('change', function(){
            option.setValue( $(this).prop("checked") );
        });

        option.observe(function(newValue){
            checkbox.prop('checked', newValue);
        });
    }
    
    function addListSetting(menuSection, option){
    
        menuSection
        .append(
            $('<label>').attr('for', option.name).attr('title', option.longComment || "")
            .append( document.createTextNode('Add ' + option.comment) )
            .append( $('<input type="text">').attr('id', option.name).css('width', '100%') )
        ).append(
            $('<button>').attr('id', 'show-' + option.name)
            .append( document.createTextNode('Show ') )
            .append( $('<span>').attr('id', 'num-banned-' + option.name) )
            .append( document.createTextNode(' ' + option.comment) )
        ).append(
            $('<button>').attr('id', 'hide-' + option.name)
            .append( document.createTextNode('Hide ' + option.comment) )
        ).append(
            $('<div class="custom_list_menu">').attr('id', 'list-' + option.name)
        ).append(
            $('<button>').attr('id', 'clear-' + option.name)
           .append( document.createTextNode('Clear ' + option.comment) )
        );
        
        function add_list_item(item){
            var arr = option.getValue().slice();
            if(arr.indexOf(item) < 0){
                arr.push(item);
                option.setValue(arr);
            }
        }
        
        function remove_list_item(i){
            var arr = option.getValue().slice();
            arr.splice(i, 1);
            option.setValue(arr);
        }
        
        function hide_inner_list(){
            $('#show-'+option.name).show();
            $('#hide-'+option.name).hide();
            $('#clear-'+option.name).hide();
            $('#list-'+option.name).hide();
        }

        function show_inner_list(){
            $('#show-'+option.name).hide();
            $('#hide-'+option.name).show();
            $('#clear-'+option.name).show();
            $('#list-'+option.name).show();
        }

        hide_inner_list();

        option.observe(function(newValue){
            $('#num-banned-'+option.name).text(newValue.length);
            
            var innerList = $('#list-' + option.name);
            
            innerList.empty();
            forEach(newValue, function(word, i){
                innerList.append(
                    $("<li>")
                    .text(word)
                    .append(
                        $('<a href="#">')
                        .text("[X]")
                        .click(function(){ remove_list_item(i) })
                    )
                );

            });
        });
        
    }

    function addMenuSection(name){
        $('<div class="list-header"/>')
            .text(name)
            .appendTo(settingsMenu);
        
        var section = $('<div class="chat-menu-content">')
            .appendTo(settingsMenu);
        
        return section;
    }
    
    function addCategoryToSection(menuSection, category){
        forEach(TCF_SETTINGS_LIST, function(option){
            if(option.category !== category) return;
            
            var p = $('<p>')
                .attr('id', 'menu-'+option.name)
                .addClass('dropmenu_action')
                .appendTo(menuSection);
            
            var typ = typeof(option.defaultValue);
            if(typ === 'boolean'){
                addBooleanSetting(p, option);
            }else if(typ === 'object'){
                addListSetting(p, option);
            }else{
                throw new Error("Unrecognized setting " + typ);
            }
        });
    }

    var filter_sec = addMenuSection("Hide");
    addCategoryToSection(filter_sec, 'filters_category');
    

    var misc_sec = addMenuSection("Misc");
    misc_sec.append(
        $('<button>Reset Sips Filter settings</a>')
        .click(function(){
            if(confirm("This will reset all Sips Chat Filter settings to their default values. Are you sure you want to continue?")){
                forEach(TCF_SETTINGS_LIST, function(setting){
                    setting.reset();
                });
            }
        })
    );
    
});


// ============================
// Chat Stylers
// ============================

add_initializer(function(){
    var customCSS = [];      
    forEach(TCF_STYLERS, function(setting){
        customCSS.push(CHAT_ROOM_SELECTOR+"."+setting.name+" "+setting.message_css);
    });

    add_custom_css(customCSS);
    
    forEach(TCF_STYLERS, function(setting){
        setting.observe(function(newValue){
            $(CHAT_ROOM_SELECTOR).toggleClass(setting.name, newValue);
        });
    });
});

// ============================
// Chat Filtering
// ============================

function matches_filters(message, from,label){
    var matches = {};
    message = message || "";
    from = from || "";
    forEach(TCF_FILTERS, function(setting){
        matches[setting.name] = setting.message_filter(message, from, label);
    });
    return matches;
}

function rewrite_with_active_rewriters(message, from,label){
    var newMessage = message || "";
    from = from || "";
    forEach(TCF_REWRITERS, function(setting){
        if(setting.getValue()){
            newMessage = (setting.message_rewriter(newMessage, from, label) || newMessage);
        }
    });
    return newMessage;
}

add_initializer(function(){
    // Filter toggles
    var customCSS = [];
    forEach(TCF_FILTERS, function(setting){
        var filter = setting.name;
        var toggle = setting.name + "Hidden";
        customCSS.push(CHAT_ROOM_SELECTOR+"."+toggle+" "+CHAT_LINE_SELECTOR+"."+filter+"{display:none}");

        setting.observe(function(){
            $(CHAT_ROOM_SELECTOR).toggleClass(toggle, setting.getValue());
        });
    });
    add_custom_css(customCSS);
});

add_initializer(function(){
    var View_proto = require("web-client/components/chat-line")["default"].prototype;

    // New lines
    var original_didInsertElement = View_proto.didInsertElement;
    View_proto.didInsertElement = function() {
        original_didInsertElement.apply(this, arguments);
        var view = this.$();
        var matches = matches_filters(this.get("msgObject.message"), this.get("msgObject.from"),this.get("msgObject.labels"));
        
        for (var filter in matches) {
            view.toggleClass(filter, matches[filter]);
        }
    };

    // Existing lines
    $(CHAT_LINE_SELECTOR).each(function(){
        var view = $(this);
        var message = view.find(CHAT_MESSAGE_SELECTOR).text().trim();
        var from = view.find(CHAT_FROM_SELECTOR).text().trim();
        forEach(TCF_FILTERS, function(setting) {
            view.toggleClass(setting.name, setting.message_filter(message, from, label));
        });
        //Sadly, we can't apply rewriters to old messages because they are in HTML format.
    });
});

//
// ============================
// Main
// ============================

function main() {
    run_initializers();
    load_settings();

    console.log(TCF_INFO);
}

if ($(SETTINGS_MENU_SELECTOR).length) {
    // Already initialized
    main();
} else {
    // Initialize when chat view is inserted
    var ChatView_proto = require("web-client/views/chat")["default"].prototype;
    var original_didInsertElement = ChatView_proto.didInsertElement;
    ChatView_proto.didInsertElement = function(){
        original_didInsertElement && original_didInsertElement.apply(this, arguments);
        main();
    };
}

}));

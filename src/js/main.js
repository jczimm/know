var arrayContains = function(arr, obj) {
    var i = arr.length;
    while (i--) {
        if (arr[i] === obj) {
            return true;
        }
    }
    return false;
}

var lexer = new Lexer();
var tagger = new POSTagger();

var threshold = 0.3;

var unread = 0;

$(".status").text('connecting...');

var pusher = new Pusher("50ed18dd967b455393ed");
var subredditChannel = pusher.subscribe("todayilearned");


subredditChannel.bind("pusher:subscription_succeeded", function() {
    $(".status").text('waiting for a new post...');
});

subredditChannel.bind("new-listing", function(listing) {
    process(listing);
});

var last, all = [];

function process(listing) {
    var title = listing.title.trim();

    var newTitle = processTitle(title);
    if (newTitle === false) return;

    title = newTitle.charAt(0).toUpperCase() + newTitle.slice(1);

    listing.title = title;

    if (window.state && window.state === "hidden") {
        unread++;
        updateFavicon(unread);
    }

    if ($(".waiting")[0])
        $(".waiting").remove();

    if (last && last.title) {
        $("<a/>")
            .attr('href', last.url)
            .text(last.title)
            .prependTo("#more");
    }

    $("blockquote")
        .find('a')
        .attr('href', listing.url)
        .text(title);

    last = listing;
}

function processTitle(title) {
    var newTitle = title.replace(/^(til|today i learned) (that( )?)?/gi, "");
    if (title === newTitle || newTitle === "") // make sure it matches ^
        return false;

    // make sure the stripped title can be understood
    if (/^(about |why |of )/gi.test(newTitle) || /(me |i |my )/gi.test(newTitle))
        return false;

    /*var sigWordsInNewTitle = getSigWords(newTitle);
    var matches = getMatches(sigWordsInNewTitle, newTitle);*/

    newTitle = htmlDecode(newTitle);

    //var slength = sigWordsInNewTitle.length;
    if (/*matches / slength < threshold && */ !arrayContains(all, newTitle))
        all.push(newTitle);
    else {
        console.log("Blocked as repetitive: " + newTitle);
        return false;
    }

    // if `all` contains `newTitle`, return `newTitle`, else return `false`
    return (arrayContains(all, newTitle) && newTitle);
}

function getSigWords(title) {
    var tags = tagger.tag(lexer.lex(title));
    var sigWordsInNewTitle = [];
    for (it in tags) {
        var word = tags[it][0];
        var POS = tags[it][1];
        var f = POS[0];
        // pick out the verbs, the nouns, the adj, the adv, the prep, the foreign words, and the numbers
        if (f === "V" || f === "N" || f === "J" || f === "R" ||
            POS === "PRP" || POS === "FW" || POS === "LS" || POS === "CD")
            sigWordsInNewTitle.push(word);
    }

    return sigWordsInNewTitle;
}

function getMatches(sigWordsInNewTitle, newTitle) {
    var wordsInEntry, matches = 0;
    all.forEach(function(entry) { // for each entry,
        if (entry !== newTitle) { // if it's a different entry than this one,
            for (i = 0; i < sigWordsInNewTitle.length; i++) { // for all the words in the latest title,
                wordsInEntry = entry.split(" ");
                for (j = 0; j < wordsInEntry.length; j++) { // for all the words in the entries,
                    // if there is a word overlap between an old title and the latest title,
                    if (sigWordsInNewTitle[i] === wordsInEntry[j])
                        matches++; // increment counter
                }
            }
        }
    });
    return matches;
}


function htmlDecode(input) {
    var e = document.createElement('div');
    e.innerHTML = input;
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}

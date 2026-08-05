/* Minimal progressive enhancement for the visionOS code guide.
   Everything on these pages works with JS disabled; this adds the mobile nav
   toggle, an auto-built "on this page" list, and lightweight Swift colouring. */

(function () {
    'use strict';

    /* ---- mobile nav ---- */
    var toggle = document.getElementById('navToggle');
    if (toggle) {
        toggle.addEventListener('click', function () {
            document.body.classList.toggle('nav-open');
        });
    }

    /* ---- "on this page" from <h2 id> ---- */
    var target = document.getElementById('onThisPage');
    if (target) {
        var headings = document.querySelectorAll('main h2[id]');
        if (headings.length > 1) {
            var html = '<h3>On this page</h3>';
            headings.forEach(function (h) {
                html += '<a href="#' + h.id + '">' + h.textContent.trim() + '</a>';
            });
            target.innerHTML = html;
        }
    }

    /* ---- tiny Swift highlighter ----
       Single-pass tokenizer so strings and comments always win over keywords.
       Deliberately approximate: this is documentation, not an IDE. */

    var KEYWORDS = ('func var let if else guard return for while in switch case default break ' +
        'continue struct class enum protocol extension init deinit self super import public ' +
        'private internal fileprivate static final override async await try throws throw catch ' +
        'do defer where as is nil true false some any typealias mutating lazy weak unowned ' +
        'subscript get set willSet didSet repeat inout convenience required indirect actor ' +
        'nonisolated open rethrows associatedtype operator precedencegroup').split(' ');

    var KW = {};
    KEYWORDS.forEach(function (k) { KW[k] = true; });

    var TOKEN = new RegExp([
        '(\\/\\/[^\\n]*)',              // 1 line comment
        '(\\/\\*[\\s\\S]*?\\*\\/)',     // 2 block comment
        '("""[\\s\\S]*?""")',           // 3 multiline string
        '("(?:\\\\.|[^"\\\\\\n])*")',   // 4 string
        '(@[A-Za-z_][A-Za-z0-9_]*)',    // 5 attribute / macro
        '(#[a-z]+)',                    // 6 compiler directive
        '([A-Za-z_][A-Za-z0-9_]*)',     // 7 identifier
        '(\\b\\d[\\d_]*(?:\\.\\d+)?\\b)' // 8 number
    ].join('|'), 'g');

    function esc(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function highlight(src) {
        var out = '';
        var last = 0;
        var m;
        TOKEN.lastIndex = 0;
        while ((m = TOKEN.exec(src)) !== null) {
            out += esc(src.slice(last, m.index));
            last = m.index + m[0].length;
            var cls = null;
            if (m[1] || m[2]) cls = 'c';
            else if (m[3] || m[4]) cls = 's';
            else if (m[5] || m[6]) cls = 'at';
            else if (m[8]) cls = 'n';
            else if (m[7]) {
                if (KW[m[7]]) cls = 'k';
                else if (/^[A-Z]/.test(m[7])) cls = 't';
                else if (src[last] === '(') cls = 'f';
            }
            out += cls ? '<span class="' + cls + '">' + esc(m[0]) + '</span>' : esc(m[0]);
        }
        out += esc(src.slice(last));
        return out;
    }

    document.querySelectorAll('.codeblock pre code.swift').forEach(function (el) {
        el.innerHTML = highlight(el.textContent);
    });
})();

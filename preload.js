const fs = require('fs');
const path = require('path');
const { app, contextBridge, ipcRenderer } = require('electron');
const { marked, Tokenizer, Parser, Renderer } = require('marked');
const hljs = require('highlight.js/lib/common');
const katex = require('katex');
// const d3 = require('d3');


// customize marked.js
Tokenizer.prototype.paragraph = function (src) {
  const cap = this.rules.block.paragraph.exec(src);
  if (cap) {
    // customize
    var todo = cap[1].startsWith('TODO:') ? 'todo' 
    : cap[1].startsWith('NOTE:') ? 'note'
    : cap[1].startsWith('WARN:') ? 'warn'
    : null;
    if (todo) {
      cap[1] = cap[1].substring(5);
    }

    const token = {
      type: 'paragraph',

      // customize
      todo: todo,

      raw: cap[0],
      text: cap[1].charAt(cap[1].length - 1) === '\n'
        ? cap[1].slice(0, -1)
        : cap[1],
      tokens: []
    };
    this.lexer.inline(token.text, token.tokens);
    return token;
  }
};

Parser.prototype.parse = function (tokens, top = true) {
  let out = '',
    i,
    j,
    k,
    l2,
    l3,
    row,
    cell,
    header,
    body,
    token,
    ordered,
    start,
    loose,
    itemBody,
    item,
    checked,
    task,
    checkbox,
    ret;

  const l = tokens.length;
  for (i = 0; i < l; i++) {
    token = tokens[i];

    // Run any renderer extensions
    if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
      ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
      if (ret !== false || !['space', 'hr', 'heading', 'code', 'table', 'blockquote', 'list', 'html', 'paragraph', 'text'].includes(token.type)) {
        out += ret || '';
        continue;
      }
    }

    switch (token.type) {
      case 'space': {
        continue;
      }
      case 'hr': {
        out += this.renderer.hr();
        continue;
      }
      case 'heading': {
        out += this.renderer.heading(
          this.parseInline(token.tokens),
          token.depth,
          unescape(this.parseInline(token.tokens, this.textRenderer)),
          this.slugger);
        continue;
      }
      case 'code': {
        out += this.renderer.code(token.text,
          token.lang,
          token.escaped);
        continue;
      }
      case 'table': {
        header = '';

        // header
        cell = '';
        l2 = token.header.length;
        for (j = 0; j < l2; j++) {
          cell += this.renderer.tablecell(
            this.parseInline(token.header[j].tokens),
            { header: true, align: token.align[j] }
          );
        }
        header += this.renderer.tablerow(cell);

        body = '';
        l2 = token.rows.length;
        for (j = 0; j < l2; j++) {
          row = token.rows[j];

          cell = '';
          l3 = row.length;
          for (k = 0; k < l3; k++) {
            cell += this.renderer.tablecell(
              this.parseInline(row[k].tokens),
              { header: false, align: token.align[k] }
            );
          }

          body += this.renderer.tablerow(cell);
        }
        out += this.renderer.table(header, body);
        continue;
      }
      case 'blockquote': {
        body = this.parse(token.tokens);
        out += this.renderer.blockquote(body);
        continue;
      }
      case 'list': {
        ordered = token.ordered;
        start = token.start;
        loose = token.loose;
        l2 = token.items.length;

        body = '';
        for (j = 0; j < l2; j++) {
          item = token.items[j];
          checked = item.checked;
          task = item.task;

          itemBody = '';
          if (item.task) {
            checkbox = this.renderer.checkbox(checked);
            if (loose) {
              if (item.tokens.length > 0 && item.tokens[0].type === 'paragraph') {
                item.tokens[0].text = checkbox + ' ' + item.tokens[0].text;
                if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === 'text') {
                  item.tokens[0].tokens[0].text = checkbox + ' ' + item.tokens[0].tokens[0].text;
                }
              } else {
                item.tokens.unshift({
                  type: 'text',
                  text: checkbox
                });
              }
            } else {
              itemBody += checkbox;
            }
          }

          itemBody += this.parse(item.tokens, loose);
          body += this.renderer.listitem(itemBody, task, checked);
        }

        out += this.renderer.list(body, ordered, start);
        continue;
      }
      case 'html': {
        // TODO parse inline content if parameter markdown=1
        out += this.renderer.html(token.text);
        continue;
      }
      case 'paragraph': {
        // customize
        out += this.renderer.paragraph(this.parseInline(token.tokens), token.todo);

        continue;
      }
      case 'text': {
        body = token.tokens ? this.parseInline(token.tokens) : token.text;
        while (i + 1 < l && tokens[i + 1].type === 'text') {
          token = tokens[++i];
          body += '\n' + (token.tokens ? this.parseInline(token.tokens) : token.text);
        }
        out += top ? this.renderer.paragraph(body) : body;
        continue;
      }

      default: {
        const errMsg = 'Token with "' + token.type + '" type was not found.';
        if (this.options.silent) {
          console.error(errMsg);
          return;
        } else {
          throw new Error(errMsg);
        }
      }
    }
  }

  return out;
};

Renderer.prototype.paragraph = function (text, todo) {
  // customize
  return (todo ? '<p class="' + todo + '">' : '<p>') + text + '</p>\n';
};



let highlightcss = null;
let highlightstyle = null;

let katexcss = null;
let katexstyle = null;

let latexcss = null;
let latexstyle = null;

let config = {};
(() => {
  let filePath = path.join(process.resourcesPath, 'extra/config.json');
  if (fs.existsSync(filePath)) {
    config = JSON.parse('' + fs.readFileSync(filePath));
  }
  highlightcss = path.join(__dirname, config.highlightcss || './node_modules/highlight.js/styles/dark.css');
  katexcss = path.join(__dirname, config.katexcss || './node_modules/katex/dist/katex.css');
  latexcss = path.join(__dirname, config.latexcss || './node_modules/latex.js/dist/css/base.css');
})();

let viewcss = null;
let viewstyle = null;
(() => {
  let filepath = path.join(process.resourcesPath, 'extra/view.css');
  if (fs.existsSync(filepath)) {
    viewcss = filepath;
    viewstyle = '' + fs.readFileSync(filepath);
  } else {
    filepath = './resources/extra/view.css';
    if (fs.existsSync(filepath)) {
      viewcss = filepath;
      viewstyle = '' + fs.readFileSync(filepath);
    } else {
      viewcss = null;
    }
  }
})();

if (fs.existsSync(highlightcss)) {
  highlightstyle = '' + fs.readFileSync(highlightcss);
} else {
  highlightcss = null;
}

if (fs.existsSync(katexcss)) {
  katexstyle = '' + fs.readFileSync(katexcss);
  let pos = -1;
  while ((pos = katexstyle.indexOf('@font-face', pos)) > -1) {
    const endpos = katexstyle.indexOf('}', pos);
    katexstyle = katexstyle.substring(0, pos) + katexstyle.substring(endpos + 1);
  }
} else {
  katexcss = null;
}

if (fs.existsSync(latexcss)) {
  latexstyle = '' + fs.readFileSync(latexcss);
  let pos = -1;
  if ((pos = latexstyle.indexOf('html, .page {')) > -1) {
    const endpos = latexstyle.indexOf('}', pos);
    latexstyle = latexstyle.substring(0, pos) + latexstyle.substring(endpos + 1);
  }
  if ((pos = latexstyle.indexOf('body, .page {')) > -1) {
    const endpos = latexstyle.indexOf('}', pos);
    latexstyle = latexstyle.substring(0, pos) + latexstyle.substring(endpos + 1);
  }
  if ((pos = latexstyle.indexOf('h1, h2, h3, h4 {')) > -1) {
    const endpos = latexstyle.indexOf('}', pos);
    latexstyle = latexstyle.substring(0, pos) + latexstyle.substring(endpos + 1);
  }
  // 
} else {
  latexcss = null;
}

contextBridge.exposeInMainWorld(
  'api', {
    config: config,
    marked: marked,
    hljs: hljs,
    katex: katex,
    // d3: d3,
    viewcss: viewcss,
    viewstyle: viewstyle,
    highlightcss: highlightcss,
    highlightstyle: highlightstyle,
    katexcss: katexcss,
    katexstyle: katexstyle,
    latexcss: latexcss,
    latexstyle: latexstyle,
    send: (channel, data) => {
      let validChannels = ['theme-change', 'file-save'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      } else {
        console.error('invalid channel', channel);
      }
    },
    receive: (channel, func) => {
      let validChannels = ['log', 'open-file', 'export-html', 'change-theme', 'save-file', 'toggle-renderer', 'show-toast', 'load-images', 'list-images', 'load-examples'];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      } else {
        console.error('invalid channel', channel);
      }
    }
  }
);

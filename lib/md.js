// regexes adapted from https://www.yongliangliu.com/blog/rmark

const p = /([^\n]+\n?)/g

const h1 = /^#{1}\s?([^\n]+)/gm
const h2 = /^#{2}\s?([^\n]+)/gm
const h3 = /^#{3}\s?([^\n]+)/gm
const h4 = /^#{4}\s?([^\n]+)/gm
const h5 = /^#{5}\s?([^\n]+)/gm
const h6 = /^#{6}\s?([^\n]+)/gm

const bold = /\*\*\s?([^\n]+)\*\*/g
const italic = /\*\s?([^\n]+)\*/g
const boldItalic = /\*\*\*\s?([^\n]+)\*\*\*/g

const pre = /```([^\n]+)\n([\s\S]*?)```/g
const code = /`([^\n]+)`/g

const li = /^[-*] (.*)/gm

function parse(md) {
  let el = document.createElement('div');
  el.className = 'markdown';

  el.innerHTML = md
    .replace(h1, '<h1>$1</h1>')
    .replace(h2, '<h2>$1</h2>')
    .replace(h3, '<h3>$1</h3>')
    .replace(h4, '<h4>$1</h4>')
    .replace(h5, '<h5>$1</h5>')
    .replace(h6, '<h6>$1</h6>')
    .replace(bold, '<strong>$1</strong>')
    .replace(italic, '<em>$1</em>')
    .replace(boldItalic, '<strong><em>$1</em></strong>')
    .replace(pre, '<pre><code class="language-$1">$2</code></pre>')
    .replace(code, '<code>$1</code>')
    .replace(li, '<li>$1</li>') // browser will probably take this invalid markup like a champ
    .replace(p, '<p>$1</p>');

  el.querySelectorAll('p').forEach(p => {
    if (!p.textContent.trim()) {
      p.remove(); // fix random empty paragraphs
    }
  });

  return el;
}

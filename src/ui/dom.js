import { sfx } from '../audio/audio.js';

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function button(label, onClick, cls = '', extra = {}) {
  return h('button', {
    class: 'btn ' + cls,
    type: 'button',
    ...extra,
    onclick: (e) => {
      (cls.includes('back') ? sfx.back : sfx.select)();
      onClick(e);
    },
  }, label);
}

export function segmented(options, value, onChange) {
  const wrap = h('div', { class: 'seg' });
  const render = () => {
    wrap.replaceChildren(...options.map((o) => h('button', {
      type: 'button',
      class: 'seg-item' + (o.value === value ? ' on' : ''),
      onclick: () => {
        sfx.select();
        value = o.value;
        render();
        onChange(o.value);
      },
    }, o.label)));
  };
  render();
  return wrap;
}

"use client";

import React, { forwardRef, useEffect, useMemo } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

function stripBBoxWrappers(input: string): string {
  const pattern = /\\bbox\s*(\[[^\]]*\])?\s*{/g;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    result += input.slice(lastIndex, match.index);
    let idx = match.index + match[0].length;
    let depth = 1;
    while (idx < input.length && depth > 0) {
      const char = input[idx];
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
      }
      idx += 1;
    }
    if (depth === 0) {
      result += input.slice(match.index + match[0].length, idx - 1);
      lastIndex = idx;
    } else {
      result += input.slice(match.index, idx);
      lastIndex = idx;
      break;
    }
  }
  result += input.slice(lastIndex);
  return result;
}

interface SlideIframeProps {
  content: string;
  title: string;
  presentationMode?: boolean;
}

export const SlideIframe = forwardRef<HTMLIFrameElement, SlideIframeProps>(({ content, title, presentationMode = false }, ref) => {
  const trustSlides = process.env.NEXT_PUBLIC_TRUST_SLIDES !== 'false';
  const { headHtml, bodyHtml } = useMemo(() => {
    let html = trustSlides ? content : sanitizeHtml(content);
    html = html.replace(/<script\b[^>]*src=["'][^"']*polyfill\.io[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<!doctype[^>]*>/gi, '');
    html = stripBBoxWrappers(html);

    let extractedHead = '';
    let extractedBody = '';

    if (typeof window !== 'undefined' && 'DOMParser' in window) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        if (doc.head) {
          extractedHead = doc.head.innerHTML || '';
        }
        if (doc.body && doc.body.innerHTML.trim()) {
          extractedBody = doc.body.innerHTML;
        } else {
          extractedBody = html
            .replace(/<\/?.?html[^>]*>/gi, '')
            .replace(/<\/?.?head[^>]*>/gi, '')
            .replace(/<\/?.?body[^>]*>/gi, '');
        }
      } catch {
        extractedBody = html;
      }
    } else {
      extractedBody = html;
    }

    return { headHtml: extractedHead, bodyHtml: extractedBody };
  }, [content, trustSlides]);

  const baseHref = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';
  const appStylesheetsHtml = useMemo(() => {
    if (typeof document === 'undefined') return '';
    const hrefs = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
      .map((l) => (l as HTMLLinkElement).getAttribute('href') || '')
      .filter(Boolean)
      .filter((href) => href.includes('/_next/static/css/'));
    const unique = Array.from(new Set(hrefs));
    return unique.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n');
  }, []);

  const baseStylesHtml = presentationMode
    ? `
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
            }
          </style>
      `
    : `
          <link rel="stylesheet" href="/slide-iframe.css">
          <style>
            *, *::before, *::after {
              box-sizing: border-box;
            }
            html {
              overflow: auto;
            }
            body { 
              margin: 0;
              padding: 1.5rem;
              background-color: #111827; 
              color: #E5E7EB;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
            }
            * {
              max-width: 100%;
            }
            a { color: #60A5FA; }
            a:visited { color: #A78BFA; }
          </style>
      `;

  const katexOverridesHtml = `
          <style>
            .katex { 
              font-size: 1.1em; 
              color: inherit;
            }
            .katex-display { 
              overflow-x: auto; 
              overflow-y: hidden;
              padding: 0.5rem 0;
              margin: 0.75rem 0;
              text-align: center;
            }
            .katex-display > .katex {
              display: inline-block;
              text-align: center;
              white-space: nowrap;
            }
            .katex .mord, .katex .mbin, .katex .mrel, .katex .mopen, .katex .mclose, .katex .mpunct, .katex .minner {
              color: inherit;
            }
            .katex-html {
              color: inherit;
            }
            .katex-error {
              color: #f87171;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 0.85em;
              background: rgba(248, 113, 113, 0.1);
              padding: 0.125rem 0.25rem;
              border-radius: 0.25rem;
            }
          </style>
  `;
  const fullHtml = String.raw`
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; style-src 'unsafe-inline' https: http: data:; img-src https: http: data: blob:; media-src https: http: data: blob:; font-src https: http: data:; connect-src https: http: ws: wss: data:; worker-src blob: https: http: data:; child-src https: http: data: blob:; frame-src https: http: data: blob:; object-src 'none'; base-uri 'self'">
          <base href="${baseHref}">
          ${appStylesheetsHtml}
          <link rel="stylesheet" href="/katex/katex.min.css">
          ${katexOverridesHtml}
          <script defer src="/katex/katex.min.js"></script>
          <script defer src="/katex/contrib/auto-render.min.js"></script>
          <script defer src="/katex/contrib/mathtex-script-type.min.js"></script>
          <script>
            window.MathJax = {
              tex: {
                inlineMath: [['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true,
              },
              options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
              },
              startup: {
                typeset: false,
                ready: () => {
                  try {
                    // @ts-ignore
                    MathJax.startup.defaultReady();
                  } catch (_) {}

                  try {
                    // @ts-ignore
                    const mj = MathJax;
                    // @ts-ignore
                    const tp = mj && mj.typesetPromise;
                    if (typeof tp === 'function') {
                      const p = tp.call(mj);
                      if (p && typeof p.catch === 'function') p.catch(function(){});
                      return;
                    }
                    // @ts-ignore
                    if (mj && typeof mj.typeset === 'function') {
                      // @ts-ignore
                      mj.typeset();
                      return;
                    }
                    // @ts-ignore
                    if (mj && mj.Hub && typeof mj.Hub.Queue === 'function') {
                      // Compat: MathJax v2
                      // @ts-ignore
                      mj.Hub.Queue(['Typeset', mj.Hub]);
                    }
                  } catch (_) {}
                },
              },
            };

            (function(){
              function ensureMathJaxShims(mj){
                try {
                  if (!mj) return;
                  if (typeof mj.typesetPromise !== 'function') {
                    mj.typesetPromise = function(){
                      try {
                        if (mj.Hub && typeof mj.Hub.Queue === 'function') {
                          mj.Hub.Queue(['Typeset', mj.Hub]);
                        }
                      } catch (_) {}
                      return Promise.resolve();
                    };
                  }
                  if (typeof mj.typeset !== 'function') {
                    mj.typeset = function(){
                      try {
                        if (typeof mj.typesetPromise === 'function') {
                          mj.typesetPromise();
                          return;
                        }
                        if (mj.Hub && typeof mj.Hub.Queue === 'function') {
                          mj.Hub.Queue(['Typeset', mj.Hub]);
                        }
                      } catch (_) {}
                    };
                  }
                } catch (_) {}
              }

              try {
                var current = window && window.MathJax;
                ensureMathJaxShims(current);

                var _mj = current;
                Object.defineProperty(window, 'MathJax', {
                  configurable: true,
                  enumerable: true,
                  get: function(){ return _mj; },
                  set: function(v){ _mj = v; ensureMathJaxShims(_mj); },
                });
              } catch (_) {}
            })();
          </script>
          <script async id="MathJax-script" src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
          <script>
            (function(){
              var _mj = window.MathJax;
              function patch(obj){
                if (!obj || typeof obj !== 'object') obj = {};
                if (typeof obj.typesetPromise !== 'function') {
                  obj.typesetPromise = function(){
                    try { return Promise.resolve(); } catch (e) { return { then: function(r){ r(); } }; }
                  };
                }
                if (typeof obj.typeset !== 'function') {
                  obj.typeset = function(){};
                }
                if (!obj.startup || typeof obj.startup !== 'object') obj.startup = {};
                if (!obj.startup.promise) {
                  try { obj.startup.promise = Promise.resolve(); } catch (e) { obj.startup.promise = { then: function(r){ r(); } }; }
                }
                return obj;
              }
              function enforce(){
                try { _mj = patch(window.MathJax); } catch (e) {}
                try { window.MathJax = _mj; } catch (e) {}
              }
              try {
                Object.defineProperty(window, 'MathJax', {
                  configurable: true,
                  get: function(){ return _mj; },
                  set: function(v){ _mj = patch(v); }
                });
              } catch (e) {
                // ignore
              }
              enforce();
              try { setTimeout(enforce, 0); } catch (e) {}
              try { document.addEventListener('DOMContentLoaded', enforce); } catch (e) {}
            })();
          </script>
          <script>
            (function(){
              function inject(src, onload, onerror){
                var s=document.createElement('script');
                s.src=src; s.async=true; s.onload=onload; s.onerror=onerror; document.head.appendChild(s);
              }
              var cdn="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
              var local="/vendor/mermaid/mermaid.min.js";
              inject(local, function(){ try{ console.log('[SLIDE] mermaid local cargado'); }catch(e){} }, function(){
                try{ console.warn('[SLIDE] mermaid local no disponible, usando CDN'); }catch(e){}
                inject(cdn, function(){ try{ console.log('[SLIDE] mermaid CDN cargado'); }catch(e){} }, function(err){ try{ console.error('Fallo al cargar mermaid', err); }catch(e){} });
              });
            })();
          </script>
          <script>
            (function(){
              function send(l,a){
                try{parent.postMessage({__slideLog:true,level:l,args:Array.prototype.slice.call(a).map(function(x){try{return x.stack||x.message||String(x)}catch(e){return String(x)}})},"*");}catch(e){}
              }
              var levels=['log','warn','error'];
              for(var i=0;i<levels.length;i++){(function(n){var o=console[n];console[n]=function(){send(n,arguments);if(o) o.apply(console,arguments);};})(levels[i]);}
              window.addEventListener('error',function(e){
                var msg = e.message || '';
                if (msg.indexOf('SyntaxError') !== -1 && e.filename && e.filename.indexOf('blob:') === 0) {
                  return;
                }
                send('error',[e.message,e.filename,e.lineno,e.colno]);
              });
              window.addEventListener('unhandledrejection',function(e){send('error',['unhandledrejection',e.reason&& (e.reason.stack||e.reason.message||String(e.reason))]);});
            })();
          </script>
          <script>
            (function(){
              function loadScript(src){
                return new Promise(function(res,rej){
                  var s=document.createElement('script');
                  s.src=src; s.async=true; s.onload=res; s.onerror=function(e){console.error('Failed to load',src,e); rej(e)}; document.head.appendChild(s);
                });
              }
              var LIBS={
                plotly:{url:'https://cdn.plot.ly/plotly-2.30.0.min.js', global:'Plotly'},
                chartjs:{url:'https://cdn.jsdelivr.net/npm/chart.js', global:'Chart'},
                echarts:{url:'https://cdn.jsdelivr.net/npm/echarts', global:'echarts'},
                d3:{url:'https://d3js.org/d3.v7.min.js', global:'d3'},
                three:{url:'https://unpkg.com/three@0.160.0/build/three.min.js', global:'THREE'}
              };
              function detectRequested(){
                var req=new Set();
                var nodes=[].slice.call(document.querySelectorAll('[data-libs]'));
                nodes.forEach(function(n){
                  (n.getAttribute('data-libs')||'').split(',').map(function(s){return s.trim().toLowerCase();}).filter(Boolean).forEach(function(k){req.add(k)});
                });
                var map=[
                  ['plotly','[data-plotly],.plotly,div.plotly'],
                  ['chartjs','[data-chartjs],canvas.chartjs'],
                  ['echarts','[data-echarts],.echarts'],
                  ['d3','[data-d3],.d3-root'],
                  ['three','[data-three],.three,canvas.three']
                ];
                map.forEach(function(p){ if(document.querySelector(p[1])) req.add(p[0]); });
                return Array.from(req);
              }
              async function ensureLibs(){
                var want=detectRequested();
                for(var i=0;i<want.length;i++){
                  var k=want[i]; var L=LIBS[k]; if(!L) continue;
                  if(!(window)[L.global]){ try{ await loadScript(L.url); console.log('[SLIDE] loaded',k); }catch(e){} }
                }
              }
              if(document.readyState==='complete' || document.readyState==='interactive') setTimeout(ensureLibs,0); else document.addEventListener('DOMContentLoaded',ensureLibs);
            })();
          </script>
          <script>
            (function(){
              function initMermaid(){
                if(!(window).mermaid) return;
                try{(window).mermaid.initialize({startOnLoad:false,securityLevel:'loose'});}catch(e){}
                var blocks=[];
                blocks=blocks.concat([].slice.call(document.querySelectorAll('pre code.language-mermaid')));
                blocks=blocks.concat([].slice.call(document.querySelectorAll('pre code.mermaid')));
                blocks=blocks.concat([].slice.call(document.querySelectorAll('div.mermaid')));
                for(var i=0;i<blocks.length;i++){
                  var el=blocks[i];
                  var code=el.textContent||el.innerText||'';
                  var id='mermaid-'+i+'-'+Math.random().toString(36).slice(2);
                  (window).mermaid.render(id, code).then(function(res){
                    var wrap=document.createElement('div');
                    wrap.innerHTML=res.svg;
                    var svg=wrap.firstElementChild;
                    if(el.parentElement && el.tagName.toLowerCase()==='code' && el.parentElement.tagName.toLowerCase()==='pre'){
                      el.parentElement.replaceWith(svg);
                    }else{
                      el.replaceWith(svg);
                    }
                  }).catch(function(err){try{console.error('Mermaid render error',err);}catch(e){}});
                }
              }
              if(document.readyState==='complete' || document.readyState==='interactive') setTimeout(initMermaid,0); else document.addEventListener('DOMContentLoaded',initMermaid);
            })();
          </script>
          ${headHtml}
          ${baseStylesHtml}
          <script>
              (function(){
              function start() {
                  var rendering = false;
                  var scheduled = null;
                  var hasMathJax = false;

                  function detectMathJax() {
                      try {
                          var scripts = document.querySelectorAll('script[src]');
                          for (var i = 0; i < scripts.length; i++) {
                              var src = scripts[i].src || '';
                              if (src.indexOf('mathjax') !== -1 || src.indexOf('MathJax') !== -1) {
                                  return true;
                              }
                          }
                          var mjConfig = document.querySelector('script:not([src])');
                          if (mjConfig && mjConfig.textContent && mjConfig.textContent.indexOf('MathJax') !== -1) {
                              return true;
                          }
                      } catch (e) {}
                      return false;
                  }

                  hasMathJax = detectMathJax();

                  function getAutoRender(){
                      try {
                          return (typeof renderMathInElement === 'function') ? renderMathInElement : (window && window['renderMathInElement']);
                      } catch (e) {
                          return null;
                      }
                  }

                  function injectScriptOnce(id, src) {
                      try {
                          if (document.getElementById(id)) return;
                          var s = document.createElement('script');
                          s.id = id;
                          s.src = src;
                          s.async = true;
                          s.onerror = function(){
                              try { console.error('[SLIDE] Failed to load', src); } catch (e) {}
                          };
                          document.head.appendChild(s);
                      } catch (e) {
                      }
                  }

                  function ensureKatexScripts(){
                      try {
                          if (!(window && window.katex)) injectScriptOnce('slide-katex-js', '/katex/katex.min.js');
                          if (typeof getAutoRender() !== 'function') injectScriptOnce('slide-katex-auto-render', '/katex/contrib/auto-render.min.js');
                      } catch (e) {
                      }
                  }

                  function normalizeDoubleEscapedDelimiters(root){
                      try {
                          var bs = String.fromCharCode(92);
                          var dbl = bs + bs;
                          var dblRegexCmd = new RegExp(dbl + dbl + '([A-Za-z])', 'g');
                          var dblRegexSym = new RegExp(dbl + dbl + '([,;!])', 'g');
                          var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                              acceptNode: function(node){
                                  try {
                                      var p = node && node.parentElement;
                                      if (!p) return NodeFilter.FILTER_REJECT;
                                      var tag = p.tagName;
                                      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
                                      return NodeFilter.FILTER_ACCEPT;
                                  } catch (e) {
                                      return NodeFilter.FILTER_REJECT;
                                  }
                              }
                          });
                          var n;
                          while ((n = walker.nextNode())) {
                              var v = n.nodeValue || '';
                              if (v.indexOf(dbl) === -1) continue;
                              var hasMath = (v.indexOf('$') !== -1) || (v.indexOf(bs + '(') !== -1) || (v.indexOf(bs + '[') !== -1);
                              var next = v
                                  .split(dbl + '(').join(bs + '(')
                                  .split(dbl + ')').join(bs + ')')
                                  .split(dbl + '[').join(bs + '[')
                                  .split(dbl + ']').join(bs + ']');
                              if (hasMath) {
                                  next = next.replace(dblRegexCmd, bs + '$1');
                                  next = next.replace(dblRegexSym, bs + '$1');
                              }
                              if (next !== v) n.nodeValue = next;
                          }
                      } catch (e) {
                      }
                  }

                  function looksLikeLatex(s){
                      if (!s) return false;
                      if (s.indexOf('function') !== -1 || s.indexOf('const') !== -1 || s.indexOf('var') !== -1) return false;
                      if (s.indexOf('{') !== -1 || s.indexOf(';') !== -1) return false;
                      var bs = String.fromCharCode(92);
                      if (s.indexOf(bs) !== -1) return true;
                      if (s.indexOf('=') !== -1 || s.indexOf('_') !== -1 || s.indexOf('^') !== -1) return true;
                      return false;
                  }

                  function renderWholeDelimitedElements(){
                      try {
                          var katexLib = (window && window.katex) ? window.katex : null;
                          if (!katexLib || typeof katexLib.render !== 'function') return;
                          var selectors = ['pre', 'code', '.math', '.equation', 'div', 'p', 'span', 'li', 'td', 'th'];
                          var els = Array.prototype.slice.call(document.querySelectorAll(selectors.join(',')));
                          els.forEach(function(el){
                              try {
                                  if (!el || !el.tagName) return;
                                  var tag = el.tagName.toUpperCase();
                                  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') return;

                                  var isLeaf = !el.children || el.children.length === 0;
                                  var isStrictMathContainer = (tag === 'PRE' || tag === 'CODE');
                                  if (!isStrictMathContainer && !isLeaf) {
                                      try {
                                          var desc = el.querySelectorAll ? el.querySelectorAll('*') : [];
                                          if (!desc || desc.length > 500) return;
                                          for (var di = 0; di < desc.length; di++) {
                                              var dt = desc[di] && desc[di].tagName ? desc[di].tagName.toUpperCase() : '';
                                              if (!dt) continue;
                                              if (dt === 'SPAN' || dt === 'BR' || dt === 'B' || dt === 'I' || dt === 'EM' || dt === 'STRONG' || dt === 'SUB' || dt === 'SUP' || dt === 'SMALL') continue;
                                              return;
                                          }
                                      } catch (e) {
                                          return;
                                      }
                                  }

                                  if (el.querySelector && el.querySelector('.katex')) return;
                                  if (el.getAttribute && el.getAttribute('data-katex-rendered') === 'true') return;

                                  var txt = (el.textContent || '').trim();
                                  if (!txt) return;
                                  if (txt.length > 5000) return;

                                  var latex = null;
                                  var displayMode = false;

                                  var m = txt.match(/^\$\$([\s\S]+?)\$\$$/);
                                  if (m) {
                                      latex = (m[1] || '').trim();
                                      displayMode = true;
                                  } else {
                                      m = txt.match(/^\\\[([\s\S]+?)\\\]$/);
                                      if (m) {
                                          latex = (m[1] || '').trim();
                                          displayMode = true;
                                      } else {
                                          m = txt.match(/^\\\(([\s\S]+?)\\\)$/);
                                          if (m) {
                                              latex = (m[1] || '').trim();
                                              displayMode = false;
                                          } else {
                                              m = txt.match(/^\$([\s\S]+?)\$$/);
                                              if (m) {
                                                  latex = (m[1] || '').trim();
                                                  displayMode = false;
                                              }
                                          }
                                      }
                                  }

                                  if (!latex) return;
                                  try {
                                      latex = latex
                                          .replace(/\\\\([A-Za-z])/g, '\\$1')
                                          .replace(/\\\\([,;!])/g, '\\$1');
                                  } catch (e) {}
                                  if (!looksLikeLatex(latex)) return;

                                  if (el.tagName.toLowerCase() === 'pre') displayMode = true;
                                  if (el.tagName.toLowerCase() === 'code' && el.parentElement && el.parentElement.tagName && el.parentElement.tagName.toLowerCase() === 'pre') displayMode = true;

                                  katexLib.render(latex, el, {
                                      displayMode: !!displayMode,
                                      throwOnError: false,
                                      strict: 'ignore',
                                      trust: true,
                                      macros: {
                                          '\\R': '\\mathbb{R}',
                                          '\\N': '\\mathbb{N}',
                                          '\\Z': '\\mathbb{Z}',
                                          '\\C': '\\mathbb{C}',
                                          '\\F': '\\mathcal{F}',
                                          '\\Laplace': '\\mathcal{L}',
                                          '\\fourier': '\\mathfrak{F}',
                                          '\\Re': '\\operatorname{Re}',
                                          '\\Im': '\\operatorname{Im}'
                                      }
                                  });
                                  if (el.setAttribute) el.setAttribute('data-katex-rendered', 'true');
                              } catch (e) {
                              }
                          });
                      } catch (e) {
                      }
                  }

                  function renderCodeBlocks(){
                      try {
                          var katexLib = (window && window.katex) ? window.katex : null;
                          if (!katexLib || typeof katexLib.render !== 'function') return;
                          var nodes = Array.prototype.slice.call(document.querySelectorAll('pre code, code'));
                          nodes.forEach(function(el){
                              try {
                                  var cls = (el.getAttribute && el.getAttribute('class')) ? (el.getAttribute('class') || '') : '';
                                  var pcls = (el.parentElement && el.parentElement.getAttribute) ? (el.parentElement.getAttribute('class') || '') : '';
                                  if (/\blanguage-\w+\b/i.test(cls) || /\bhljs\b/i.test(cls) || /\blanguage-\w+\b/i.test(pcls) || /\bhljs\b/i.test(pcls)) return;

                                  if (el.querySelector && el.querySelector('.katex')) return;
                                  if (el.getAttribute && el.getAttribute('data-katex-rendered') === 'true') return;
                                  var txt = (el.textContent || '').trim();
                                  if (!txt) return;
                                  if (txt.length > 800) return;
                                  if (txt.indexOf('$') !== -1 || txt.indexOf('\\(') !== -1 || txt.indexOf('\\[') !== -1) return;
                                  if (!looksLikeLatex(txt)) return;

                                  var display = (el.tagName && el.tagName.toLowerCase() === 'code' && el.parentElement && el.parentElement.tagName.toLowerCase() === 'pre') || el.tagName.toLowerCase() === 'pre';
                                  katexLib.render(txt, el, {
                                      displayMode: !!display,
                                      throwOnError: false,
                                      strict: 'ignore',
                                      trust: true,
                                      macros: {
                                          '\\R': '\\mathbb{R}',
                                          '\\N': '\\mathbb{N}',
                                          '\\Z': '\\mathbb{Z}',
                                          '\\C': '\\mathbb{C}',
                                          '\\F': '\\mathcal{F}',
                                          '\\Laplace': '\\mathcal{L}',
                                          '\\fourier': '\\mathfrak{F}',
                                          '\\Re': '\\operatorname{Re}',
                                          '\\Im': '\\operatorname{Im}'
                                      }
                                  });
                                  if (el.setAttribute) el.setAttribute('data-katex-rendered', 'true');
                              } catch (e) {
                              }
                          });
                      } catch (e) {
                      }
                  }

                  function unwrapKatexFromCodePre(){
                      try {
                          var mathBlocks = Array.prototype.slice.call(document.querySelectorAll('code, pre'));
                          mathBlocks.forEach(function(block) {
                              if (!block.querySelector || !block.querySelector('.katex')) return;
                              var parent = block.parentElement;
                              if (!parent) return;
                              while (block.firstChild) {
                                  parent.insertBefore(block.firstChild, block);
                              }
                              parent.removeChild(block);
                          });
                      } catch (e) {
                          // ignore
                      }
                  }

                  function manualRenderTextNodes() {
                      if (!(window && window.katex && window.katex.render)) return;
                      try {
                          var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                          var nodes = [];
                          while(walker.nextNode()) nodes.push(walker.currentNode);
                          
                          nodes.forEach(function(node) {
                              var txt = node.nodeValue;
                              if (!txt || (txt.indexOf('$') === -1 && txt.indexOf('\\') === -1)) return;
                              var parent = node.parentElement;
                              if (!parent) return;
                              var tagName = parent.tagName ? parent.tagName.toUpperCase() : '';
                              if (['SCRIPT','STYLE','TEXTAREA','NOSCRIPT'].indexOf(tagName) !== -1) return;
                              if (parent.classList && (parent.classList.contains('katex') || parent.closest('.katex'))) return;
                              
                              if (txt.indexOf('$$') !== -1) {
                                  var parts = txt.split('$$');
                                  if (parts.length >= 3) {
                                      var frag = document.createDocumentFragment();
                                      var modified = false;
                                      for (var i = 0; i < parts.length; i++) {
                                          if (i % 2 === 0) {
                                              if (parts[i]) frag.appendChild(document.createTextNode(parts[i]));
                                          } else {
                                              var span = document.createElement('span');
                                              var math = parts[i].replace(/\\\\/g, '\\');
                                              try {
                                                  window.katex.render(math, span, { displayMode: true, throwOnError: false, trust: true });
                                                  modified = true;
                                              } catch(e) {
                                                  span.textContent = '$$' + parts[i] + '$$';
                                              }
                                              frag.appendChild(span);
                                          }
                                      }
                                      if (modified) {
                                          parent.replaceChild(frag, node);
                                          return;
                                      }
                                  }
                              }

                              if (txt.indexOf('\\[') !== -1 && txt.indexOf('\\]') !== -1) {
                                   var p2 = txt.split(/\\\[|\\\]/);
                                   if (p2.length >= 3) {
                                      var frag2 = document.createDocumentFragment();
                                      var mod2 = false;
                                      for (var j = 0; j < p2.length; j++) {
                                          if (j % 2 === 0) {
                                              if (p2[j]) frag2.appendChild(document.createTextNode(p2[j]));
                                          } else {
                                              var span2 = document.createElement('span');
                                              var math2 = p2[j].replace(/\\\\/g, '\\');
                                              try {
                                                  window.katex.render(math2, span2, { displayMode: true, throwOnError: false, trust: true });
                                                  mod2 = true;
                                              } catch(e) {
                                                  span2.textContent = '\\[' + p2[j] + '\\]';
                                              }
                                              frag2.appendChild(span2);
                                          }
                                      }
                                      if (mod2) {
                                          parent.replaceChild(frag2, node);
                                          return;
                                      }
                                   }
                              }

                              if (txt.indexOf('\\(') !== -1 && txt.indexOf('\\)') !== -1) {
                                   var p3 = txt.split(/\\\(|\\\)/);
                                   if (p3.length >= 3) {
                                      var frag3 = document.createDocumentFragment();
                                      var mod3 = false;
                                      for (var k = 0; k < p3.length; k++) {
                                          if (k % 2 === 0) {
                                              if (p3[k]) frag3.appendChild(document.createTextNode(p3[k]));
                                          } else {
                                              var span3 = document.createElement('span');
                                              var math3 = p3[k].replace(/\\\\/g, '\\');
                                              try {
                                                  window.katex.render(math3, span3, { displayMode: false, throwOnError: false, trust: true });
                                                  mod3 = true;
                                              } catch(e) {
                                                  span3.textContent = '\\(' + p3[k] + '\\)';
                                              }
                                              frag3.appendChild(span3);
                                          }
                                      }
                                      if (mod3) {
                                          parent.replaceChild(frag3, node);
                                          return;
                                      }
                                   }
                              }
                          });
                      } catch(e) {}
                  }

                  function renderAllMath(){
                      if (rendering) return;
                      rendering = true;
                      try {
                          if (hasMathJax) {
                              try {
                                  if (window.MathJax && window.MathJax.typesetPromise) {
                                      window.MathJax.typesetPromise().then(function(){
                                          rendering = false;
                                      }).catch(function(e){
                                          rendering = false;
                                      });
                                  } else {
                                      rendering = false;
                                  }
                              } catch (e) {
                                  rendering = false;
                              }
                              return;
                          }
                          normalizeDoubleEscapedDelimiters(document.body);
                          renderWholeDelimitedElements();
                          var autoRender = getAutoRender();
                          if (typeof autoRender === 'function') {
                              autoRender(document.body, {
                                  delimiters: [
                                      {left: '$$', right: '$$', display: true},
                                      {left: '$', right: '$', display: false},
                                      {left: '\\(', right: '\\)', display: false},
                                      {left: '\\[', right: '\\]', display: true}
                                  ],
                                  throwOnError: false,
                                  errorColor: '#f87171',
                                  strict: 'ignore',
                                  trust: true,
                                  macros: {
                                      '\\R': '\\mathbb{R}',
                                      '\\N': '\\mathbb{N}',
                                      '\\Z': '\\mathbb{Z}',
                                      '\\C': '\\mathbb{C}',
                                      '\\F': '\\mathcal{F}',
                                      '\\Laplace': '\\mathcal{L}',
                                      '\\fourier': '\\mathfrak{F}',
                                      '\\Re': '\\operatorname{Re}',
                                      '\\Im': '\\operatorname{Im}'
                                  },
                                  ignoredTags: ['script', 'noscript', 'style', 'textarea', 'option']
                              });
                          }
                          renderWholeDelimitedElements();
                          renderCodeBlocks();
                          unwrapKatexFromCodePre();
                          manualRenderTextNodes();
                      } catch (e) {
                          try { console.error('KaTeX renderAllMath failed', e); } catch (_) {}
                      } finally {
                          rendering = false;
                      }
                  }

                  function scheduleRender(){
                      if (scheduled) return;
                      scheduled = setTimeout(function(){
                          scheduled = null;
                          renderAllMath();
                      }, 50);
                  }

                  var lastRenderAt = 0;

                  function startObserver(){
                      try {
                          var observer = new MutationObserver(function(mutations){
                              if (rendering) return;
                              if (Date.now() - lastRenderAt < 250) return;
                              for (var i = 0; i < mutations.length; i++) {
                                  if (mutations[i] && (mutations[i].addedNodes && mutations[i].addedNodes.length)) {
                                      var nodes = mutations[i].addedNodes;
                                      var needs = false;
                                      for (var j = 0; j < nodes.length; j++) {
                                          var node = nodes[j];
                                          if (!node) continue;
                                          if (node.nodeType === 1) {
                                              var el = node;
                                              if (el.classList && (el.classList.contains('katex') || el.classList.contains('katex-display'))) continue;
                                              if (el.closest && el.closest('.katex')) continue;
                                              needs = true;
                                              break;
                                          }
                                          if (node.nodeType === 3) {
                                              var t = (node.nodeValue || '');
                                              if (t.indexOf('\\') !== -1 || t.indexOf('$') !== -1) {
                                                  needs = true;
                                                  break;
                                              }
                                          }
                                      }
                                      if (!needs) continue;
                                      scheduleRender();
                                      break;
                                  }
                              }
                          });
                          observer.observe(document.body, { childList: true, subtree: true });
                      } catch (e) {
                      }
                  }

                  var _renderAllMath = renderAllMath;
                  renderAllMath = function(){
                      _renderAllMath();
                      lastRenderAt = Date.now();
                  };

                  function waitForMathReady(cb){
                      if (hasMathJax) {
                          var tries = 0;
                          function checkMJ(){
                              try {
                                  if (window.MathJax && window.MathJax.typesetPromise) return true;
                                  if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) return true;
                              } catch (e) {}
                              return false;
                          }
                          if (checkMJ()) {
                              try {
                                  if (window.MathJax.startup && window.MathJax.startup.promise) {
                                      window.MathJax.startup.promise.then(function(){ cb(); }).catch(function(){ cb(); });
                                      return;
                                  }
                              } catch (e) {}
                              cb();
                          } else {
                              var t = setInterval(function(){
                                  tries++;
                                  if (checkMJ() || tries > 100) {
                                      clearInterval(t);
                                      try {
                                          if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) {
                                              window.MathJax.startup.promise.then(function(){ cb(); }).catch(function(){ cb(); });
                                              return;
                                          }
                                      } catch (e) {}
                                      cb();
                                  }
                              }, 50);
                          }
                      } else {
                          var tries = 0;
                          ensureKatexScripts();
                          function ok(){
                              var k = (window && window.katex);
                              var ar = getAutoRender();
                              if (k && typeof k.render === 'function' && typeof ar === 'function') return true;
                              if (k && typeof k.render === 'function' && tries > 10) return true;
                              return false;
                          }
                          if (ok()) return cb();
                          var t = setInterval(function(){
                              tries++;
                              if (tries === 10) ensureKatexScripts();
                              if (ok() || tries > 40) {
                                  clearInterval(t);
                                  cb();
                              }
                          }, 50);
                      }
                  }

                  waitForMathReady(function(){
                      if (hasMathJax) {
                          try {
                              console.log('[SLIDE] MathJax detectado, usando MathJax para renderizado');
                          } catch (e) {}
                      } else {
                          try {
                              if (!(window && window.katex && typeof window.katex.render === 'function')) {
                                  console.warn('[SLIDE] KaTeX no disponible; no se pueden renderizar ecuaciones');
                              }
                              if (typeof getAutoRender() !== 'function') {
                                  console.warn('[SLIDE] KaTeX auto-render no disponible; se usarán fallbacks (pre/code/elementos completos)');
                              }
                          } catch (e) {}
                      }
                      renderAllMath();
                      startObserver();
                      try { setTimeout(renderAllMath, 200); } catch (e) {}
                  });
              }
              try {
                  if (document && document.readyState && document.readyState !== 'loading') start();
                  else document.addEventListener('DOMContentLoaded', start);
              } catch (e) {
                  try { start(); } catch (e2) {}
              }
              })();
          </script>
      </head>
      <body>
          ${bodyHtml}
      </body>
      </html>
  `;

  const blobUrl = useMemo(() => {
    const blob = new Blob([fullHtml], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [fullHtml]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  return (
    <iframe
      ref={ref}
      src={blobUrl}
      title={title}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      allow="fullscreen; autoplay; clipboard-read; clipboard-write; xr-spatial-tracking"
    />
  );
});
SlideIframe.displayName = "SlideIframe";

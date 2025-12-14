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
}

export const SlideIframe = forwardRef<HTMLIFrameElement, SlideIframeProps>(({ content, title }, ref) => {
  const trustSlides = process.env.NEXT_PUBLIC_TRUST_SLIDES !== 'false';
  const { headHtml, bodyHtml } = useMemo(() => {
    let html = trustSlides ? content : sanitizeHtml(content);
    html = html.replace(/<script\b[^>]*id=["']MathJax-script["'][^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<script\b[^>]*src=["'][^"']*mathjax[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
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
  const fullHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; style-src 'unsafe-inline' https: http: data:; img-src https: http: data: blob:; media-src https: http: data: blob:; font-src https: http: data:; connect-src https: http: ws: wss: data:; worker-src blob: https: http: data:; child-src https: http: data: blob:; frame-src https: http: data: blob:; object-src 'none'; base-uri 'self'">
          <base href="${baseHref}">
          <link rel="stylesheet" href="/slide-iframe.css">
          <link rel="stylesheet" href="/katex/katex.min.css">
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
          <script>
              document.addEventListener("DOMContentLoaded", function() {
                  function tryTypesetMathJax(){
                      try {
                          var mj = window && window.MathJax;
                          if (mj && mj.startup && mj.startup.promise && typeof mj.typesetPromise === 'function') {
                              mj.typesetPromise();
                              return true;
                          }
                          if (mj && mj.Hub && typeof mj.Hub.Queue === 'function') {
                              mj.Hub.Queue(['Typeset', mj.Hub]);
                              return true;
                          }
                      } catch (_) {}
                      return false;
                  }

                  // Wait for MathJax to actually load (async script). Avoid KaTeX/MathJax double-render.
                  var attempts = 0;
                  var maxAttempts = 40; // ~10s at 250ms
                  var timer = setInterval(function(){
                      attempts++;
                      if (tryTypesetMathJax()) {
                          clearInterval(timer);
                          return;
                      }
                      if (attempts >= maxAttempts) {
                          clearInterval(timer);
                          // Fallback: KaTeX autorender ONLY if MathJax never became available.
                          try {
                              var autoRender = (typeof renderMathInElement === 'function') ? renderMathInElement : (window && window['renderMathInElement']);
                              if (typeof autoRender === 'function') {
                                  autoRender(document.body, {
                                      delimiters: [
                                          {left: '$$', right: '$$', display: true},
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
                          } catch (e) {
                              try { console.error('KaTeX auto-render invocation failed', e); } catch (_) {}
                          }
                      }
                  }, 250);
              });
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

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
  forceFit?: boolean;
  thumbnail?: boolean;
}

export const SlideIframe = forwardRef<HTMLIFrameElement, SlideIframeProps>(({ content, title, presentationMode = false, forceFit = false, thumbnail = false }, ref) => {
  const trustSlides = process.env.NEXT_PUBLIC_TRUST_SLIDES !== 'false';
  const enableMathJax = process.env.NEXT_PUBLIC_ENABLE_MATHJAX === 'true';
  const { headHtml, bodyHtml } = useMemo(() => {
    let html = trustSlides ? content : sanitizeHtml(content);
    html = html.replace(/<script\b[^>]*src=["'][^"']*polyfill\.io[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<!doctype[^>]*>/gi, '');
    if (!enableMathJax) {
      html = html.replace(/<script\b[^>]*src=["'][^"']*(mathjax|tex-mml-chtml)\.[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
      html = html.replace(/<script\b[^>]*>\s*(?:window\.)?MathJax\s*=\s*[\s\S]*?<\/script>/gi, '');
    }
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
  }, [content, trustSlides, enableMathJax]);

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
              background-color: #111827;
              color: #E5E7EB;
            }

            #__slide_viewport {
              width: 100%;
              height: 100%;
              overflow: hidden;
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 16px;
            }

            #__slide_frame {
              display: inline-block;
              overflow: hidden;
            }

            #__slide_scale {
              display: inline-block;
              transform-origin: top center;
            }
          </style>
      `
    : `
          <link rel="stylesheet" href="/slide-iframe.css">
          <style>
            *, *::before, *::after {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background-color: #111827; 
              color: #E5E7EB;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
            }

            #__slide_viewport {
              width: 100%;
              height: 100%;
              overflow: auto;
              padding: 1.5rem;
              display: flex;
              justify-content: center;
              align-items: flex-start;
            }

            #__slide_frame {
              display: inline-block;
              overflow: hidden;
            }

            #__slide_scale {
              display: inline-block;
              transform-origin: top center;
            }

            * {
              max-width: 100%;
            }

            html[data-thumbnail="true"] #__slide_viewport {
              overflow: hidden !important;
              padding: 0px !important;
              align-items: center !important;
              justify-content: center !important;
            }

            html[data-thumbnail="true"] #__slide_content,
            html[data-thumbnail="true"] #__slide_content * {
              max-width: none !important;
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
      <html lang="es" data-force-fit="${forceFit ? 'true' : 'false'}" data-enable-mathjax="${enableMathJax ? 'true' : 'false'}" data-presentation-mode="${presentationMode ? 'true' : 'false'}" data-thumbnail="${thumbnail ? 'true' : 'false'}">
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
          ${enableMathJax ? String.raw`
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
              },
            };
          </script>
          <script async id="MathJax-script" src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
          ` : ''}
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
              try {
                if (!window.fetch) return;
                var _fetch = window.fetch;
                window.fetch = function(input, init){
                  try {
                    var url = '';
                    if (typeof input === 'string') url = input;
                    else if (input && typeof input.url === 'string') url = input.url;
                    if (url && url.indexOf('https://generativelanguage.googleapis.com/') === 0 && url.indexOf('imagen-') !== -1) {
                      try {
                        var u = new URL(url);
                        var k = u.searchParams.get('key');
                        if (!k) {
                          var png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2j9JkAAAAASUVORK5CYII=';
                          var body = JSON.stringify({
                            predictions: [{ bytesBase64Encoded: png }],
                            candidates: [{ content: { parts: [{ inlineData: { data: png } }] } }],
                          });
                          return Promise.resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }));
                        }
                      } catch (e) {
                        if (/key=(&|$)/.test(url)) {
                          var png2 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2j9JkAAAAASUVORK5CYII=';
                          var body2 = JSON.stringify({
                            predictions: [{ bytesBase64Encoded: png2 }],
                            candidates: [{ content: { parts: [{ inlineData: { data: png2 } }] } }],
                          });
                          return Promise.resolve(new Response(body2, { status: 200, headers: { 'Content-Type': 'application/json' } }));
                        }
                      }
                    }
                  } catch (e) {}
                  return _fetch(input, init);
                };
              } catch (e) {}
            })();
          </script>
          <script>
            (function(){
              function send(l,a){
                try {
                  var msg0 = '';
                  try {
                    msg0 = (a && a.length) ? (typeof a[0] === 'string' ? a[0] : (a[0] && a[0].message ? a[0].message : String(a[0]))) : '';
                  } catch (e) {
                    msg0 = '';
                  }
                  if (msg0 && (msg0.indexOf('ResizeObserver loop completed with undelivered notifications') !== -1 || msg0.indexOf('ResizeObserver loop limit exceeded') !== -1)) {
                    return;
                  }
                  if (l === 'error' && a && a.length) {
                    var first = a[0];
                    var msg = '';
                    if (typeof first === 'string') msg = first;
                    else if (first && typeof first.message === 'string') msg = first.message;
                    else msg = String(first);
                    if (msg && msg.indexOf('Error generando imágenes') !== -1) return;
                  }
                } catch (e) {}
                try{parent.postMessage({__slideLog:true,level:l,args:Array.prototype.slice.call(a).map(function(x){try{return x.stack||x.message||String(x)}catch(e){return String(x)}})},"*");}catch(e){}
              }
              var levels=['log','warn','error'];
              for(var i=0;i<levels.length;i++){(function(n){var o=console[n];console[n]=function(){send(n,arguments);if(o) o.apply(console,arguments);};})(levels[i]);}
              window.addEventListener('error',function(e){
                var msg = e.message || '';
                if (msg && (msg.indexOf('ResizeObserver loop completed with undelivered notifications') !== -1 || msg.indexOf('ResizeObserver loop limit exceeded') !== -1)) {
                  return;
                }
                if (msg === 'Script error.' && (!e.filename || e.filename === '') && (e.lineno === 0 || e.lineno === undefined) && (e.colno === 0 || e.colno === undefined)) {
                  return;
                }
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
              function wrap(fn){
                try {
                  if (typeof fn !== 'function') return fn;
                  if (fn && fn.__slidePatched) return fn;
                  var w = function(){
                    try {
                      // @ts-ignore
                      return fn.apply(this, arguments);
                    } catch (e) {
                      try { console.warn('[SLIDE] generateNewImages falló (capturado)'); } catch (e2) {}
                      return null;
                    }
                  };
                  try { w.__slidePatched = true; } catch (e) {}
                  return w;
                } catch (e) {
                  return fn;
                }
              }

              function patchNow(){
                try {
                  if (typeof window.generateNewImages === 'function') {
                    window.generateNewImages = wrap(window.generateNewImages);
                  }
                } catch (e) {}
              }

              try {
                if (typeof window.generateNewImages === 'function') {
                  patchNow();
                } else {
                  var val;
                  try {
                    val = window.generateNewImages;
                  } catch (e) {}
                  try {
                    Object.defineProperty(window, 'generateNewImages', {
                      configurable: true,
                      get: function(){ return val; },
                      set: function(v){ val = wrap(v); }
                    });
                  } catch (e) {}
                  try { setTimeout(patchNow, 0); } catch (e) {}
                  try { window.addEventListener('load', patchNow); } catch (e) {}
                }
              } catch (e) {}
            })();
          </script>
          <script>
            (function(){
              try {
                // @ts-ignore
                var proto = (window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype) ? window.CanvasRenderingContext2D.prototype : null;
                if (!proto) return;
                if (proto.__slideCreateImageDataPatched) return;
                var orig = proto.createImageData;
                if (typeof orig !== 'function') return;

                proto.createImageData = function(a, b){
                  try {
                    var w = a;
                    var h = b;
                    if (a && typeof a === 'object' && typeof a.width !== 'undefined' && typeof a.height !== 'undefined') {
                      w = a.width;
                      h = a.height;
                    }
                    w = Number(w);
                    h = Number(h);
                    if (!isFinite(w) || w <= 0) w = 1;
                    if (!isFinite(h) || h <= 0) h = 1;
                    return orig.call(this, w, h);
                  } catch (e) {
                    try {
                      // @ts-ignore
                      return new ImageData(1, 1);
                    } catch (e2) {
                      try {
                        return orig.call(this, 1, 1);
                      } catch (e3) {
                        return null;
                      }
                    }
                  }
                };
                proto.__slideCreateImageDataPatched = true;
              } catch (e) {}
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
              var forceFit = false;
              var isThumbnail = false;
              try { forceFit = (document && document.documentElement && document.documentElement.getAttribute('data-force-fit') === 'true'); } catch (e) {}
              try { isThumbnail = (document && document.documentElement && document.documentElement.getAttribute('data-thumbnail') === 'true'); } catch (e) {}

              function dims(el){
                try {
                  var r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
                  var w = Math.max(el && el.scrollWidth ? el.scrollWidth : 0, el && el.offsetWidth ? el.offsetWidth : 0, r ? r.width : 0);
                  var h = Math.max(el && el.scrollHeight ? el.scrollHeight : 0, el && el.offsetHeight ? el.offsetHeight : 0, r ? r.height : 0);
                  return { w: w, h: h };
                } catch (e) {
                  return { w: 0, h: 0 };
                }
              }

              function fit(){
                try {
                  var viewport = document.getElementById('__slide_viewport');
                  var frameEl = document.getElementById('__slide_frame');
                  var scaleEl = document.getElementById('__slide_scale');
                  var contentEl = document.getElementById('__slide_content');
                  if (!viewport || !frameEl || !scaleEl || !contentEl) return;

                  var isPresentation = false;
                  try {
                    isPresentation = (document && document.documentElement && document.documentElement.getAttribute('data-presentation-mode') === 'true');
                  } catch (e) {}

                  try {
                    if (!viewport.getAttribute('data-base-overflow')) {
                      try {
                        var cov = window.getComputedStyle(viewport).overflow;
                        viewport.setAttribute('data-base-overflow', cov || '');
                      } catch (e) {
                        viewport.setAttribute('data-base-overflow', viewport.style.overflow || '');
                      }
                    }
                  } catch (e) {}

                  try {
                    if (!viewport.getAttribute('data-base-padding')) {
                      try {
                        var cps = window.getComputedStyle(viewport);
                        var p = (cps.paddingTop || '0') + ' ' + (cps.paddingRight || '0') + ' ' + (cps.paddingBottom || '0') + ' ' + (cps.paddingLeft || '0');
                        viewport.setAttribute('data-base-padding', p);
                      } catch (e) {
                        viewport.setAttribute('data-base-padding', viewport.style.padding || '');
                      }
                    }
                  } catch (e) {}

                  scaleEl.style.transform = '';
                  scaleEl.style.width = '';
                  scaleEl.style.height = '';

                  try { contentEl.style.width = ''; } catch (e) {}
                  try { contentEl.style.height = ''; } catch (e) {}
                  try { contentEl.style.overflow = ''; } catch (e) {}

                  frameEl.style.width = '';
                  frameEl.style.height = '';
                  frameEl.style.overflow = '';

                  try {
                    var baseOv = viewport.getAttribute('data-base-overflow');
                    viewport.style.overflow = (baseOv === null) ? '' : baseOv;
                  } catch (e) {}

                  try {
                    var basePad = viewport.getAttribute('data-base-padding');
                    viewport.style.padding = (basePad === null) ? '' : basePad;
                  } catch (e) {}

                  if (isThumbnail) {
                    try { viewport.style.overflow = 'hidden'; } catch (e) {}
                    try { viewport.style.padding = '0px'; } catch (e) {}
                    try { viewport.style.alignItems = 'center'; } catch (e) {}
                    try { viewport.style.justifyContent = 'center'; } catch (e) {}
                  }

                  var vw = viewport.clientWidth || 0;
                  var vh = viewport.clientHeight || 0;
                  if (vw <= 0 || vh <= 0) return;

                  var padX = 0;
                  var padY = 0;
                  try {
                    var cs = window.getComputedStyle(viewport);
                    padX = (parseFloat(cs.paddingLeft || '0') || 0) + (parseFloat(cs.paddingRight || '0') || 0);
                    padY = (parseFloat(cs.paddingTop || '0') || 0) + (parseFloat(cs.paddingBottom || '0') || 0);
                  } catch (e) {}

                  var aw = Math.max(0, vw - padX);
                  var ah = Math.max(0, vh - padY);
                  if (aw <= 0 || ah <= 0) return;

                  if (isThumbnail) {
                    var baseW = 1280;
                    var baseH = 720;
                    try {
                      var canvases = [];
                      try {
                        canvases = contentEl.querySelectorAll ? Array.prototype.slice.call(contentEl.querySelectorAll('canvas')) : [];
                      } catch (e) {
                        canvases = [];
                      }

                      var bestW = 0;
                      var bestH = 0;
                      for (var ci = 0; ci < canvases.length; ci++) {
                        var cv = canvases[ci];
                        if (!cv) continue;

                        var cwCss = 0;
                        var chCss = 0;
                        try {
                          var cr = cv.getBoundingClientRect ? cv.getBoundingClientRect() : null;
                          cwCss = Math.max(cwCss, cr ? cr.width : 0);
                          chCss = Math.max(chCss, cr ? cr.height : 0);
                        } catch (e) {}
                        try {
                          if (cv.offsetWidth && cv.offsetHeight) {
                            cwCss = Math.max(cwCss, cv.offsetWidth);
                            chCss = Math.max(chCss, cv.offsetHeight);
                          }
                        } catch (e) {}

                        var cw = 0;
                        var ch = 0;
                        if (cwCss && chCss && isFinite(cwCss) && isFinite(chCss)) {
                          cw = cwCss;
                          ch = chCss;
                        } else {
                          try {
                            if (cv.width && cv.height) {
                              cw = cv.width;
                              ch = cv.height;
                            }
                          } catch (e) {}
                        }

                        if (cw && ch && isFinite(cw) && isFinite(ch) && cw > 50 && ch > 50) {
                          if ((cw * ch) > (bestW * bestH)) {
                            bestW = cw;
                            bestH = ch;
                          }
                        }
                      }

                      if (bestW && bestH) {
                        baseW = Math.round(bestW);
                        baseH = Math.round(bestH);
                      }
                    } catch (e) {}
                    var s0 = Math.min(1, aw / baseW, ah / baseH);
                    if (!isFinite(s0) || s0 <= 0) return;

                    try { contentEl.style.width = baseW + 'px'; } catch (e) {}
                    try { contentEl.style.height = baseH + 'px'; } catch (e) {}
                    try { contentEl.style.overflow = 'hidden'; } catch (e) {}

                    scaleEl.style.width = baseW + 'px';
                    scaleEl.style.height = baseH + 'px';
                    scaleEl.style.transformOrigin = 'top left';
                    scaleEl.style.transform = 'scale(' + s0 + ')';

                    frameEl.style.width = Math.max(1, Math.round(baseW * s0)) + 'px';
                    frameEl.style.height = Math.max(1, Math.round(baseH * s0)) + 'px';
                    frameEl.style.overflow = 'hidden';

                    try { viewport.style.alignItems = 'center'; } catch (e) {}
                    try { viewport.style.justifyContent = 'center'; } catch (e) {}
                    return;
                  }

                  var kids = Array.prototype.slice.call(contentEl.children || []).filter(function(n){
                    try {
                      var tag = (n && n.tagName) ? String(n.tagName).toUpperCase() : '';
                      return tag && tag !== 'SCRIPT' && tag !== 'STYLE';
                    } catch (e) {
                      return false;
                    }
                  });
                  var target = (kids.length === 1) ? kids[0] : contentEl;

                  var d = dims(target);
                  var w = d.w, h = d.h;
                  if (!w || !h) {
                    var d2 = dims(contentEl);
                    w = w || d2.w;
                    h = h || d2.h;
                  }
                  if ((!w || !h) && forceFit) {
                    try {
                      var de0 = document && document.documentElement;
                      var b0 = document && document.body;
                      if (de0) {
                        w = Math.max(w || 0, de0.scrollWidth || 0, de0.offsetWidth || 0);
                        h = Math.max(h || 0, de0.scrollHeight || 0, de0.offsetHeight || 0);
                      }
                      if (b0) {
                        w = Math.max(w || 0, b0.scrollWidth || 0, b0.offsetWidth || 0);
                        h = Math.max(h || 0, b0.scrollHeight || 0, b0.offsetHeight || 0);
                      }
                    } catch (e) {}
                  }
                  if (!w || !h) return;

                  if (forceFit) {
                    try {
                      var de = document && document.documentElement;
                      var b = document && document.body;
                      if (de) {
                        w = Math.max(w, de.scrollWidth || 0, de.offsetWidth || 0);
                        h = Math.max(h, de.scrollHeight || 0, de.offsetHeight || 0);
                      }
                      if (b) {
                        w = Math.max(w, b.scrollWidth || 0, b.offsetWidth || 0);
                        h = Math.max(h, b.scrollHeight || 0, b.offsetHeight || 0);
                      }
                    } catch (e) {}
                    if (!w || !h) return;
                  }

                  var heightOverflow = h > ah * 1.02;
                  var widthOverflow = w > aw * 1.02;
                  if (!isThumbnail && !isPresentation) {
                    if (!heightOverflow && !widthOverflow) {
                      try { viewport.style.alignItems = 'center'; } catch (e) {}
                      return;
                    }
                    if (heightOverflow && !widthOverflow) {
                      try { viewport.style.alignItems = 'flex-start'; } catch (e) {}
                      return;
                    }
                  }

                  if (!isThumbnail && !forceFit && !heightOverflow && !widthOverflow) return;

                  var isMedia = false;
                  try {
                    var t = (target && target.tagName) ? String(target.tagName).toUpperCase() : '';
                    isMedia = t === 'IMG' || t === 'SVG' || t === 'CANVAS' || t === 'VIDEO';
                  } catch (e) {}

                  var textLen = 0;
                  try { textLen = String(contentEl.textContent || '').trim().length; } catch (e) {}
                  var likelyDocument = textLen > 6000;
                  var singleRoot = kids.length === 1;

                  var looksLikeSlide = (widthOverflow && heightOverflow) || (isMedia && (heightOverflow || widthOverflow));
                  if (!looksLikeSlide && singleRoot && heightOverflow && !likelyDocument) looksLikeSlide = true;
                  if (!looksLikeSlide && singleRoot && widthOverflow && !likelyDocument) looksLikeSlide = true;
                  if (!looksLikeSlide) {
                    try {
                      var st = target && target.getAttribute ? target.getAttribute('style') : '';
                      if (st && /height\s*:\s*\d+px/i.test(st) && heightOverflow && !likelyDocument) looksLikeSlide = true;
                    } catch (e) {}
                  }
                  if (!isThumbnail && !forceFit && !looksLikeSlide) return;

                  var s = isPresentation ? Math.min(1, aw / w, ah / h) : (isThumbnail ? Math.min(1, aw / w, ah / h) : Math.min(1, aw / w));
                  if (!isFinite(s) || s <= 0 || s >= 0.999) return;
                  if (isPresentation && forceFit && s < 0.2) {
                    try { viewport.style.overflow = 'auto'; } catch (e) {}
                    try { viewport.style.padding = '1.5rem'; } catch (e) {}
                    return;
                  }
                  if (!forceFit && s < 0.2) s = 0.2;

                  var sw = Math.max(1, Math.round(w * s));
                  var sh = Math.max(1, Math.round(h * s));
                  frameEl.style.width = sw + 'px';
                  frameEl.style.height = sh + 'px';
                  frameEl.style.overflow = 'hidden';

                  try {
                    viewport.style.alignItems = (sh <= ah * 0.98) ? 'center' : 'flex-start';
                  } catch (e) {}

                  scaleEl.style.width = w + 'px';
                  scaleEl.style.height = h + 'px';
                  scaleEl.style.transformOrigin = 'top center';
                  scaleEl.style.transform = 'scale(' + s + ')';

                  if (forceFit) {
                    if (isPresentation) {
                      try { viewport.style.overflow = 'hidden'; } catch (e) {}
                    } else if (isThumbnail) {
                      try { viewport.style.overflow = 'hidden'; } catch (e) {}
                    } else {
                      try { viewport.style.overflow = 'auto'; } catch (e) {}
                    }
                    try { viewport.style.padding = '0px'; } catch (e) {}
                  }
                } catch (e) {}
              }

              var timer = null;
              function schedule(){
                try { if (timer) clearTimeout(timer); } catch (e) {}
                timer = setTimeout(function(){ timer = null; fit(); }, 60);
              }

              try {
                if (document && document.readyState && document.readyState !== 'loading') schedule();
                else document.addEventListener('DOMContentLoaded', schedule);
              } catch (e) {}
              try { window.addEventListener('load', schedule); } catch (e) {}
              try { window.addEventListener('resize', schedule); } catch (e) {}
              try {
                if (forceFit) {
                  setTimeout(schedule, 200);
                  setTimeout(schedule, 800);
                  setTimeout(schedule, 2000);
                }
              } catch (e) {}
              try {
                if (isThumbnail) {
                  setTimeout(schedule, 50);
                  setTimeout(schedule, 200);
                  setTimeout(schedule, 600);
                }
              } catch (e) {}
              try {
                var lastObs = 0;
                var mo = new MutationObserver(function(){
                  var now = Date.now();
                  if (now - lastObs < (forceFit ? 200 : 80)) return;
                  lastObs = now;
                  schedule();
                });
                var root = null;
                try { root = document.getElementById('__slide_content') || document.body || document.documentElement; } catch (e) {}
                if (root) mo.observe(root, { childList: true, subtree: true });
              } catch (e) {}
              try {
                if (typeof ResizeObserver === 'function') {
                  var ro = new ResizeObserver(function(){ schedule(); });
                  try {
                    var vp = document.getElementById('__slide_viewport');
                    if (vp) ro.observe(vp);
                  } catch (e) {}
                  try {
                    if (document && document.documentElement) ro.observe(document.documentElement);
                  } catch (e) {}
                }
              } catch (e) {}
              try { window.__fitSlideToViewport = schedule; } catch (e) {}
            })();
          </script>
          <script>
              (function(){
              function start() {
                  var rendering = false;
                  var scheduled = null;
                  var hasMathJax = false;
                  var allowMathJax = false;

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

                  try {
                      allowMathJax = (document && document.documentElement && document.documentElement.getAttribute('data-enable-mathjax') === 'true');
                  } catch (e) {}

                  hasMathJax = allowMathJax && detectMathJax();

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
          <div id="__slide_viewport">
            <div id="__slide_frame">
              <div id="__slide_scale">
                <div id="__slide_content">${bodyHtml}</div>
              </div>
            </div>
          </div>
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

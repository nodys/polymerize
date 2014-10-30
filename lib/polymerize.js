var whacko  = require('whacko')
var read    = require('fs').readFileSync;
var resolve = require('resolve').sync
var dirname = require('path').dirname


module.exports = polymerize;


function polymerize(src, filepath, options) {
  var $       = whacko.load(src);
  var result  = [];
  // Parse imports
  $('head > link[rel=import][href]').each(function() {
    var el = $(this);
    var relpath = el.attr('href');
    relpath = /^(\/|\.)/.test(relpath) ? relpath : './' + relpath;
    result.push('require("'+relpath+'");');
    el.remove();
  })

  // Parse document level external stylesheet
  $('head > link[rel=stylesheet][href]').each(function() {
    var el = $(this);
    var relpath = el.attr('href');
    relpath = /^(\/|\.)/.test(relpath) ? relpath : './' + relpath;
    result.push('require("'+relpath+'").insert();');
    el.remove();
  })

  // Parse document level external stylesheet
  $('head > style').each(function() {
    var el = $(this);
    var src = [];
    src.push('var head = document.getElementsByTagName("head")[0];')
    src.push('var style = head.appendChild(document.createElement("style"));')
    src.push('style.setAttribute("type", "text/css");')
    src.push('var src = '+JSON.stringify(el.text()) + ';')
    src.push('if(style.styleSheet) { style.styleSheet.cssText = src } else {style.textContent=src}')
    result.push('document.addEventListener("DOMContentLoaded",function() {'+src.join('\n')+'});')
    el.remove();
  })

  // Parse document level external scripts
  $('script[src]').each(function() {
    var el = $(this);
    var relpath = el.attr('src');
    relpath = /^(\/|\.)/.test(relpath) ? relpath : './' + relpath;
    result.push('require("'+relpath+'")');
    el.remove();
  })

  // Extract polymer elements
  $('body > polymer-element:not([assetpath])').each(function() {
    var el = $(this);
    var stylesheets   = [];
    var inlineScripts = [];
    var src           = [];
    var elName        = el.attr('name')

    // Extract external stylesheets
    el.find('template > link[rel=stylesheet][href]').each(function() {
      var el = $(this);
      var relpath = el.attr('href');
      stylesheets.push(/^(\/|\.)/.test(relpath) ? relpath : './' + relpath);
      el.remove();
    })

    // Extract external and inline script
    el.find('script:not([src])').each(function() {
      var el = $(this);
      inlineScripts.push(el.text())
      el.remove();
    })

    $(el).find('*').contents().filter(function(i, node) {
      if (node.type === 'comment'){
        return true;
      } else if (node.type === 'text') {
        // return true if the node is only whitespace
        return !((/\S/).test(node.data));
      }
    }).remove();

    // Include polymer element
    src.push('var el = document.body.appendChild(document.createElement("div"));');
    src.push('el.setAttribute("hidden","");');
    src.push('el.innerHTML=' + JSON.stringify($.html(el).trim()));

    if(stylesheets.length) {
      src.push('var template = el.querySelector("template");');
      stylesheets.forEach(function(path) {
        src.push('require("'+path+'").insert(template.content);')
      })
    }

    inlineScripts.forEach(function(inlineSrc) {
      var match = /Polymer\(([^,{]+)?(,\s*)?({|\))/.exec(inlineSrc);
      if (match) {
        // Base on https://github.com/Polymer/vulcanize/blob/master/lib%2Futils.js
        var name     = match[1] || '';
        var split    = match[2] || '';
        var trailing = match[3];
        var nameIsString = /^['"]/.test(name);
        if (!split) {
          if (!name || (name && !nameIsString)) {
            trailing = name + trailing;
            name = '\'' + elName + '\'';
          }
          if (trailing !== ')') {
            split = ',';
          }
        }
        inlineSrc = inlineSrc.replace(match[0], 'Polymer(' + name + split + trailing);
      }
      src.push(';(function() {'+inlineSrc+'}());')
    })

    result.push('document.addEventListener("DOMContentLoaded",function() {'+src.join('\n')+'});')
  });

  // Extract core-icon-sets elements
  $('core-iconset-svg').each(function() {
    var el  = $(this);
    var src = [];
    src.push('var el = document.body.appendChild(document.createElement("div"));');
    src.push('el.setAttribute("hidden","");');
    src.push('el.innerHTML=' + JSON.stringify($.html(el).trim()));
    result.push('document.addEventListener("DOMContentLoaded",function() {'+src.join('\n')+'});')
  });


  return result.join('\n')
}
//
function resolveFrom(rpath, from) {
  var basedir = dirname(from)
  rpath = /^\./.test(rpath) ? rpath : './' + rpath;
  return resolve(rpath, {
    basedir    : basedir,
    extensions : [extname(rpath)],
  })
}

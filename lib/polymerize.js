var whacko   = require('whacko')
var read     = require('fs').readFileSync;
var extend   = require('extend')
var cleancss = require('clean-css')
var resolve  = require('resolve')
var dirname  = require('path').dirname
var extname  = require('path').extname

// Export
module.exports = polymerize;

// Constants
var ABS = /^(http[s]?:|\/)/

/**
 * Polymer vulcanization for browserify
 *
 * @param  {String} src
 *         Web component html source
 *
 * @param  {String} filepath
 *         Source filepath
 *
 * @return {String}
 *         CommonJS source with external import module and stylesheet
 *         as `require()` calls
 */
function polymerize(src, filepath) {

  // Parse web-component source
  var $       = whacko.load(src);

  // External modules to require (only relative source that browserify can handle)
  var requires = {
    imp        : [], // Another html document
    scripts    : [], // *script source
  }

  // External ressource with absolute paths to re-inject
  var injects = [];

  // Inline sources
  var inlineSrc = [];

  // Extract imports
  $('link[rel=import][href]').each(function() {
    var el   = $(this);
    var href = el.attr('href');
    if(ABS.test(href)) {
      injects.push($.html(el));
    } else {
      requires.imp.push(/^\./.test(href) ? href : './' + href);
    }
    el.remove();
  })

  // Extract external scripts
  $('script[src]').each(function() {
    var el  = $(this);
    var src = el.attr('src');
    if(ABS.test(src)) {
      injects.push($.html(el));
    } else {
      requires.scripts.push(/^\./.test(src) ? src : './' + src);
    }
    el.remove();
  })

  // Extract inline scripts
  $('script:not([src])').each(function() {
    var el  = $(this);
    var src = el.text();
    var closestPolymerElement = el.closest('polymer-element');
    if(closestPolymerElement) {
      src = fixPolymerInvocation(src, $(closestPolymerElement).attr('name'))
    }
    inlineSrc.push(src);
    el.remove();
  })

  // Inline stylesheets
  $('link[rel=stylesheet][href]').each(function() {
    var el      = $(this);
    var href    = el.attr('href');
    if(ABS.test(src)) {
      injects.push($.html(el));
      el.remove();
    } else {
      var relpath = /^\./.test(href) ? href : './' + href;
      // Should throw is source not found
      var srcpath = resolve.sync(relpath, {
        basedir    : dirname(filepath),
        extensions : extname(relpath)
      })
      var content = read(srcpath);
      var style = whacko('<style>' + content + '</style>');
      style.attr(el.attr());
      style.attr('href', null);
      style.attr('rel', null);
      el.replaceWith(whacko.html(style));
    }
  })

  // Generate module source:
  removeCommentsAndWhitespace($)
  var src = [];

  // Require imported web-components
  requires.imp.forEach(function(imp) {
    src.push('require("'+imp+'");')
  })

  // Once DOMContentLoaded
  src.push('document.addEventListener("DOMContentLoaded",function() {');

  // Inject html source
  src.push('var body = document.getElementsByTagName("body")[0];')
  src.push('var head = document.getElementsByTagName("head")[0];')

  src.push('head.insertAdjacentHTML("beforeend",'+JSON.stringify($("head").html())+');')

  // Re-inject to document head tags with absolute path
  if(injects.length) {
    src.push('head.insertAdjacentHTML("beforeend",'+JSON.stringify(injects.join(''))+');')
  }

  src.push('var root = body.appendChild(document.createElement("div"));')
  src.push('root.setAttribute("hidden","");')
  src.push('root.innerHTML=' + JSON.stringify($("body").html())+ ';')


  // Require scripts
  requires.scripts.forEach(function(script) {
    src.push('require("'+script+'");')
  })

  // Append inline sources
  inlineSrc.forEach(function(inline) {
    src.push(';(function() {\n'+inline+'\n})();')
  })

  // End DOMContentLoaded
  src.push('\n})')

  return src.join('\n')
}

/**
 * Fix polymer invocation to always use the Polymer('elementName', {...}) form
 *
 * Based on https://github.com/Polymer/vulcanize/blob/master/lib%2Futils.js
 *
 * @param {String} src
 *        Inline source to fix
 *
 * @param {String} elementName
 *        Polymer element name
 *
 * @return {String}
 */
function fixPolymerInvocation (src, elementName) {
  var match    = /Polymer\(([^,{]+)?(,\s*)?({|\))/.exec(src);
  var name     = match[1] || '';
  var split    = match[2] || '';
  var trailing = match[3];

  var nameIsString = /^['"]/.test(name);
  if (!split) {
    // assume "name" is actually the prototype if it is not a string literal
    if (!name || (name && !nameIsString)) {
      trailing = name + trailing;
      name = '\'' + elementName + '\'';
    }
    if (trailing !== ')') {
      split = ',';
    }
  }
  return src.replace(match[0], 'Polymer(' + name + split + trailing);
}


// Based on https://github.com/Polymer/vulcanize/blob/master/lib%2Fvulcan.js
function removeCommentsAndWhitespace($) {
  $('style:not([type]), style[type="text/css"]').each(function() {
    var el      = $(this);
    var content = getTextContent(el);
    setTextContent(el, new cleancss({noAdvanced: true}).minify(content));
  });
  $('*').contents().filter(function(_, node) {
    if (node.type === 'comment'){
      return true;
    } else if (node.type === 'text') {
      // return true if the node is only whitespace
      return !((/\S/).test(node.data));
    }
  }).remove();
}


// From on https://github.com/Polymer/vulcanize/blob/master/lib%2Fvulcan.js
function setTextContent(node, text) {
  var unwrapped = node.get(0);
  var child = unwrapped.children[0];
  if (child) {
    child.data = text;
  } else {
    unwrapped.children[0] = {
      data: text,
      type: 'text',
      next: null,
      prev: null,
      parent: unwrapped
    };
  }
}

// From on https://github.com/Polymer/vulcanize/blob/master/lib%2Fvulcan.js
function getTextContent(node) {
  var unwrapped = node.get(0);
  var child = unwrapped.children[0];
  return child ? child.data : '';
}

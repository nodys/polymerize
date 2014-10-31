var whacko   = require('whacko')
var read     = require('fs').readFileSync;
var cleancss = require('clean-css')
var resolve  = require('resolve')
var dirname  = require('path').dirname
var extname  = require('path').extname

// Constants
var ABS = /^(http[s]?:|\/)/

// Export
module.exports                  = polymerize;
polymerize.parseSource          = parseSource;
polymerize.extractImports       = extractImports;
polymerize.extractScripts       = extractScripts;
polymerize.inlineStylesheet     = inlineStylesheet;
polymerize.fixPolymerInvocation = fixPolymerInvocation;
polymerize.minifyHtml           = minifyHtml;


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

  // Parse web-component source (extract dependency, optimize source, etc.)
  var result = parseSource(src, filepath);

  // Generate commonjs module source:
  var src = [];

  // Require imported web-components
  result.imports.forEach(function(imp) {
    src.push('require("'+imp+'");')
  });

  // Once DOMContentLoaded
  src.push('document.addEventListener("DOMContentLoaded",function() {');

  // Inject html source
  if(result.head) {
    src.push('var head = document.getElementsByTagName("head")[0];')
    src.push('head.insertAdjacentHTML("beforeend",'+JSON.stringify(result.head)+');')
  }

  if(result.body) {
    src.push('var body = document.getElementsByTagName("body")[0];')
    src.push('var root = body.appendChild(document.createElement("div"));')
    src.push('root.setAttribute("hidden","");')
    src.push('root.innerHTML=' + JSON.stringify(result.body)+ ';')
  }

  // Require scripts
  result.scripts.forEach(function(script) {
    src.push('require("'+script+'");')
  })

  // Append inline sources
  result.inline.forEach(function(inline) {
    src.push(';(function() {\n'+inline+'\n})();')
  })

  // End DOMContentLoaded
  src.push('\n})')

  return src.join('\n')
}

/**
 * Parse a polymer component and return a parse result object
 *
 * @param {String} src
 *        Web-component html source
 *
 * @param {String} filepath
 *        Web-component filepath
 *
 * @return {Object}
 *         Parse result object:
 *         - `imports` {Array}: Relative path to other components to require as commonjs module
 *         - `scripts` {Array}: Relative path to other javascript modules
 *         - `inline` {Array}: Inline script sources
 *         - `head` {String}: Source to insert into the main document's head
 *         - `body` {String}: Source to insert into the document's body
 */
function parseSource(src, filepath) {
  var result  = {};

  // Use whacko (cheerio) to parse html source
  var $       = whacko.load(src);

  // Extract sources and remove tags
  result.imports = extractImports($);
  result.scripts = extractScripts($);
  result.inline  = extractInline($)

  // Inline external stylesheets
  inlineStylesheet($, filepath)

  // Inline css minification and remove comments
  minifyHtml($)

  // Extract transformed html source:
  result.head = $("head").html().trim();
  result.body = $("body").html().trim();

  return result;
}

/**
 * Extract relative path to other web-component sources
 *
 * @param {Object} $
 *        Whacko document
 *
 * @return {Array}
 */
function extractImports($) {
  var imports = [];
  $('link[rel=import][href]').each(function() {
    var el   = $(this);
    var href = el.attr('href');
    if(ABS.test(href)) return;
    imports.push(/^\./.test(href) ? href : './' + href);
    el.remove();
  })
  return imports;
}


/**
 * Extract relative path to other javascript sources
 *
 * @param {Object} $
 *        Whacko document
 *
 * @return {Array}
 */
function extractScripts($) {
  var scripts = [];
  $('script[src]').each(function() {
    var el  = $(this);
    var src = el.attr('src');
    if(ABS.test(src)) return;
    scripts.push(/^\./.test(src) ? src : './' + src);
    el.remove();
  })
  return scripts;
}

/**
 * Extract inline javascript sources
 *
 * @param {Object} $
 *        Whacko document
 *
 * @return {Array}
 */
function extractInline($) {
  var scripts = [];
  $('script:not([src])').each(function() {
    var el  = $(this);
    var src = el.text();
    var closestPolymerElement = el.closest('polymer-element');
    if(closestPolymerElement.length) {
      src = fixPolymerInvocation(src, $(closestPolymerElement).attr('name'))
    }
    scripts.push(src);
    el.remove();
  })
  return scripts;
}

/**
 * Inline external css sources
 *
 * @param {Object} $
 *        Whacko document
 *
 * @return {Array}
 */
function inlineStylesheet($, filepath) {
  $('link[rel=stylesheet][href]').each(function() {
    var el      = $(this);
    var href    = el.attr('href');
    if(ABS.test(href)) return;
    var relpath = /^\./.test(href) ? href : './' + href;
    var srcpath = resolve.sync(relpath, {
      basedir    : dirname(filepath),
      extensions : [extname(relpath)]
    })
    var content = read(srcpath);
    var style = whacko('<style>' + content + '</style>');
    style.attr(el.attr());
    style.attr('href', null);
    style.attr('rel', null);
    el.replaceWith(whacko.html(style));
  })
}


/**
 * Fix polymer invocation to always use the Polymer('elementName', {...}) form
 *
 * Inspired by https://github.com/Polymer/vulcanize
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
  if(!match) return src;
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


/**
 * Optimize html source
 *
 * Inspired by https://github.com/Polymer/vulcanize
 *
 * @param {Object} $
 *        Whacko document
 */
function minifyHtml($) {
  $('style:not([type]), style[type="text/css"]').each(function() {
    var el      = $(this);
    el.text( new cleancss({noAdvanced: true}).minify(el.text()) )
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

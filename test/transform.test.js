/* jshint undef: false, unused: false */

var transform = (process.env.COVERAGE ? require('../lib-cov/transform.js') : require('../lib/transform.js'));
var expect    = require('expect.js');
var join      = require('path').join;
var concat    = require('concat-stream');
var resumer   = require('resumer');

function fixp(filename) {
  return join(__dirname, '/fixtures', filename);
}

describe('transform', function(){
  it('should return a stream', function() {
    expect(transform).to.be.a('function')
    expect(transform()).to.have.property('pipe')
    expect(transform().pipe).to.be.a('function')
  })

  it('should fix polymer source (match filepath..)', function(done) {
    resumer().queue('a.PolymerExpressions = r; b.esprima = p; c.esprima(); c.foobar = q;').end()
      .pipe(transform('./polymer/polymer.js'))
      .pipe(concat(function(result) {
        expect(result)
          .to.eql('window.PolymerExpressions = r; window.esprima = p; c.esprima(); c.foobar = q;')
        done();
      }))
  })

  it('should transform a polymer component', function(done) {
    var src = [];
    resumer().queue('<polymer-element></polymer-element>').end()
      .pipe(transform('./bower_components/foobar/foobar.html'))
      .pipe(concat(function(result) {
        expect(result).to
          .contain('.innerHTML="<polymer-element></polymer-element>"')
        done();
      }))
  })

  it('should not transform source if `match` option do not match filepath', function(done) {
    var src = [];
    resumer().queue('Do not change').end()
      .pipe(transform('./foobar.html'))
      .pipe(concat(function(result) {
        expect(result).to.eql('Do not change')
        done();
      }))
  })

  it('should use `match` option', function(done) {
    var src = [];
    resumer().queue('<my-element></my-element>').end()
      .pipe(transform('./my_components/foobar.html', { match: 'my_components.*\\.html$' }))
      .pipe(concat(function(result) {
        expect(result).to
          .contain('.innerHTML="<my-element></my-element>"')
        done();
      }))
  })

  it('should add require calls for relative "import" dependencies (and remove link tags)', function(done) {
    var src = [];
    resumer().queue(
      '<link rel="import" href="qux.html">'+
      '<link rel="import" href="../another.html">'+
      '<link rel="import" href="/absolute.html">'+
      '<link rel="import" href="http://www.exemple.com/absolute.html">'
      ).end()
      .pipe(transform('./bower_components/foobar.html'))
      .pipe(concat(function(result) {
        expect(result).to
          .contain('require("./qux.html")')
          .contain('require("../another.html")')
          .contain('href=\\"/absolute.html\\"')
          .contain('href=\\"http://www.exemple.com/absolute.html\\"')
        expect(result).not.to
          .contain('href=\\"qux.html\\"')
          .contain('href=\\"../another.html\\"')
        done();
      }))
  })

  it('should add require calls for relative scripts dependencies (and remove script tags)', function(done) {
    var src = [];
    resumer().queue(
      '<script src="qux.js"></script>'+
      '<script src="../another.js"></script>'+
      '<script src="/absolute.js"></script>'+
      '<script src="http://www.exemple.com/absolute.js"></script>'
      ).end()
      .pipe(transform('./bower_components/foobar.html'))
      .pipe(concat(function(result) {
        expect(result).to
          .contain('require("./qux.js")')
          .contain('require("../another.js")')
          .contain('src=\\"/absolute.js\\"')
          .contain('src=\\"http://www.exemple.com/absolute.js\\"')
        expect(result).not.to
          .contain('src=\\"qux.js\\"')
          .contain('src=\\"../another.js\\"')
        done();
      }))
  })

  it('should inline css (head)', function(done) {
    var src = [];
    resumer().queue('<link rel="stylesheet" href="foo.css">').end()
      .pipe(transform(fixp('foo.html'), {match:/fixtures.*\.html$/}))
      .pipe(concat(function(result) {
        expect(result).to
          .contain('head.insertAdjacentHTML("beforeend","<style>.foo{color:#be3b87}</style>")')
        done();
      }))
  })

  it('should inline css (body)', function(done) {
    var src = [];
    resumer().queue('<x-tag><template><link rel="stylesheet" href="foo.css"></template></x-tag>').end()
      .pipe(transform(fixp('foo.html'), {match:/fixtures.*\.html$/}))
      .pipe(concat(function(result) {
        expect(result).to
          .contain('.innerHTML="<x-tag><template><style>.foo{color:#be3b87}</style></template></x-tag>"')
        done();
      }))
  })

  it('should extract inline javascript and append it to the generated module source', function(done) {
    var src = [];
    resumer().queue('<x-tag><script>foo()</script></x-tag>').end()
      .pipe(transform(fixp('foo.html'), {match:/fixtures.*\.html$/}))
      .pipe(concat(function(result) {
        expect(result).to
          .contain('.innerHTML="<x-tag></x-tag>"')
          .contain(';(function() {\nfoo()\n})();')
        done();
      }))
  })

  it('should fix Polymer() calls from inline javascript inside a polymer-element', function(done) {
    var src = [];
    resumer().queue(
      '<polymer-element name="x-foo"><script>Polymer()</script></polymer-element>'+
      '<polymer-element name="x-bar"><script>Polymer(\'x-bar\',{})</script></polymer-element>'+
      '<polymer-element name="x-qux"><script>Polymer({})</script></polymer-element>'
      ).end()
      .pipe(transform(fixp('foo.html'), {match:/fixtures.*\.html$/}))
      .pipe(concat(function(result) {
        expect(result).to
          .contain(";(function() {\nPolymer('x-foo')\n})();")
          .contain(";(function() {\nPolymer('x-bar',{})\n})();")
          .contain(";(function() {\nPolymer('x-qux',{})\n})();")
        done();
      }))
  })

  it('should remove html comments', function(done) {
    var src = [];
    resumer().queue('<x-tag><!-- html comment --></x-tag>').end()
      .pipe(transform(fixp('foo.html'), {match:/fixtures.*\.html$/}))
      .pipe(concat(function(result) {
        expect(result).to
          .contain('.innerHTML="<x-tag></x-tag>"')
        done();
      }))
  })
})

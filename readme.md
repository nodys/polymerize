# polymerize [![Build Status](https://secure.travis-ci.org/nodys/polymerize.png?branch=master)](http://travis-ci.org/nodys/polymerize) [![NPM version](https://badge-me.herokuapp.com/api/npm/polymerize.png)](http://badges.enytc.com/for/npm/polymerize)

> A browserify transform for polymer web-component (a vulcanizer)

## Features

  - Require polymer elements into your browserify bundle `require('../bower_components/paper-button/paper-button.html')`
  - Inspired by [Polymer/vulcanize](https://github.com/Polymer/vulcanize)

## Installation

```shell
npm install --save polymerize cssy
```

## Usage

First install some Polymer components (see [installing elements](https://www.polymer-project.org/docs/start/usingelements.html#install)):

```shell
bower install Polymer/paper-button
```

Use it as a browserify transform:

```javascript
var b = require('browserify')();
b.transform('polymerize');
b.add('./myapp.js')
b.bundle().pipe(process.stdout);
```

Or within your `package.json` (see [browserify package field](https://github.com/substack/browserify-handbook#browserifytransform-field)):

```javascript
{
  // ... package.json
  "browserify": {
    "transform": [ "polymerize" ]
  }
}
```

Then you can require any installed polymer component into your application

```javascript
// myapp.js
require('../bower_components/paper-button/paper-button.html')
```

```html
<!-- myapp.html -->
<script src="myapp_bundle.js"></script>
<body><paper-button>Hello Polymer</paper-button>
```

## Match options

Restrict which sources should be transformed by polymerize. Default is to transform every html sources from bower_components: `/bower_components.*\.html$/`.

Match is a Regex applied against source filepath.

Change match options:

```javascript
// Apply only on file under my_component folder
b.transform({match: /my_component.*\.html$/}, 'polymerize');
```

Or in your `package.json`:
```javascript
{
  // ... package.json
  "browserify": {
    "transform": [
      ["polymerize", { "match": "my_component.*\\.html$"}]
    ]
  }
}
```

## Idea & disclaimer

*This project is just an experiment. There is some [ugly patch](./lib/fixpolymer.js) on bundled polymer source to make it works... Polymer is great. Maybe, Polymer could be even better by [using npm to publish its packages](https://github.com/Polymer/polymer/issues/326).*

---

[The MIT License](./LICENSE) • By [Novadiscovery](http://www.novadiscovery.com/)

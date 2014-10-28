# polymerize [![Build Status](https://secure.travis-ci.org/nodys/polymerize.png?branch=master)](http://travis-ci.org/nodys/polymerize) [![NPM version](https://badge-me.herokuapp.com/api/npm/polymerize.png)](http://badges.enytc.com/for/npm/polymerize)

> A browserify transform for polymer web-component

**(DEV Ongoing)**

## Features

  - Import polymer elements into your browserify bundle

## Installation

```shell
npm install --save polymerize
```

## Usage

```javascript
var browserify = require('browserify')
var polymerize = require('polymerize');

var b = browserify();
b.transform(polymerize());
b.bundle();
```

---

[The MIT License](./LICENSE) • By [Novadiscovery](http://www.novadiscovery.com/)

'use strict';

var expect = require('chai').expect;
var log = require('../index');
var should = require('chai').should();

describe('#API', function () {
    it ('should contain .info()', function() {
        log.info.should.be.a('function');
    });
    it ('should contain .warn()', function() {
        log.warn.should.be.a('function');
    });
    it ('should contain .error()', function() {
        log.error.should.be.a('function');
    });
    
    it ('should contain .init()', function() {
        log.init.should.be.a('function');
    });
    it ('should contain .setTags()', function() {
        log.error.should.be.a('function');
    });
    it ('should contain .getTags()', function() {
        log.error.should.be.a('function');
    });
    
});

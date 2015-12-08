var RedisEvent = require('../index.js');
var fake = require('fakeredis');
var options = {
	redis: {
		createClientFactory: function(){
			return fake.createClient(6379, '127.0.0.1',{
				enable_offline_queue: false,
				retry_max_delay: 10000,
				max_attempts: 10000,
				no_ready_check: true
			});
		}
	}
};

var assert = require('chai').assert;

describe("Events#", function() {

	it("should send and receive event", function(done) {
		var ev = new RedisEvent(['main'], options);
		ev.on('ready', function() {
			ev.on('main:hello', function(data) {
				assert.deepEqual(data, {name: 'Scott'});
				ev.quit();
				return done();
			});

			ev.pub('main:hello', {name: 'Scott'});
		});
	});

	it("should subscribe to a new channel and pubsub", function(done) {
		var ev = new RedisEvent([], options);
		
		ev.subscribe('main2');

		ev.on('ready', function() {
				
			ev.on('main2:hello', function(data) {
				assert.deepEqual(data, {name: 'Scott'});
				ev.quit();
				return done();
			});

			ev.pub('main2:hello', {name: 'Scott'});
		});
	});

	it("should subscribe to a new channel only once and pubsub", function(done) {
		var ev = new RedisEvent([], options);
		ev.on('ready', function() {
			
			ev.subscribe('main2');
			ev.subscribe('main2');

			ev.on('main2:hello', function(data) {
				assert.deepEqual(data, {name: 'Scott'});
				ev.quit();
				return done();
			});

			ev.pub('main2:hello', {name: 'Scott'});
		});
	});
});

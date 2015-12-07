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

describe("Connection#", function() {

	it("should make not make connection if redis is not running", function() {
		var ev = new RedisEvent(['main']);
		ev.on('error', function() {
			return done();
		});
	});

	it("should make connection if redis is provided", function(done) {
		var ev = new RedisEvent(['main'], options);
		ev.on('ready', function() {
			return done();
		});
	});

});

#!/usr/bin/env node

var dgram = require("dgram");
var debug = require("debug")("counterclock");

function counterclock(config){
	return (this instanceof counterclock) ? this.init(config) : new counterclock(config);
}

// set prototype to eventemitter
require("util").inherits(counterclock, require('events').EventEmitter);

counterclock.prototype.init = function(config){
	var self = this;
	self.config = config || {};

	self.port = self.config.port || 16016;

	self.server = dgram.createSocket("udp4");

	self.server.on("listening", function(){
		debug("listening on %s:%d", self.server.address().address, self.server.address().port);
	});

	self.server.on("message", function(message, remote) {
		debug("received %s from %s:%d", message, remote.address, remote.port)
		
		message = message.split(":");
		
		switch (message[0]) {
			case "gst": self.emit("game-start"); break;
			case "jsj": self.emit("jam-start"); break;
			case "jen": self.emit("jam-end"); break;
			case "pen": self.emit("period-end"); break;
			case "oto": self.emit("official-timeout"); break;
			case "rsm": self.emit("resume"); break;
			case "otj": self.emit("overtime-jam"); break;
			case "eog": self.emit("end-of-game"); break;
			case "clk": self.emit("clock", parseInt(message[1],10)); break;
			case "tto": self.emit("team-timeout", parseInt(message[1],10)); break;
			case "orv": self.emit("official-review", parseInt(message[1],10)); break;
			case "rrv": self.emit("retained-review", parseInt(message[1],10)); break;
			case "lrv": self.emit("lost-review", parseInt(message[1],10)); break;
		}

	});
	
	self.server.bind(self.port);

	return this;
};

module.exports = counterclock; 

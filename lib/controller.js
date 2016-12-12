#!/usr/bin/env node

var gamepad = require("gamepad");
var debug = require("debug")("controller");


function controller(config){
	return (this instanceof controller) ? this.init(config) : new controller(config);
}

// set prototype to eventemitter
require("util").inherits(controller, require('events').EventEmitter);

controller.prototype.init = function(config){
	var self = this;

	self.config = config || {};

	self.matrix = self.config.matrix || ["x","a","b","y","l","ll","r","rr","select","start"]

	self.modifier = self.config.modifier || 9; // start key is modifier

	self.lock = [false, false];
	self.alt = false;

	self.rapidfire = [false, false];

	gamepad.init();

	setInterval(gamepad.processEvents, 16);
	setInterval(gamepad.detectDevices, 500);

	gamepad.on("up", function(session, id){
		if (id === self.modifier) return (self.alt = false);
	});

	gamepad.on("down", function(session, id){
		if (id === self.modifier) return (self.alt = true);
		self.handle(self.matrix[id]);
	});

	gamepad.on("move", function(session, id, v){
		
		// round value
		var v = Math.round(v)
		
		// set lock state according to value
		self.lock[id] = (v !== 0);
		
		// ignore axis event when other axis is in lock state
		if (self.lock[((id+1)%2)] && v !== 0) return;
				
		switch ((id*10)+v) {
			case -1: self.handle("left"); break;
			case 1: self.handle("right"); break;
			case 9: self.handle("up"); break;
			case 11: self.handle("down"); break;
		}

	});

	return this;
};

controller.prototype.handle = function(k){
	var k = (this.alt)?"alt-"+k:k;
	debug("action: %s", k);
	this.emit(k);
	return this;
};

module.exports = controller; 

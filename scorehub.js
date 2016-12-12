#!/usr/bin/env node

var scoreboard = require("./lib/scoreboard.js");
var controller = require("./lib/controller.js");

function scorehub(config){
	if (!(this instanceof scorehub)) return new scorehub(config);
	var self = this;
	
	self.scoreboard = new scoreboard();
	self.controller = new controller();
	
	self.scoreboard.connect(function(){

		self.controller.on("b", function(){
			self.scoreboard.startJam();
		});

		self.controller.on("y", function(){
			self.scoreboard.stopJam();
		});

		self.controller.on("a", function(){
			self.scoreboard.timeout();
		});

		self.controller.on("x", function(){
			self.scoreboard.resumeGame();
		});

		self.controller.on("l", function(){
			self.scoreboard.adjustScore(1,1);
		});

		self.controller.on("alt-l", function(){
			self.scoreboard.adjustScore(1,-1);
		});

		self.controller.on("r", function(){
			self.scoreboard.adjustScore(2,1);
		});

		self.controller.on("alt-r", function(){
			self.scoreboard.adjustScore(2,-1);
		});
		
		self.controller.on("left", function(){
			self.scoreboard.lead(1);
		});
		
		self.controller.on("right", function(){
			self.scoreboard.lead(2);
		});
		
		self.controller.on("down", function(){
			if (self.scoreboard.currentlead) self.scoreboard.lost(self.scoreboard.currentlead);
		});
		
		self.controller.on("alt-up", function(){
			self.scoreboard.adjustPeriodClock(1000);
		});
		
		self.controller.on("alt-down", function(){
			self.scoreboard.adjustPeriodClock(-1000);
		});

	});
	
	// sorry. FIXME
	process.on("UncaughtException", function(err){
		debug(err);
	});

	return this;
};

scorehub();

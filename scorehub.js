#!/usr/bin/env node

var scoreboard = require("./lib/scoreboard.js");
var controller = require("./lib/controller.js");
var counterclock = require("./lib/counterclock.js");

function scorehub(config){
	if (!(this instanceof scorehub)) return new scorehub(config);
	var self = this;
	
	self.scoreboard = new scoreboard();
	self.controller = new controller();
	self.counterclock = new counterclock();
	
	self.scoreboard.connect(function(){

		// counterclock
		
		self.counterclock.on("jam-start", function(){
			self.scoreboard.startJam();
		});
		
		self.counterclock.on("jam-end", function(){
			self.scoreboard.stopJam();
		});
		
		self.counterclock.on("game-start", function(){
			self.scoreboard.resumeGame();
		});
		
		self.counterclock.on("resume", function(){
			self.scoreboard.resumeGame();
		});

		self.counterclock.on("resume-period-clock", function(){
			self.scoreboard.resumePeriodClock();
		});
		
		self.counterclock.on("official-timeout", function(){
			self.scoreboard.timeout();
		});
		
		self.counterclock.on("clock", function(value){
			self.scoreboard.setPeriodClock(value);
		});
		
		self.counterclock.on("team-timeout", function(team){
			self.scoreboard.teamTimeout(team);
		});
		
		self.counterclock.on("official-review", function(team){
			self.scoreboard.review(team);
		});
		
		self.counterclock.on("retained-review", function(team){
			self.scoreboard.retainedReview(team);
		});
		
		self.counterclock.on("lost-review", function(team){
			self.scoreboard.lostReview(team);
		});
		
		self.counterclock.on("period-end", function(){
			debug("period end control not implemented yet");
		});
		
		self.counterclock.on("end-of-game", function(){
			debug("end of game control not implemented yet");
		});
		
		self.counterclock.on("overtime-jam", function(){
			debug("overtime jam control not implemented yet");
		});
		
		// controller

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

#!/usr/bin/env node

var debug = require("debug")("scoreboard");
var queue = require("queue");
var request = require("request");
var xml2js = require("xml2js");

// xml parser
var xml = new xml2js.Parser().parseString;

function scoreboard(config){
	return (this instanceof scoreboard) ? this.init(config) : new scoreboard(config);
};

scoreboard.prototype.init = function(config){
	this.config = config || {};

	// set base url
	this.baseurl = this.config.baseurl || "http://localhost:8000/XmlScoreBoard";
	
	// key
	this.key = null;
	
	// connection state
	this.connected = false;
	
	this.teams = [];
	
	this.currentlead = null;
		
	return this;
};

scoreboard.prototype.connect = function(fn){
	var self = this;
	
	self.wait(function(){
		self.register(function(err){
			if (err) return debug("register failed: %s", err), fn(err);
			self.connected = true;
			self.loop();
			fn(null);
		});
	});
	
	return this;
};

scoreboard.prototype.wait = function(fn){
	var self = this;
	debug("ready?");
	request({
		url: self.baseurl
	}, function(err,resp){
		if (err) return setTimeout(function(){
			self.wait(fn);
		},2500);
		debug("connected");
		fn(null);
	});
	return this;
};

scoreboard.prototype.register = function(fn){
	var self = this;
	debug("fetching key");
	request({
		url: self.baseurl+"/register"
	}, function(err,resp,data){
		if (err) return fn(err);
		xml(data, function(err,data){
			if (err) return fn(err);
			self.key = data.document.Key[0];
			debug("got key %s", self.key);
			fn(null, self.key);
		});
	});
	return this;
};

scoreboard.prototype.loop = function(){
	var self = this;
	request({
		url: self.baseurl+"/get?key="+self.key+"&_="+Date.now()
	}, function(err,resp,data){
		if (err) return (self.connected = false), debug("connection lost. reconnecting."), self.connect(function(){});
		if (resp.statusCode === 200) self.handle(data);
		return self.loop();
	});
	return this;
};

scoreboard.prototype.post = function(payload, fn){
	var self = this;
	request({
		method: "POST",
		url: self.baseurl+"/set?key="+self.key,
		body: '<?xml version="1.0" encoding="UTF-8"?>\n<document><ScoreBoard>'+payload+'</ScoreBoard></document>'
	}, function(err,resp,data){
		if (err) return fn(err);
		if (resp.statusCode !== 200) return fn(new Error("status code not 200"));
		return fn(null);
	});
	return this;
};

scoreboard.prototype.handle = function(data){
	var self = this;
	xml(data, function(err, data){
		if (err) return;
		// console.log(JSON.stringify(data.document.ScoreBoard[0],null,"\t"));
		
		if (data && data.hasOwnProperty("document") && data.document.hasOwnProperty("ScoreBoard") && data.document.ScoreBoard[0].hasOwnProperty("Team")){
			data.document.ScoreBoard[0].Team.forEach(function(team){
				var id = parseInt(team["$"].Id,10);

				if (team.hasOwnProperty("LeadJammer") && team.LeadJammer[0] === "Lead") self.currentlead = id;

				/* FIXME Keep and maintain CRG Scoreboard Shared Gloabl State
				if (team.hasOwnProperty("Skater") && team.Skater.length > 1) {
					self.teams[(id-1)] = team.Skater.filter(function(skater){
						return (skater.hasOwnProperty("Name") && skater.hasOwnProperty("Number"))
					}).sort(function(a,b){
						if (a.Number[0] < b.Number[0]) return -1;
						if (a.Number[0] > b.Number[0]) return 1;
						return 0
					}).map(function(skater){
						return {
							id: skater["$"].Id,
							number: skater.Number[0],
							name: skater.Name[0]
						}
					});
				} else if (team.hasOwnProperty("Skater") && team.Skater.length === 1) {
					console.log(team.Skater[0]);
				}
				*/
				
			});
		}
		
		
	});
	return this;
};

// public

scoreboard.prototype.setPeriodClock = function(value, fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	/* compensating for signal flight time */
	value -= 300;
	debug("setting period clock to %d", parseInt(value,10));
	/* crg scoreboard doesn't like milliseconds, so the request is delayed for the amount of ms and a floored value is sent */
	setTimeout(function(){
		self.post('<Clock Id="Period"><Time><![CDATA['+parseInt((value-(value%1000)),10)+']]></Time></Clock>', fn);
	},(value%1000));
	return this;
};

scoreboard.prototype.adjustPeriodClock = function(value, fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("adjusting period clock %d", parseInt(value,10));
	self.post('<Clock Id="Period"><Time change="true"><![CDATA['+parseInt(value,10)+']]></Time></Clock>', fn);
	return this;
};

scoreboard.prototype.startJam = function(fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("starting jam");
	self.post('<StartJam><![CDATA[true]]></StartJam>', fn);
	return this;
};

scoreboard.prototype.stopJam = function(fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("stopping jam");
	self.post('<StopJam><![CDATA[true]]></StopJam>', fn);
	return this;
};

scoreboard.prototype.timeout = function(fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("timeout");
	self.post('<Timeout><![CDATA[true]]></Timeout>', fn);
	return this;
};

scoreboard.prototype.resumeGame = function(fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("resuming game");
	
	var q = queue();
	
	q.push(function(done){
		self.post('<Clock Id="Intermission"><Stop><![CDATA[true]]></Stop></Clock>', done);
	});

	q.push(function(done){
		self.post('<Clock Id="Timeout"><Stop><![CDATA[true]]></Stop></Clock>', done);
	});

	q.push(function(done){
		self.post('<Clock Id="Timeout"><ResetTime><![CDATA[true]]></ResetTime></Clock>', done);
	});
	
	q.push(function(done){
		self.post('<Clock Id="Lineup"><ResetTime><![CDATA[true]]></ResetTime></Clock>', done);
	});
	
	q.push(function(done){
		self.post('<Clock Id="Lineup"><Start><![CDATA[true]]></Start></Clock>', done);
	});
	
	q.start(fn);
	
	return this;
};

scoreboard.prototype.resumePeriodClock = function(fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("resuming game");

	q.push(function(done){
		self.post('<Clock Id="Period"><Start><![CDATA[true]]></Start></Clock>', done);
	});
	
	q.start(fn);
	
	return this;
};

scoreboard.prototype.adjustScore = function(team, score, fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("team %d score adjust %d", team, score);
	self.post('<Team Id="'+parseInt(team,10)+'"><Score change="true"><![CDATA['+parseInt(score,10)+']]></Score></Team>', fn);
	return this;
};

scoreboard.prototype.lead = function(team, fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("team %d is lead", team);
	self.post('<Team Id="'+parseInt(team,10)+'"><LeadJammer><![CDATA[Lead]]></LeadJammer></Team>', fn);
	return this;
};

scoreboard.prototype.lost = function(team, fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("team %d lost lead", team);
	self.post('<Team Id="'+parseInt(team,10)+'"><LeadJammer><![CDATA[LostLead]]></LeadJammer></Team>', fn);
	return this;
};

scoreboard.prototype.starpass = function(team, fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("team %d starpass", team);
	self.post('<Team Id="'+parseInt(team,10)+'"><StarPass><![CDATA[true]]></StarPass></Team>', fn);
	return this;
};

scoreboard.prototype.review = function(team, fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("team %d official review", team);
	self.post('<Team Id="'+parseInt(team,10)+'"><OfficialReview><![CDATA[true]]></OfficialReview></Team>', fn);
	return this;
};

scoreboard.prototype.retainedReview = function(team, fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("team %d retained review", team);
	self.post('<Team Id="'+parseInt(team,10)+'"><RetainedOfficialReview><![CDATA[true]]></RetainedOfficialReview></Team>', fn);
	return this;
};

scoreboard.prototype.lostReview = function(team, fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("team %d lost review", team);
	self.post('<Team Id="'+parseInt(team,10)+'"><RetainedOfficialReview><![CDATA[false]]></RetainedOfficialReview></Team>', fn);
	return this;
};

scoreboard.prototype.teamTimeout = function(team, fn){
	var self = this;
	var fn = (typeof fn === "function") ? fn : function(){};
	debug("team %d team timeout", team);
	self.post('<Team Id="'+parseInt(team,10)+'"><Timeout><![CDATA[true]]></Timeout></Team>', fn);
	return this;
};


/*
var sb = scoreboard();
sb.connect(function(){
	sb.resumeGame(function(){
		process.exit();
	});
});
*/

module.exports = scoreboard;


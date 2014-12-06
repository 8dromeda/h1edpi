var h1e = h1edpi_module
var fl = Math.floor
var rand = Math.random

h1e.default_text_fgcolor = "#ffffff"

var FPS = 30
var TICK_LENGTH = 1000/FPS
var SCREEN_W = 240
var SCREEN_H = 160

h1e.bgstyle = undefined
//h1e.bgstyle = "#000000"
h1e.init($("#main_canvas")[0], SCREEN_W, SCREEN_H, FPS)

h1e.add_image("background", "background.png")
h1e.def_sprite("background", "background", [[0,0,240,160]])

h1e.add_image("sprites", "sprites.png")
var toprow = ["thing"]
toprow.forEach(function(name, i){
	h1e.def_sprite(name, "sprites", [[i*20,0,20,20]], [10,10])
})

// Only holds game state
function Game(){
}

function GameSection(game){
	var that = this
	game = game ? game : new Game()

	this.draw = function(h1e){
		h1e.draw_sprite(0, 0, "background")
		h1e.draw_text(60, 60, "This is a H1eDPI sample program")
		h1e.draw_sprite(120, 80, "thing")
	}
	this.event = function(h1e, event){
		/*if(event.type == "keydown"){
			if(h1e.iskey(event.key, ["escape", "q"])){
				//h1e.remove_section(this)
				return true
			}
		}*/
		/*if(event.type == "mousedown"){
			var mx = h1e.mousex()
			var my = h1e.mousey()
			return true
		}*/
		/*if(event.type == "mouseup"){
			return true
		}*/
	}
	this.update = function(h1e){
		return true
	}
}

h1e.push_section(new GameSection())

function pad_stuff(){
	h1e.resize_canvas($(window).width() - 5, $(window).height() - 5)
}

$(document).ready(function(){
	pad_stuff()
	$(window).resize(function(){
		pad_stuff()
	})
	/*$("#audio_b")[0].volume = 0.7
	$("#audio_b")[0].play()
	$("#audio_b")[0].addEventListener('ended', function(){
		this.currentTime = 0;
		this.play();
	}, false);*/
	try{
		if(window.localStorage){
			var s = window.localStorage.getItem("sound_disabled")
			if(s == "true")
				$("#audio_b")[0].pause()
		}
	}catch(e){
	}
	h1e.start()
})


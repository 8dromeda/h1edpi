var __tmp = function(){
var h1e = {}
h1edpi_module = h1e
var fl = Math.floor

/* H1edpi */

/*
DOCUMENTATION

Section:
- draw(h1e)
- update(h1e)
- event(h1e, event)
- h1e_pass_draw: true/false; passes draw to further sections
- h1e_pass_update
- h1e_pass_event

Options for h1e.init():
- native_scaling = true/false/"lowend"/undefined
- stretch_canvas = true/false

*/

ERROR_COOLDOWN = 30*5

h1e.canvas = undefined
h1e.w = undefined
h1e.h = undefined
h1e.allocated_w = undefined
h1e.allocated_h = undefined
h1e.fps = undefined
h1e.ctx = undefined
h1e.scale = 1
h1e.native_scaling = false
h1e.native_scale = 1
h1e.stretch_canvas = false
h1e.native_w = 0
h1e.native_h = 0
h1e.off_x = 0
h1e.off_y = 0
h1e.started = false
h1e.imagecache = {}
h1e.sprites = {}
h1e.sections = []
h1e.preloading = true
h1e.error_cooldown = 0
h1e.num_sprites_incomplete = 0
h1e.incomplete_notified = {}
h1e.bgstyle = "#005500"
h1e.keys = {}
h1e.has_focus = true
h1e.cb_draw_no_focus = undefined
h1e.mouse = {
	out: true,
	x: 0,
	y: 0,
	buttons: {},
	touch_detected: false,
}
h1e.nofocus_time = 0
h1e.nofocus_framedrop = 0
h1e.allow_event_grab_cb = undefined // function()->bool
h1e.gamepad = undefined
h1e.gamepad0_state = new GamepadState()
h1e.clickable_draw_targets = [] // {rect=[x0, y0, w, h], cb=function or "__hide"}
h1e.currently_drawn_clickable_draw_target = undefined
h1e.default_text_bgcolor = undefined
h1e.default_text_fgcolor = "#888888"
h1e.default_text_fontsize = 8
h1e.default_text_fonttype = "native"
h1e.default_text_native_fontname = "sans-serif"
h1e.default_text_sprite_fontname = "font"

h1e.init = function(canvas, w, h, fps, opts){
	h1e.checkdom(canvas)
	h1e.checkinteger(w)
	h1e.checkinteger(h)
	h1e.checkinteger(fps)
	opts = opts || {}

	h1e.canvas = canvas
	h1e.w = w
	h1e.h = h
	h1e.fps = fps

	if(opts.stretch_canvas === true)
		h1e.stretch_canvas = true

	h1e.detect_native_scaling(opts)

	h1e.update_scale()
}

h1e.resize_canvas = function(w, h, direct){
	h1e.allocated_w = w
	h1e.allocated_h = h
	if(h1e.native_scaling){
		// Find the largest fitting scale
		var scale = 1
		for(;;){
			if(h1e.w*(scale+1) > w || h1e.h*(scale+1) > h)
				break;
			scale += 1
		}
		// We'll use this scale for native scaling
		h1e.native_scale = scale
		// Calculate the largest fitting unscaled canvas size
		h1e.native_w = Math.floor(w / scale)
		h1e.native_h = Math.floor(h / scale)
		$("#main_canvas")[0].width = h1e.native_w
		$("#main_canvas")[0].height = h1e.native_h
		$("#main_canvas")[0].style.width  = ""+(h1e.native_w*scale)+"px"
		$("#main_canvas")[0].style.height = ""+(h1e.native_h*scale)+"px"
	} else {
		if(direct){
			// Caller makes sure w and h are multiples of the scale to be
			// determined
			$("#main_canvas")[0].width = w
			$("#main_canvas")[0].height = h
		} else {
			if(!h1e.stretch_canvas){
				$("#main_canvas")[0].width = Math.floor((w)/12)*12
				$("#main_canvas")[0].height = Math.floor((h)/12)*12
			} else {
				// Find a scale that is large enough for w and h
				var scale = 1
				for(;;){
					if(h1e.w*(scale+1) >= w && h1e.h*(scale+1) >= h)
						break;
					scale += 1
				}
				$("#main_canvas")[0].width = h1e.w * scale
				$("#main_canvas")[0].height = h1e.h * scale
			}
		}
	}
	h1e.update_scale()
}

h1e.update_scale = function(){
	var canvas = h1e.canvas
	if(h1e.native_scaling){
		h1e.scale = 1
		h1e.off_x = Math.floor((h1e.native_w - h1e.w) / 2)
		h1e.off_y = Math.floor((h1e.native_h - h1e.h) / 2)
	} else {
		h1e.scale = Math.floor(Math.min(canvas.width/h1e.w, canvas.height/h1e.h))
		if(h1e.scale < 1)
			h1e.scale = 1
		h1e.off_x = (canvas.width  - h1e.w*h1e.scale) / 2
		h1e.off_y = (canvas.height - h1e.h*h1e.scale) / 2
		if(h1e.stretch_canvas){
			$("#main_canvas")[0].style.width  = h1e.allocated_w+"px"
			$("#main_canvas")[0].style.height = h1e.allocated_h+"px"
		}
	}
	var section = h1e.sections[h1e.sections.length-1]
	if(section)
		section._h1e_updated = true
}

h1e.add_image = function(name, url){
	h1e.preload.add_image(name, url)
}

h1e.def_sprite = function(sprite_name, img_name, tcs, off){
	h1e.checkstring(sprite_name)
	h1e.checkstring(img_name)
	if(!h1e.isarray(tcs) && tcs !== undefined)
		throw new Error("tcs should be array or undefined")

	h1e.sprites[sprite_name] = {
		img_name: img_name,
		tcs: tcs,
		off: off,
		cache_img: undefined,
		cache_scale: undefined,
		draw_iteration: 0,
		error_count: 0,
	}
}

h1e.get_frame_count = function(sprite_name){
	var sprite = h1e.sprites[sprite_name]
	if(!sprite)
		throw new Error("Sprite \""+sprite_name+"\" does not exist")
	return sprite.tcs.length
}

h1e.draw_rect = function(x, y, w, h, fillStyle, opts){
	h1e.ctx.fillStyle = fillStyle
	var s = h1e.scale
	h1e.ctx.fillRect(fl(x*s), fl(y*s), fl(w*s), fl(h*s))

	if(opts && opts.click_cb){
		h1e.add_clickable_draw_target([x, y, w, h], opts.click_cb)
	} else {
		// Hide clickables below this rectangle if it is large
		if(w > 16 && h >= 16 && (!opts || !opts.disable_cdt_autohide))
			h1e.add_clickable_draw_target([x, y, w, h], "__hide")
	}
}

h1e.draw_sprite = function(x, y, sprite_name, opts){
	var sprite = h1e.sprites[sprite_name]
	if(!sprite){
		console.log("h1e.draw_sprite: Couldn't get sprite: "+sprite_name)
		h1e.error_cooldown = ERROR_COOLDOWN
		return
	}
	var img = h1e.get_sprite_image(sprite)
	if(!img){
		return
	}
	var tc = undefined
	if(sprite.tcs){
		var frame = 0
		if(opts && opts.frame)
			frame = opts.frame
		var tc = sprite.tcs[frame]
		if(tc === undefined)
			throw new Error(sprite_name+" does not have frame "+frame)
	} else {
		tc = [0, 0, img.width/h1e.scale, img.height/h1e.scale]
	}
	if(opts && opts.off){
		x -= opts.off[0]
		y -= opts.off[1]
	} else if(sprite.off){
		x -= sprite.off[0]
		y -= sprite.off[1]
	}
	var sx = tc[0]
	var sy = tc[1]
	var sw = tc[2]
	var sh = tc[3]
	var dx = x
	var dy = y
	var dw = tc[2]
	var dh = tc[3]
	if(opts && opts.cut){
		sx += opts.cut[0]
		sy += opts.cut[1]
		sw = opts.cut[2]
		sh = opts.cut[3]
		dw = opts.cut[2]
		dh = opts.cut[3]
	}
	var s = h1e.scale
	var ctx = (opts && opts.ctx) ? opts.ctx : h1e.ctx
	if(opts && opts.alpha !== undefined)
		ctx.globalAlpha = opts.alpha
	ctx.drawImage(img, fl(sx*s), fl(sy*s), fl(sw*s), fl(sh*s),
			fl(dx*s), fl(dy*s), fl(dw*s), fl(dh*s))
	if(opts && opts.alpha !== undefined)
		ctx.globalAlpha = 1.0
}

h1e.measure_text = function(text, fonttype, fontname, fontsize)
{
	fonttype = h1e.use_default(fonttype, h1e.default_text_fonttype)
	fontname = h1e.use_default(fontname, fonttype=="native" ?
			h1e.default_text_native_fontname : h1e.default_text_sprite_fontname)
	fontsize = h1e.use_default(fontsize, h1e.default_text_fontsize)
	if(fonttype == "native"){
		h1e.ctx.font = ""+(fontsize*h1e.scale)+"px "+fontname
		var m = h1e.ctx.measureText(text)
		return {w:m.width/h1e.scale+1, h:fontsize}
	} else {
		return {w:text.length*fontsize*5/8, h:fontsize}
	}
}

// Native font: opts.fonttype="native", opts.fontname="sans-serif"
// Bitmap font: opts.fonttype="sprite", opts.fontnaem="sprite name"
// TODO: Configurable sprite font size
h1e.draw_text = function(x, y, text, opts)
{
	var fonttype = h1e.use_default(opts && opts.fonttype, h1e.default_text_fonttype)
	var fontname = h1e.use_default(opts && opts.fontname, fonttype=="native" ?
			h1e.default_text_native_fontname : h1e.default_text_sprite_fontname)
	if(!h1e.isstring(text))
		text = "Invalid string"

	if(fonttype == "native"){
		x = Math.floor(x*h1e.scale)/h1e.scale
		y = Math.floor(y*h1e.scale)/h1e.scale
		var fontsize = h1e.default_text_fontsize
		if(opts && opts.fontsize !== undefined)
			fontsize = opts.fontsize
		h1e.ctx.font = ""+(fontsize*h1e.scale)+"px "+fontname
		var m = h1e.measure_text(text, fonttype, fontname, fontsize)
		var bgcolor = undefined
		if(!opts || !opts.bgcolor)
			bgcolor = h1e.default_text_bgcolor
		else if(opts.bgcolor != "none")
			bgcolor = opts.bgcolor
		if(opts && opts.right_align){
			if(bgcolor !== undefined)
				h1e.draw_rect(x-m.w-1, y, m.w+1, m.h, bgcolor)
			h1e.ctx.textAlign = "right"
		} else {
			if(bgcolor !== undefined)
				h1e.draw_rect(x, y, m.w+1, m.h, bgcolor)
			h1e.ctx.textAlign = "left"
			x += 1
		}
		if(opts && opts.fgcolor)
			h1e.ctx.fillStyle = opts.fgcolor
		else
			h1e.ctx.fillStyle = h1e.default_text_fgcolor
		h1e.ctx.fillText(text, (x)*h1e.scale, (y+6)*h1e.scale)

		// Click callback
		if(opts && opts.click_cb){
			var rect = undefined
			if(opts && opts.right_align)
				rect = [x-m.w-1, y, m.w+1, m.h]
			else
				rect = [x-1, y, m.w+1, m.h]
			h1e.add_clickable_draw_target(rect, opts.click_cb)
		}
	} else {
		if(opts && opts.right_align)
			x -= h1e.measure_text(text, fonttype, fontname).w
		text = text.toUpperCase()
		var x1 = x
		var y1 = y
		for(var i in text){
			var c = text.charCodeAt(i)
			if(c == 10){
				x1 = x
				y1 += 8
				continue
			}
			if(c < 0 || c > 127)
				c = 0 // Shows up as a black box
			h1e.draw_sprite(x1, y1, fontname, {frame: c})
			x1 += 5
		}
	}
}

h1e.push_section = function(section){
	h1e.checkobject(section)

	section._h1e_updated = true
	h1e.sections.push(section)
}

h1e.remove_section = function(section){
	var i = h1e.sections.indexOf(section)
	if(i != -1){
		h1e.sections.splice(i, 1)
		var section = h1e.sections[h1e.sections.length-1]
		if(section)
			section._h1e_updated = true
	} else {
		throw new Error("h1e.remove_section: Section not found")
	}
}

h1e.top_section = function(){
	return h1e.sections[h1e.sections.length-1]
}

h1e.receives_events = function(section){
	for(var i=h1e.sections.length-1; i>=0; i--){
		var section1 = h1e.sections[i]
		if(section1 == section)
			return true
		if(!section1.h1e_pass_event)
			break;
	}
	return false
}

// Modification not recommended
h1e.base_keycodes = {
	exact_left:  [37],
	exact_up:    [38],
	exact_right: [39],
	exact_down:  [40],
	left:  [37, "pad0_axis5_minus", "pad0_axis1_minus"],
	up:    [38, "pad0_axis6_minus", "pad0_axis2_minus"],
	right: [39, "pad0_axis5_plus",  "pad0_axis1_plus"],
	down:  [40, "pad0_axis6_plus",  "pad0_axis2_plus"],
	space: [32],
	escape: [27],
	enter: [13],
	pageup: [33],
	pagedown: [34],
	backspace: [8],
	shift: [16],
	ctrl:  [17],
	alt:   [18],
	altgr: [225],
	modifier: [16, 17, 18, 225],
	"+": [187, 171, 107],
	"-": [189, 173, 109],
	"0": [48, 96],
	"1": [49, 97],
	"2": [50, 98],
	"3": [51, 99],
	"4": [52, 100],
	"5": [53, 101],
	"6": [54, 102],
	"7": [55, 103],
	"8": [56, 104],
	"9": [57, 105],
}

// User-modifiable
h1e.keycodes = {}

for(var keyname in h1e.base_keycodes){
	h1e.keycodes[keyname] = h1e.base_keycodes[keyname]
}

h1e.keyname_to_keycodes = function(keyname, only_base_codes){
	if(only_base_codes){
		if(h1e.base_keycodes[keyname])
			return h1e.base_keycodes[keyname]
	} else {
		if(h1e.keycodes[keyname])
			return h1e.keycodes[keyname]
	}
	if(h1e.isinteger(keyname))
		return [keyname]
	if(h1e.isstring(keyname) && keyname.length == 1)
		return [keyname.toUpperCase().charCodeAt(0)]
	if(h1e.isstring(keyname) && keyname.substr(0,3) == "pad")
		return [keyname]
	throw new Error("Unknown keyname: \""+keyname+"\"")
}

h1e.iskey = function(key, keyname){
	var keynames = h1e.isarray(keyname) ? keyname : [keyname]
	return keynames.some(function(keyname){
		var keycodes = h1e.keyname_to_keycodes(keyname)
		return keycodes.some(function(keycode){
			if(key == keycode)
				return true
		})
	})
}

h1e.keydown = function(keyname){
	var keynames = h1e.isarray(keyname) ? keyname : [keyname]
	return keynames.some(function(keyname){
		var keycodes = h1e.keyname_to_keycodes(keyname)
		var match = keycodes.some(function(keycode){
			if(h1e.keys[keycode])
				return true
		})
		if(match)
			return true
	})
}

// Returns false if mouse cannot be tracked at it's current position
h1e.mouseout = function(){
	return h1e.mouse.out
}

h1e.mousex = function(){
	return h1e.mouse.x
}

h1e.mousey = function(){
	return h1e.mouse.y
}

h1e.mousedown = function(button){
	return !!h1e.mouse.buttons[button]
}

h1e.start = function(){
	if(h1e.started)
		throw new Error("h1e.start: h1edpi already started")
	h1e.started = true

	h1e.preload.all_added(function(){
		h1e.preloading = false
	})

	document.addEventListener('keydown', function(e){
		var do_grab = !(h1e.allow_event_grab_cb && !h1e.allow_event_grab_cb())
		var was_down = h1e.keys[e.keyCode]
		h1e.keys[e.keyCode] = true
		// Refresh these (they can get screwed up easily)
		if(e.shiftKey !== undefined)
			h1e.keys[16] = !!e.shiftKey
		if(e.ctrlKey !== undefined)
			h1e.keys[17] = !!e.ctrlKey
		if(e.altKey !== undefined)
			h1e.keys[18] = !!e.altKey
		// Continue normally
		var events = []
		if(!was_down && do_grab){
			events.push({
				h1e_event: {type:"keydown", key:e.keyCode},
				orig_event:e
			})
		}
		if(do_grab){
			events.push({
				h1e_event: {type:"keydown_repeatable", key:e.keyCode},
				orig_event:e
			})
			h1e.event_sections(events)
		}
	})
	document.addEventListener('keyup', function(e){
		h1e.keys[e.keyCode] = false
		if(h1e.allow_event_grab_cb && !h1e.allow_event_grab_cb())
			return
		h1e.event_sections([{
			h1e_event: {type:"keyup", key:e.keyCode},
			orig_event: e,
		}])
	})
	document.addEventListener('keypress', function(e){
		if(h1e.allow_event_grab_cb && !h1e.allow_event_grab_cb())
			return
		if(e.char !== undefined)
			var char = e.char
		else if(e.charCode >= 32)
			var char = String.fromCharCode(e.charCode)
		else
			return
		h1e.event_sections([{
			h1e_event: {type:"keypress", key:e.keyCode, char:char},
			orig_event: e,
		}])
	})
	window.onfocus = function(e){
		h1e.has_focus = true
	}
	window.onblur = function(e){
		h1e.has_focus = false
	}

	document.addEventListener('mousemove', function(e){
		if(h1e.touch_detected)
			return
		if(h1e.allow_event_grab_cb && !h1e.allow_event_grab_cb())
			return
		h1e.set_mouse_xy_from_native(e.clientX, e.clientY)
		h1e.mouse.out = false
		if(h1e.get_current_clickable_draw_target() !=
				h1e.currently_drawn_clickable_draw_target){
			h1e.trigger_redraw()
		}
		h1e.event_sections([{
			h1e_event: {type:"mousemove"},
			orig_event: e,
		}], {disable_auto_update: true})
	})
	document.addEventListener('mouseout', function(e){
		if(h1e.touch_detected)
			return
		if(h1e.allow_event_grab_cb && !h1e.allow_event_grab_cb())
			return
		h1e.mouse.out = true
		if(h1e.get_current_clickable_draw_target() !=
				h1e.currently_drawn_clickable_draw_target){
			h1e.trigger_redraw()
		}
	})
	document.addEventListener('mousedown', function(e){
		if(h1e.touch_detected)
			return
		if(h1e.allow_event_grab_cb && !h1e.allow_event_grab_cb())
			return
		if(e.button == 0)
			h1e.mouse.buttons["left"] = true
		if(e.button == 1)
			h1e.mouse.buttons["middle"] = true
		if(e.button == 2)
			h1e.mouse.buttons["right"] = true

		h1e.event_sections([{
			h1e_event: {type:"mousedown"},
			orig_event: e,
		}], {disable_auto_update: true})
	})
	document.addEventListener('mouseup', function(e){
		if(h1e.touch_detected)
			return
		if(h1e.allow_event_grab_cb && !h1e.allow_event_grab_cb())
			return
		if(e.button == 0)
			h1e.mouse.buttons["left"] = false
		if(e.button == 1)
			h1e.mouse.buttons["middle"] = false
		if(e.button == 2)
			h1e.mouse.buttons["right"] = false

		// Handle CDTs
		var handled = false
		var target = h1e.get_current_clickable_draw_target()
		if(target){
			if(target.cb !== "__hide"){
				target.cb()
			}
			// Always disable mouseup events if there is a cdt in the way
			handled = true
			e.preventDefault()
		}
		// Handle sections
		if(!handled){
			handled = h1e.event_sections([{
				h1e_event: {type:"mouseup"},
				orig_event: e,
			}], {disable_auto_update: true})
		}
	})

	document.addEventListener('touchmove', function(e0){
		h1e.touch_detected = true
		if(h1e.allow_event_grab_cb && !h1e.allow_event_grab_cb())
			return
		e0.preventDefault()
		var e = e0.changedTouches[0]
		h1e.set_mouse_xy_from_native(e.clientX, e.clientY)
		h1e.mouse.out = false
		var section = h1e.sections[h1e.sections.length-1]
		if(section && section.event && section.event(h1e, {type:"mousemove"})){
			//section._h1e_updated = true
		}
	})
	document.addEventListener('touchcancel', function(e0){
		h1e.touch_detected = true
		if(h1e.allow_event_grab_cb && !h1e.allow_event_grab_cb())
			return
		var e = e0.changedTouches[0]
		h1e.mouse.buttons["touch"] = false
		h1e.mouse.out = true
	})
	document.addEventListener('touchleave', function(e0){
		h1e.touch_detected = true
		if(h1e.allow_event_grab_cb && !h1e.allow_event_grab_cb())
			return
		var e = e0.changedTouches[0]
		h1e.mouse.buttons["touch"] = false
		h1e.mouse.out = true
	})
	document.addEventListener('touchstart', function(e0){
		h1e.touch_detected = true
		if(h1e.allow_event_grab_cb && !h1e.allow_event_grab_cb())
			return
		var e = e0.changedTouches[0]
		h1e.mouse.buttons["touch"] = true
		h1e.set_mouse_xy_from_native(e.clientX, e.clientY)
		h1e.mouse.out = false
		var section = h1e.sections[h1e.sections.length-1]
		if(section && section.event && section.event(h1e, {type:"mousedown"}))
			section._h1e_updated = true
	})
	document.addEventListener('touchend', function(e0){
		h1e.touch_detected = true
		if(h1e.allow_event_grab_cb && !h1e.allow_event_grab_cb())
			return
		e0.preventDefault()
		var e = e0.changedTouches[0]
		h1e.mouse.buttons["touch"] = false
		h1e.mouse.out = true

		// Handle CDTs
		var handled = false
		var target = h1e.get_current_clickable_draw_target()
		if(target){
			if(target.cb !== "__hide"){
				target.cb()
			}
			// Always disable touchend events if there is a cdt in the way
			handled = true
			e0.preventDefault()
		}
		// Handle sections
		if(!handled){
			var section = h1e.sections[h1e.sections.length-1]
			if(section && section.event && section.event(h1e, {type:"mouseup"}))
				section._h1e_updated = true
		}
	})

	h1e.ctx = h1e.canvas.getContext("2d")
	h1e.ctx.imageSmoothingEnabled = false
	h1e.ctx.webkitImageSmoothingEnabled = false
	h1e.ctx.mozImageSmoothingEnabled = false

	function draw_bg(){
		if(h1e.bgstyle){
			h1e.draw_rect(0, 0, h1e.w, h1e.h, h1e.bgstyle)
		}
	}

	var draw_counter = 10 // Counts how many draws happened in update
	var draw_counter_average = 0.0
	var draw_counter_min = 10.0
	var frames_per_update_average = 0.0
	var draw_does_update = false // Enabled if drawing isn't too slow
	function slow_update(){
		setTimeout(slow_update, 1000/h1e.fps*10)
		// Analyze and fix synchronization with drawing
		draw_counter_average = draw_counter * 0.1 + draw_counter_average * 0.9
		draw_counter_min += 0.1
		if(draw_counter < draw_counter_min)
			draw_counter_min = Math.max(draw_counter, 6.0)
		//console.log("draw_counter="+draw_counter)
		//console.log("draw_counter_average="+draw_counter_average)
		//console.log("draw_counter_min="+draw_counter_min)
		//console.log("frames_per_update_average="+frames_per_update_average)
		if(draw_counter_average > 0.9*10 && draw_counter_average < 1.1*10 &&
				frames_per_update_average > 0.9 && frames_per_update_average < 1.1 &&
				draw_counter_min >= 9){
			if(!draw_does_update){
				console.log("Moving updates to draw callback "+
						"(dca="+h1e.pad(draw_counter_average, 2)+", "+
						"fpua="+h1e.pad(frames_per_update_average, 2)+", "+
						"dcm="+h1e.pad(draw_counter_min, 2)+")")
				draw_does_update = true
				draw_counter_average = 10 // Reset to stabilize
				frames_per_update_average = 1.0 // Not updated in draw callback
			}
			if(draw_counter != Math.round(draw_counter_average)){
				//console.log("uncommon draw_counter: "+draw_counter)
			}
		} else if(draw_counter_average > 0.8*10 && draw_counter_average < 1.2*10 &&
				frames_per_update_average > 0.8 && frames_per_update_average < 1.2 &&
				draw_counter_min >= 9){
			// Threshold not passed to any direction
		} else {
			if(draw_does_update){
				//console.log("draw_counter_average="+draw_counter_average)
				//console.log("frames_per_update_average="+frames_per_update_average)
				console.log("Moving updates to update callback "+
						"(dca="+h1e.pad(draw_counter_average, 2)+", "+
						"fpua="+h1e.pad(frames_per_update_average, 2)+", "+
						"dcm="+h1e.pad(draw_counter_min, 2)+")")
				draw_does_update = false
			}
		}
		draw_counter = 0
	}
	slow_update()
	var last_update_time = Date.now()
	function update(){
		setTimeout(update, 1000/h1e.fps)

		var section = h1e.sections[h1e.sections.length-1]
		var now = Date.now()
		if(draw_does_update){
			last_update_time = now
			return
		}

		// This has to be called every frame before update_sections()
		h1e.update_gamepad()

		// Do the actual update(s)
		var slop = 15
		var slip = 5
		var frames = 0
		var max_skip = Math.round(h1e.fps / 15)
		while(now > last_update_time + 1000/h1e.fps - slop && frames < max_skip)
		{
			h1e.update_sections()
			last_update_time += 1000/h1e.fps
			if(last_update_time > now - slip)
				last_update_time = now
			frames++
			slop = -5
		}
		// If maximum frames were used, let it slip
		if(frames == max_skip)
			last_update_time = now
		//console.log("h1edpi: Frames in update: "+frames)
		frames_per_update_average = frames*0.01 + frames_per_update_average*0.99
	}
	update()

	var last_has_focus = true
	function draw(){
		window.requestAnimationFrameCompatible(draw)
		draw_counter++

		if(h1e.error_cooldown){
			h1e.error_cooldown--
			return
		}

		var draw_needed = h1e.draw_needed()

		h1e.ctx.save()
		h1e.ctx.beginPath()
		h1e.ctx.rect(h1e.off_x, h1e.off_y, h1e.scale*h1e.w, h1e.scale*h1e.h)
		h1e.ctx.clip()
		h1e.ctx.translate(h1e.off_x, h1e.off_y)

		if(h1e.preloading){
			draw_bg()
			h1e.ctx.save()
			h1e.ctx.fillStyle = "#ffffff"
			h1e.ctx.fillText("[Preloading...]", 40, 40)
			h1e.ctx.restore()
		} else if(h1e.sections.length > 0){
			if(!h1e.has_focus) h1e.nofocus_time += 1.0/h1e.fps
			else               h1e.nofocus_time = 0
			if(h1e.nofocus_time > 4 && h1e.nofocus_framedrop < 4){
				// Not focused; display only every 4th frame
				h1e.nofocus_framedrop++
			} else if(draw_needed || (h1e.has_focus != last_has_focus)){
				// Something has been updated; redraw section
				h1e.nofocus_framedrop = 0
				draw_bg()
				h1e.draw_sections()
				if(!h1e.has_focus && h1e.cb_draw_no_focus)
					h1e.cb_draw_no_focus(h1e)
				last_has_focus = h1e.has_focus
				h1e.draw_current_clickable_draw_target()
			}
		} else {
			draw_bg()
			h1e.ctx.save()
			h1e.ctx.fillStyle = "#ffffff"
			h1e.ctx.fillText("[No Section]", 40, 40)
			h1e.ctx.restore()
		}
		h1e.ctx.restore()

		for(name in h1e.sprites){
			var sprite = h1e.sprites[name]
			sprite.draw_iteration++
		}
		h1e.num_sprites_incomplete = 0

		// Do update after drawing, because that way there is usually enough
		// time for this update before rendering
		if(draw_does_update){
			// This has to be called every frame before update_sections()
			h1e.update_gamepad()

			h1e.update_sections()
			var now = Date.now()
			last_update_time = now
		}
	}
	window.requestAnimationFrameCompatible(draw)
}

h1e.trigger_redraw = function(){
	var section = h1e.sections[h1e.sections.length-1]
	if(section)
		section._h1e_updated = true
}

/* Clickable draw targets */

h1e.add_clickable_draw_target = function(rect, cb){
	h1e.checkarray(rect)
	if(!h1e.isfunction(cb) && cb !== "__hide")
		throw "add_clickable_draw_target: Invalid cb"
	h1e.clickable_draw_targets.push({
		rect: rect,
		cb: cb,
	})
}

/* Internal: Clickable draw targets */

var CDT_PAD = 4

// Returns callback or undefined
h1e.get_current_clickable_draw_target = function(){
	var mx = h1e.mouse.x
	var my = h1e.mouse.y
	var imprecise_target = undefined
	for(var i=h1e.clickable_draw_targets.length-1; i>=0; i--){
		var target = h1e.clickable_draw_targets[i]
		var rect = target.rect
		// Prioritize exact rectangle
		if(mx >= rect[0] && mx < rect[0] + rect[2] &&
				my >= rect[1] && my < rect[1] + rect[3]){
			if(target.cb === "__hide")
				break
			return target
		}
		// Fall back to padded rectangle
		if(mx >= rect[0] - CDT_PAD && mx < rect[0] + rect[2] + CDT_PAD &&
				my >= rect[1] - CDT_PAD && my < rect[1] + rect[3] + CDT_PAD){
			imprecise_target = target
		}
	}
	return imprecise_target
}

h1e.draw_current_clickable_draw_target = function(){
	if(h1e.mouse.out) // Mouse left window or touch not active
		return
	var target = h1e.get_current_clickable_draw_target()
	if(target === undefined)
		return
	if(target.cb === "__hide")
		return
	var rect = target.rect
	h1e.draw_rect(rect[0], rect[1], rect[2], rect[3], "rgba(255, 255, 255, 0.3)",
			{disable_cdt_autohide:true})
	h1e.currently_drawn_clickable_draw_target = target
}

h1e.reset_clickable_draw_targets = function(){
	h1e.clickable_draw_targets = []
	h1e.currently_drawn_clickable_draw_target = undefined
}

/* Internal: Section helpers */

h1e.draw_needed = function(){
	for(var i=h1e.sections.length-1; i>=0; i--){
		var section = h1e.sections[i]
		if(section._h1e_updated)
			return true
		if(!section.h1e_pass_draw)
			break;
	}
	return false
}

h1e.draw_sections = function(){
	// before_draw() passed like update()
	for(var i=h1e.sections.length-1; i>=0; i--){
		var section = h1e.sections[i]
		if(section && section.before_draw){
			section.before_draw(h1e)
		}
		if(!section.h1e_pass_update)
			break;
	}
	// Collect what to draw
	var to_draw = []
	for(var i=h1e.sections.length-1; i>=0; i--){
		var section = h1e.sections[i]
		if(section && section.draw){
			to_draw.unshift(section) // Prepend
		}
		if(!section.h1e_pass_draw)
			break;
	}
	// Reset clickable draw targets
	h1e.reset_clickable_draw_targets()
	// Draw
	to_draw.forEach(function(section){
		section.draw(h1e)
		if(h1e.num_sprites_incomplete == 0)
			section._h1e_updated = false
	}, this)
}

h1e.update_sections = function(){
	for(var i=h1e.sections.length-1; i>=0; i--){
		var section = h1e.sections[i]
		if(section && section.update){
			var r = section.update(h1e)
			if(r) section._h1e_updated = true
		}
		if(!section.h1e_pass_update)
			break;
	}
}

// events: [{h1e_event, orig_event}]
// opts: {disable_auto_update: boolean}
h1e.event_sections = function(events, opts){
	for(var i=h1e.sections.length-1; i>=0; i--){
		var section = h1e.sections[i]
		var eaten = events.some(function(event){
			h1e_event = event.h1e_event
			orig_event = event.orig_event
			if(section && section.event && section.event(h1e, h1e_event)){
				if(!opts || !opts.disable_auto_update)
					section._h1e_updated = true
				if(orig_event)
					orig_event.preventDefault()
				return true
			}
		}, this)
		if(eaten || !section.h1e_pass_event)
			break;
	}
}


/* Internal: Mouse */

h1e.set_mouse_xy_from_native = function(native_x, native_y){
	var r = h1e.canvas.getBoundingClientRect()
	if(h1e.stretch_canvas){
		h1e.mouse.x = Math.floor((native_x - r.left - h1e.off_x) / h1e.allocated_w * h1e.w)
		h1e.mouse.y = Math.floor((native_y - r.top - h1e.off_y) / h1e.allocated_h * h1e.h)
		//console.log("allocated_w:",h1e.allocated_w," h1e.w:",h1e.w)
		//console.log("native:", native_x, native_y)
		//console.log("h1e.mouse:", h1e.mouse.x, native_y)
	} else {
		h1e.mouse.x = Math.floor((native_x - r.left - h1e.off_x) / h1e.scale)
		h1e.mouse.y = Math.floor((native_y - r.top - h1e.off_y) / h1e.scale)
	}
}

/* Internal: Gamepad stuff */

function GamepadState(){
	this.buttons = []
	this.axes = []
	this.button_repeat_timers = []
}

h1e.update_gamepad = function(){
	var pads = navigator.getGamepads ? navigator.getGamepads() :
			navigator.webkitGetGamepads ? navigator.webkitGetGamepads() :
			navigator.webkitGamepads ? navigator.webkitGamepads :
			[]
	// This has to be done on every update because the state is always a new
	// object and the old object isn't updated
	if(pads.length >= 1 && pads[0] !== undefined){
		h1e.gamepad = pads[0]
	} else {
		h1e.gamepad = undefined
		h1e.gamepad0_state = new GamepadState()
	}
	if(h1e.gamepad === undefined)
		return
	var pad = h1e.gamepad
	var state = h1e.gamepad0_state
	//console.log(pad.buttons)
	var events = []
	for(var i=0; i<pad.buttons.length; i++){
		var keycode = "pad0_"+(i+1)
		if(!!pad.buttons[i] != !!state.buttons[i]){
			state.buttons[i] = pad.buttons[i]
			//console.log(keycode+" "+(pad.buttons[i]?"down":"up"))
			h1e.keys[keycode] = !!pad.buttons[i]
			if(pad.buttons[i]){
				events.push({
					h1e_event: {type:"keydown", key:keycode},
				})
				events.push({
					h1e_event: {type:"keydown_repeatable", key:keycode},
				})
				events.push({
					h1e_event: {type:"keypress", key:keycode},
				})
				state.button_repeat_timers[i] = 0.5
			} else {
				events.push({
					h1e_event: {type:"keyup", key:keycode},
				})
			}
		}
		else if(!!pad.buttons[i] && !!state.buttons[i]){
			state.button_repeat_timers[i] -= 1.0/h1e.fps // Not right
			if(state.button_repeat_timers[i] <= 0){
				events.push({
					h1e_event: {type:"keydown_repeatable", key:keycode},
				})
				state.button_repeat_timers[i] = 0.05
			}
		}
	}
	var d0 = 0.4
	var d1 = 0.6
	for(var i=0; i<pad.axes.length; i++){
		var keycode_base = "pad0_axis"+(i+1)
		var keycode_negative = keycode_base+"_minus"
		var keycode_positive = keycode_base+"_plus"
		if(pad.axes[i] != state.axes[i]){
			// Emulate direction buttons
			if(pad.axes[i] >= -d0 && state.axes[i] < -d0){
				events.push({
					h1e_event: {type:"keyup", key:keycode_negative},
				})
				h1e.keys[keycode_negative] = false
			}
			if(pad.axes[i] <= d0 && state.axes[i] > d0){
				events.push({
					h1e_event: {type:"keyup", key:keycode_positive},
				})
				h1e.keys[keycode_positive] = false
			}
			if(pad.axes[i] > d1 && state.axes[i] <= d1){
				events.push({
					h1e_event: {type:"keydown", key:keycode_positive},
				})
				events.push({
					h1e_event: {type:"keydown_repeatable", key:keycode_positive},
				})
				h1e.keys[keycode_positive] = true
				state.button_repeat_timers[100+i] = 0.5
			}
			if(pad.axes[i] < -d1 && state.axes[i] >= -d1){
				events.push({
					h1e_event: {type:"keydown", key:keycode_negative},
				})
				events.push({
					h1e_event: {type:"keydown_repeatable", key:keycode_negative},
				})
				h1e.keys[keycode_negative] = true
				state.button_repeat_timers[200+i] = 0.5
			}
			state.axes[i] = pad.axes[i]
		}
		else if(pad.axes[i] > d1){
			state.button_repeat_timers[100+i] -= 1.0/h1e.fps // Not right
			if(state.button_repeat_timers[100+i] <= 0){
				events.push({
					h1e_event: {type:"keydown_repeatable", key:keycode_positive},
				})
				state.button_repeat_timers[100+i] = 0.05
			}
		}
		else if(pad.axes[i] < -d1){
			state.button_repeat_timers[200+i] -= 1.0/h1e.fps // Not right
			if(state.button_repeat_timers[200+i] <= 0){
				events.push({
					h1e_event: {type:"keydown_repeatable", key:keycode_negative},
				})
				state.button_repeat_timers[200+i] = 0.05
			}
		}
	}
	/*if(events.length > 0)
		console.log("events="+h1e.dump(events))*/
	h1e.event_sections(events)
}

/* Internal: Image stuff */

h1e.get_sprite_image = function(sprite){
	h1e.checkobject(sprite)
	if(sprite.cache_img && sprite.cache_scale == h1e.scale){
		if(!sprite.cache_img.complete){
			h1e.num_sprites_incomplete++
		}
		return sprite.cache_img
	}
	var img = h1e.get_image(sprite.img_name+
			(h1e.scale == 1 ? "" : "|scale="+h1e.scale))
	if(!img){
		h1e.num_sprites_incomplete++
		if(sprite.draw_iteration < 3)
			return undefined
		sprite.error_count++
		if(sprite.error_count > 10){
			console.log("h1e.get_sprite_image: Failed to get \""+sprite.img_name+
					"\"")
			h1e.error_cooldown = ERROR_COOLDOWN
		}
		return undefined
	}
	if(!img.complete)
		h1e.num_sprites_incomplete++
	sprite.cache_img = img
	sprite.cache_scale = h1e.scale
	return sprite.cache_img
}

var mod_methods = [
	{t: function(mod){
		return /scale=(\d+)/.exec(mod)
	},f: function(img, m){
		var scale = Number(m[1])
		//console.log("scale:", scale)
		return h1e.scale_image(img, scale)
	}},
	{t: function(mod){
		return /mask=(#[a-f0-9]+)/.exec(mod)
	},f: function(img, m){
		var color = new h1e.Color(m[1])
		//console.log("color:", color)
		return h1e.mask_image(img, color)
	}},
	{t: function(mod){
		return /recolor=(#[a-f0-9]+),(#[a-f0-9]+)/.exec(mod)
	},f: function(img, m){
		var from = new h1e.Color(m[1])
		var to = new h1e.Color(m[2])
		//console.log("from:", from)
		//console.log("to:", to)
		return h1e.recolor_image(img, from, to)
	}},
]

h1e.get_image = function(name, base){
	//console.log("get_image("+name+", "+base+")")

	// Using cache is possible if there is no base image
	if(base === undefined && h1e.imagecache[name] !== undefined){
		return h1e.imagecache[name]
	}

	// Otherwise we'll fetch and create the image
	var img = undefined
	var next = undefined

	if(base){
		img = base
		next = name
	} else {
		var m = /(.+?)\|(.+)/.exec(name)
		var first = m ? m[1] : name
		//console.log("first:", m)
		img = h1e.preload.images[first]
		if(!img || !img.complete){
			console.log("h1e.get_image:", first, "not found or not complete")
			h1e.error_cooldown = ERROR_COOLDOWN
			return undefined
		}
		if(m === null){
			// Put bare images in cache too
			console.debug("h1e.get_image: Caching \""+name+"\"")
			h1e.imagecache[name] = img
			return img
		}
		next = m[2]
	}

	var m = /(.+?)\|(.+)/.exec(next)
	if(!m)
		m = [undefined, next]
	//console.log("mod:", m)
	var mod = m[1]
	var did = mod_methods.some(function(method){
		var m2 = method.t(mod)
		if(m2){
			//console.log("Applying", mod, "in", name)
			img = method.f(img, m2)
			return true
		}
	})
	if(!did){
		console.log("h1e.get_image: Invalid mod:", mod)
		h1e.error_cooldown = ERROR_COOLDOWN
		return undefined
	}
	next = m[2]
	if(next){
		if(!img.complete){
			if(!h1e.incomplete_notified[name]){
				console.log("h1e.get_image:", name, "is incomplete for now")
				h1e.incomplete_notified[name] = true
			}
			return undefined
		}
		return h1e.get_image(next, img)
	} else {
		if(base === undefined){
			console.debug("h1e.get_image: Caching \""+name+"\"")
			h1e.imagecache[name] = img
		}
		return img
	}
}

/* Internal: Image preloading */

h1e.preload = {}

h1e.preload.on_images_preloaded = undefined

h1e.preload.num_images_loading = 1
h1e.preload.images_loading = {"__all_not_added": true}
h1e.preload.num_images_failed = 0
h1e.preload.images_failed = {}
h1e.preload.images = {}

h1e.preload.image_loaded = function(name){
	console.debug("__preload: Image loaded: \""+name+"\"")
	delete h1e.preload.images_loading[name]
	h1e.preload.num_images_loading--
	if(h1e.preload.num_images_loading == 0){
		console.log("__preload: All images loaded")
		h1e.preload.on_images_preloaded()
	}
}

h1e.preload.image_error = function(name){
	h1e.preload.images_failed[name] = h1e.preload.images_loading[name]
	delete h1e.preload.images_loading[name]
	h1e.preload.num_images_loading--
	h1e.preload.num_images_failed++
	console.log("__preload: Failed to load image: \""+name+"\"")
	if(h1e.preload.num_images_loading == 0)
		h1e.preload.on_images_preloaded()
}

h1e.preload.add_image = function(name, src){
	if(src === undefined)
		src = name
	console.debug("__preload: preload.add_image(\""+name+"\", \""+src+"\")")
	var img = new Image()
	img.onload = function(){
		h1e.preload.image_loaded(name)
	}
	img.onerror = function(){
		h1e.preload.image_error(name)
	}
	img.src = src
	h1e.preload.images[name] = img
	h1e.preload.images_loading[name] = img
	h1e.preload.num_images_loading++
}

h1e.preload.add_images = function(images){
	for(var name in images){
		h1e.preload.add_image(name, images[name])
	}
}

h1e.preload.all_added = function(callback){
	h1e.preload.on_images_preloaded = callback
	h1e.preload.image_loaded("__all_not_added")
}

h1e.preload.clear = function(){
	h1e.preload.images_loading = {"__all_not_added": true}
	h1e.preload.num_images_failed = 0
	h1e.preload.images_failed = {}
	h1e.preload.images = {}
}

/* Internal: Image processing */

h1e.scale_image = function(img, scale)
{
	h1e.checkdom(img)
	h1e.checkinteger(scale)

	var w = img.width
	var h = img.height
	h1e.assert(w && h)
	var canvas = document.createElement('canvas')
	canvas.width = w
	canvas.height = h
	var ctx = canvas.getContext("2d")
	ctx.drawImage(img, 0, 0)

	var w2 = img.width * scale
	var h2 = img.height * scale
	var canvas2 = document.createElement('canvas')
	canvas2.width = w2
	canvas2.height = h2
	var ctx2 = canvas2.getContext("2d")
	//ctx2.drawImage(img, 0, 0, w2, h2)

	var s = scale
	var im = ctx.getImageData(0, 0, w, h)
	var im2 = ctx2.getImageData(0, 0, w2, h2)
	h1e.checkobject(im2)
	var da = im.data // Detach from DOM
	var da2 = im2.data // Detach from DOM
	for(var y=0; y<h; y++){
		for(var x=0; x<w; x++){
			for(var y2=0; y2<scale; y2++){
				for(var x2=0; x2<scale; x2++){
					da2[((y*s+y2)*w2+x*s+x2)*4+0] = da[(y*w+x)*4+0]
					da2[((y*s+y2)*w2+x*s+x2)*4+1] = da[(y*w+x)*4+1]
					da2[((y*s+y2)*w2+x*s+x2)*4+2] = da[(y*w+x)*4+2]
					da2[((y*s+y2)*w2+x*s+x2)*4+3] = da[(y*w+x)*4+3]
				}
			}
		}
	}
	ctx2.putImageData(im2, 0, 0)

	var dataurl = canvas2.toDataURL()
	var img2 = new Image()
	img2.src = dataurl
	return img2
}

h1e.Color = function(r, g, b)
{
	if(h1e.isstring(r)){
		if(r.substr(0,1) != "#")
			throw "Invalid color string"
		this.r = parseInt(r.substr(1,2), 16)
		this.g = parseInt(r.substr(3,2), 16)
		this.b = parseInt(r.substr(5,2), 16)
	} else {
		this.r = r
		this.g = g
		this.b = b
	}
}
h1e.Color.prototype.r = 0
h1e.Color.prototype.g = 0
h1e.Color.prototype.b = 0
h1e.Color.prototype.toString = function(){
	return "["+this.r+","+this.g+","+this.b+"]"
}
h1e.Color.prototype.eqArr = function(arr, i){
	return this.r == arr[i+0] && this.g == arr[i+1] && this.b == arr[i+2]
}
h1e.Color.prototype.setArr = function(arr, i){
	arr[i+0] = this.r
	arr[i+1] = this.g
	arr[i+2] = this.b
}

h1e.mask_image = function(img, mask)
{
	h1e.checkdom(img)
	h1e.checkobject(mask)

	var w = img.width
	var h = img.height
	var canvas = document.createElement('canvas')
	canvas.width = w
	canvas.height = h
	var ctx = canvas.getContext("2d")
	ctx.drawImage(img, 0, 0)

	var im = ctx.getImageData(0, 0, w, h)
	var da = im.data // Detach from DOM
	for(var i=0; i<w*h; i++){
		if(da[i*4+3] == 0)
			continue
		if(mask.eqArr(da, i*4))
			da[i*4+3] = 0
	}
	ctx.putImageData(im, 0, 0)

	var dataurl = canvas.toDataURL()
	var img2 = new Image()
	img2.src = dataurl
	return img2
}

h1e.recolor_image = function(img, from, to)
{
	h1e.checkdom(img)
	h1e.checkobject(from)
	h1e.checkobject(to)

	var w = img.width
	var h = img.height
	var canvas = document.createElement('canvas')
	canvas.width = w
	canvas.height = h
	var ctx = canvas.getContext("2d")
	ctx.drawImage(img, 0, 0)

	var im = ctx.getImageData(0, 0, w, h)
	var da = im.data // Detach from DOM
	for(var i=0; i<w*h; i++){
		if(da[i*4+3] == 0)
			continue
		if(from.eqArr(da, i*4))
			to.setArr(da, i*4)
	}
	ctx.putImageData(im, 0, 0)

	var dataurl = canvas.toDataURL()
	var img2 = new Image()
	img2.src = dataurl
	return img2
}

/* Internal: Browser feature detection */

// Options: native_scaling = true/false/"lowend"/undefined
h1e.detect_native_scaling = function(opts){
	// Figure out whether to use native scaling
	var use_always = (opts && opts.native_scaling === true)
	var use_on_lowend = (opts && opts.native_scaling === "lowend")
	var use_on_auto = (opts && opts.native_scaling === undefined)

	var native_scaling_wanted = false
	if(!native_scaling_wanted && use_always){
		native_scaling_wanted = true
	}
	// Old firefox
	if(!native_scaling_wanted && use_on_lowend){
		var ua = navigator.userAgent
		if(ua.indexOf('Firefox') != -1 &&
				parseFloat(ua.substring(ua.indexOf('Firefox') + 8)) < 22){
			console.log("Old firefox; using native scaling for speed")
			native_scaling_wanted = true
		}
	}
	// Some very old browsers
	if(!native_scaling_wanted && (use_on_lowend || use_on_auto)){
		// Not implemented
	}
	if(native_scaling_wanted){
		// Old chrome doesn't support ctx.imageSmoothingEnabled
		var supported = true
		var ua = navigator.userAgent
		if(ua.indexOf('Chrome') != -1 && parseFloat(ua.substring(
				ua.indexOf('Chrome') + 7).split(' ')[0]) < 24){
			console.log("Old chrome; native scaling not supported.")
			supported = false
		}
		h1e.native_scaling = supported
	}
}

/* Misc. */

window.requestAnimationFrameCompatible = (function(){
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function(callback){
			window.setTimeout(callback, 1000/30);
		}
})()

h1e.isobject = function(value){
	return !(typeof value !== "object") }
h1e.isarray = function(value){
	return (typeof(value) == 'object' && value !== null && value instanceof Array) }
h1e.isstring = function(value){
	return !(typeof value !== "string") }
h1e.isnumber = function(value){
	return (typeof value === "number" && value === value) }
h1e.isbool = function(value){
	return (typeof value === "boolean") }
h1e.isfinite = function(value){
	return !(typeof value !== "number" || !isFinite(value)) }
h1e.isinteger = function(value){
	return !(typeof value !== "number" || !isFinite(value) || value != Math.floor(value)) }
h1e.isdom = function(value){
	return h1e.isobject(value) && !!value.nodeType }
h1e.isfunction = function(value){
	return !(typeof value !== "function") }

h1e.checkobject = function(value){
	if(!h1e.isobject(value)) throw new Error("Value is not object") }
h1e.checkarray = function(value){
	if(!h1e.isarray(value)) throw new Error("Value is not array") }
h1e.checkstring = function(value){
	if(!h1e.isstring(value)) throw new Error("Value is not string") }
h1e.checknumber = function(value){
	if(!h1e.isnumber(value)) throw new Error("Value is not number") }
h1e.checkbool = function(value){
	if(!h1e.isbool(value)) throw new Error("Value is not bool") }
h1e.checkfinite = function(value){
	if(!h1e.isfinite(value)) throw new Error("Value is not a finite number") }
h1e.checkinteger = function(value){
	if(!h1e.isinteger(value)) throw new Error("Value is not integer") }
h1e.checkdom = function(value){
	if(!h1e.isdom(value)) throw new Error("Value is not dom") }
h1e.checkfunction = function(value){
	if(!h1e.isfunction(value)) throw new Error("Value is not function") }
h1e.checkbool_or_undefined = function(value){
	if(!h1e.isbool(value) && value !== undefined)
		throw new Error("Value is not bool or undefined") }
h1e.assert = function(v){
	if(!v) throw new Error("Assertion failed") }

h1e.dump = function(arr, dumped_objects){
	if(dumped_objects === undefined)
		var dumped_objects = []
	var dumped_text = ""
	if(typeof(arr) == 'object' && arr === null){
		dumped_text += "null"
	} else if(typeof(arr) == 'object' && arr !== null && arr instanceof Array){
		if(dumped_objects.indexOf(arr) != -1)
			return "(circular reference)"
		dumped_objects.push(arr)
		dumped_text += "["
		var first = true
		for(var i in arr){
			if(!first)
				dumped_text += ","
			first = false
			var value = arr[i]
			dumped_text += h1e.dump(value, dumped_objects)
		}
		dumped_text += "]"
	} else if(typeof(arr) == 'object'){
		if(dumped_objects.indexOf(arr) != -1)
			return "(circular reference)"
		dumped_objects.push(arr)
		dumped_text += "{"
		var first = true
		for(var item in arr){
			if(!first)
				dumped_text += ","
			first = false
			var value = arr[item]
			dumped_text += "'"+item+"':"+h1e.dump(value, dumped_objects)
		}
		dumped_text += "}"
	} else {
		if(typeof(arr) == 'string')
			dumped_text = "\""+arr+"\""
		else if(typeof(arr) == 'number')
			dumped_text = arr
		else if(typeof(arr) == 'undefined')
			dumped_text = "undefined"
		else
			dumped_text = ""+arr+" ("+typeof(arr)+")"
	}
	return dumped_text
}

h1e.pad = function(n, d, w, z){ // number, precision, width, padchar
	w = w || 1
	if(typeof(n) == "number"){
		dn = Math.pow(10, d||0)
		n = Math.round(n*dn)/dn
	}
	z = z || ' ';
	n = n + '';
	return n.length >= w ? n : new Array(w - n.length + 1).join(z) + n;
}

h1e.use_default = function(v, replace){
	return v === undefined ? replace : v
}

}()

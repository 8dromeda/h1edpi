var __tmp = function(){
var h1e = {}
h1edpi_module = h1e

/* H1edpi */

ERROR_COOLDOWN = 30*5

h1e.canvas = undefined
h1e.w = undefined
h1e.h = undefined
h1e.fps = undefined
h1e.ctx = undefined
h1e.sprites = {}
h1e.sections = []
h1e.preloading = true
h1e.error_cooldown = 0
h1e.bgstyle = "#005500"

h1e.init = function(canvas, w, h, fps){
	h1e.checkdom(canvas)
	h1e.checkinteger(w)
	h1e.checkinteger(h)
	h1e.checkinteger(fps)

	h1e.canvas = canvas
	h1e.w = w
	h1e.h = h
	h1e.fps = fps

	h1e.update_scale()
}

h1e.update_scale = function(){
	var canvas = h1e.canvas
	h1e.scale = Math.floor(Math.min(canvas.width/h1e.w, canvas.height/h1e.h))
	h1e.off_x = (canvas.width  - h1e.w*h1e.scale) / 2
	h1e.off_y = (canvas.height - h1e.h*h1e.scale) / 2
}

h1e.add_image = function(name, url){
	h1e.preload.add_image(name, url)
}

h1e.def_sprite = function(sprite_name, img_name, tcs){
	h1e.checkstring(sprite_name)
	h1e.checkstring(img_name)
	h1e.checkarray(tcs)

	h1e.sprites[sprite_name] = {
		img_name: img_name,
		tcs: tcs,
		cache_img: undefined,
		cache_scale: undefined,
		error_count: 0,
	}
}

h1e.draw = function(x, y, sprite_name){
	var sprite = h1e.sprites[sprite_name]
	if(!sprite){
		console.log("h1e.draw: Couldn't get sprite")
		h1e.error_cooldown = ERROR_COOLDOWN
		return
	}
	var img = h1e.get_sprite_image(sprite)
	if(!img){
		return
	}
	var tc = sprite.tcs[0]
	var dx = x * h1e.scale
	var dy = y * h1e.scale
	var dw = tc[2] * h1e.scale
	var dh = tc[3] * h1e.scale
	var s = sprite.cache_scale
	h1e.ctx.drawImage(img, tc[0]*s, tc[1]*s, tc[2]*s, tc[3]*s, dx, dy, dw, dh)
	//h1e.ctx.drawImage(img, dx, dy)
}

h1e.push_section = function(section){
	h1e.checkobject(section)

	h1e.sections.push(section)
}

h1e.remove_section = function(section){
	var i = h1e.sections.indexOf(section)
	if(i != -1)
		h1e.splice(i, 1)
}

h1e.start = function(){
	h1e.preload.all_added(function(){
		h1e.preloading = false
	})

	h1e.ctx = h1e.canvas.getContext("2d")

	function draw(){
		if(h1e.error_cooldown){
			h1e.error_cooldown--
			window.requestAnimationFrameCompatible(draw)
			return
		}

		h1e.ctx.save()
		h1e.ctx.beginPath()
		h1e.ctx.rect(h1e.off_x, h1e.off_y, h1e.scale*h1e.w, h1e.scale*h1e.h)
		h1e.ctx.clip()
		h1e.ctx.translate(h1e.off_x, h1e.off_y)

		h1e.ctx.fillStyle = h1e.bgstyle
		//h1e.ctx.fillRect(0, 0, h1e.canvas.width, h1e.canvas.height)
		//h1e.ctx.fillRect(h1e.off_x, h1e.off_y, h1e.scale*h1e.w, h1e.scale*h1e.h)
		h1e.ctx.fillRect(0, 0, h1e.scale*h1e.w, h1e.scale*h1e.h)
		if(h1e.preloading){
			h1e.ctx.fillText("Preloading...", 0, 0)
		} else {
			h1e.sections[h1e.sections.length-1].draw(h1e)
		}
		h1e.ctx.restore()
		window.requestAnimationFrameCompatible(draw)
	}
	window.requestAnimationFrameCompatible(draw)
}

h1e.get_sprite_image = function(sprite){
	h1e.checkobject(sprite)
	if(sprite.cache_img && sprite.cache_scale == h1e.scale)
		return sprite.cache_img
	var img = h1e.get_image(sprite.img_name+"|scale="+h1e.scale)
	if(!img){
		sprite.error_count++
		if(sprite.error_count > 10){
			console.log("h1e.get_sprite_image: Failed to get \""+sprite.img_name+
					"\"")
			h1e.error_cooldown = ERROR_COOLDOWN
		}
		return undefined
	}
	sprite.cache_img = img
	sprite.cache_scale = h1e.scale
	return sprite.cache_img
}

h1e.get_image = function(name, base){
	var img = undefined
	var next = undefined

	if(base){
		img = base
		next = name
	} else {
		var m = /(.+?)\|(.+)/.exec(name)
		var first = m[1]
		//console.log("first:", m)
		img = h1e.preload.images[first]
		if(!img || !img.complete){
			console.log("h1e.get_image:", first, "not found or not complete")
			h1e.error_cooldown = ERROR_COOLDOWN
			return undefined
		}
		next = m[2]
	}

	var m = /(.+?)\|(.+)/.exec(next)
	if(!m)
		m = [undefined, next]
	//console.log("mod:", m)
	var mod = m[1]
	methods = [
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
			console.log("color:", color)
			return h1e.mask_image(img, color)
		}},
	]
	var did = methods.some(function(method){
		var m2 = method.t(mod)
		if(m2){
			console.log("Applying", mod, "in", name)
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
		if(!img.complete)
			return undefined
		return h1e.get_image(next, img)
	} else {
		return img
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
h1e.checkbool_or_undefined = function(value){
	if(!h1e.isbool(value) && value !== undefined)
		throw new Error("Value is not bool or undefined") }
h1e.assert = function(v){
	if(!v) throw new Error("Assertion failed") }

/* Image preloading */

h1e.preload = {}

h1e.preload.on_images_preloaded = undefined

h1e.preload.num_images_loading = 1
h1e.preload.images_loading = {"__all_not_added": true}
h1e.preload.num_images_failed = 0
h1e.preload.images_failed = {}
h1e.preload.images = {}

h1e.preload.image_loaded = function(name){
	console.log("__preload: Image loaded: \""+name+"\"")
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
	console.log("__preload: preload.add_image(\""+name+"\", \""+src+"\")")
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

/* Image processing */

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
	for(var y=0; y<h; y++){
		for(var x=0; x<w; x++){
			for(var y2=0; y2<scale; y2++){
				for(var x2=0; x2<scale; x2++){
					im2.data[((y*s+y2)*w2+x*s+x2)*4+0] = im.data[(y*w+x)*4+0]
					im2.data[((y*s+y2)*w2+x*s+x2)*4+1] = im.data[(y*w+x)*4+1]
					im2.data[((y*s+y2)*w2+x*s+x2)*4+2] = im.data[(y*w+x)*4+2]
					im2.data[((y*s+y2)*w2+x*s+x2)*4+3] = im.data[(y*w+x)*4+3]
				}
			}
		}
	}
	/*for(var i=0; i<w2*h2; i++){
		im2.data[i*4+0] = 255
		im2.data[i*4+1] = 0
		im2.data[i*4+2] = 150
		im2.data[i*4+3] = 255
	}*/
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
	for(var i=0; i<w*h; i++){
		if(im.data[i*4+3] == 0)
			continue
		if(mask.eqArr(im.data, i*4))
			im.data[i*4+3] = 0
	}
	ctx.putImageData(im, 0, 0)

	var dataurl = canvas.toDataURL()
	var img2 = new Image()
	img2.src = dataurl
	return img2
}


}()

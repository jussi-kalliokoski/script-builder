#!/usr/bin/env node

var	builder	= new require('../script-builder.js').Builder();
var	fs	= require('fs');
var	out	= '';
var	fn	= process.argv[2];
var	comp	= process.argv[3];
if (fn){
	out = builder.run(fs.readFileSync(fn, 'UTF-8'), fn).replace(/[^yn]/gi, '');
	process.stdout.write(out);
	comp = comp ? fs.readFileSync(comp, 'UTF-8') : out;
	if (out !== out.replace(/n/gi, '') || comp !== out){
		console.error("FAILED");
		process.exit(1);
	}
} else {
	process.stdin.resume();
	process.stdin.on('data', function(data){
		out += builder.run(String(data)).replace(/[^yn]/gi, '');
	});
	process.stdin.on('end', function(){
		process.stdout.write(out);
		if (out !== out.replace(/n/gi, '')){
			console.error("FAILED");
			process.exit(1);
		}
	});
}

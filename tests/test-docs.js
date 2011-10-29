#!/usr/bin/env node

console.error('Testing CommentParser...');

var SB	= require('../script-builder.js');
var fs	= require('fs');

var builder	= SB.Builder();
var parser	= SB.CommentParser([
	{
		name: 'test',
		exec: function(args) {
			this.test = args;
		},
	}
], [
	function () {
		this.text = this.text.replace(/_([^_]+)_/g, function(a, b) {
			return '<i>' + b + '</i>';
		});
	}
]);
builder.addPostProcessor(parser);
builder.run(String(fs.readFileSync('docs.test.js')));

var output	= JSON.stringify(parser.comments, null, '\t');

console.log(output);

var comp = process.argv[2] ? String(fs.readFileSync(process.argv[2], 'UTF-8')).trim() : '';

if (comp && comp !== output) {
	console.error('FAILED!');
	process.exit(1);
}

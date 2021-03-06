function __extend(obj){
	var	args	= arguments,
		l	= args.length,
		i, n;
	for (i=1; i<l; i++){
		for (n in args[i]){
			if (args[i].hasOwnProperty(n)){
				obj[n] = args[i][n];
			}
		}
	}
	return obj;
}

function __class(name, constructor, args){
	var	i, cls;
	if (!args){
		args	= [];
		i	= /^\s*function\s*\w*\s*\(([^\)]+)/.exec(constructor);
		if (i){
			i[1].replace(/[a-z$_0-9]+/ig, function(i){
				args.push(i);
			});
		} else {
			for (i=0; i<constructor.length; i++){
				args[i] = Array(i+2).join('_');
			}
		}
	}
	cls = Function('var __q;return function ' + name + '(' + args.join() + '){var i; if(__q){__q=!__q}else if(this instanceof ' + name +')this.__CLASSCONSTRUCTOR.apply(this,arguments);else{__q=!__q;i=new ' + name + ';i.__CLASSCONSTRUCTOR.apply(i,arguments);return i}};')();
	cls.prototype = constructor.prototype;
	cls.prototype.__CLASSCONSTRUCTOR = constructor;
	__extend(cls, constructor);
	return cls;
}

function Builder(variables){
	this.variables		= variables || {};
	this.postProcessors	= [];
	this.defines		= {};
}

Builder.prototype = {
	variables: null,
	run: function(on, filename){
		var	str	= on,
			r	= '',
			ctnt, pos;
		while((pos = str.search(/\/[\/\*]#/)) !== -1){
			ctnt	= str.substr(0, pos);
			r	+= this.postProcess(ctnt);
			str	= str.substr(pos);
			switch(str[1]){
			case '*':
				pos	= str.search(/\*\//);
				ctnt	= pos === -1 ? str : str.substr(3, pos - 3);
				str	= pos === -1 ? '' : str.substr(pos + 2);
				break;
			case '/':
				pos	= str.search(/[\n\r]/);
				ctnt	= pos === -1 ? str : str.substr(3, pos - 3);
				str	= pos === -1 ? '' : str.substr(pos + /\r\n?|\n/.exec(str)[0].length);
				break;
			}
			/* TODO: introduce more informative error handling. */
			r	+= this.instruct(ctnt);
		};
		r += this.postProcess(str);
		return r;
	},
	instruct: function(command, args){
		var self = this, s;
		if (arguments.length < 2){
			s	= /^\s*(\w+)/.exec(command);
			args	= command.substr(s[0].length).trim();
			command	= s[1];
		}
		command = command.toLowerCase();
		for (i=0; i<this.instructions.length; i++){
			if (this.instructions[i].name === command){
				switch(command){
				case "else":
				case "endif":
					return self.instructions[i].exec.call(self, args);
					break;
				default:
					s = this.postProcess(function(){return self.instructions[i].exec.call(self, args)});
					return s instanceof Function ? s() : '';
				}
			}
		}
		throw "Invalid Builder instruction '" + command + "'!";
	},
	addPostProcessor: function(callback){
		this.postProcessors.push(callback);
	},
	removePostProcessors: function(qualifier){
		var	self	= this,
			l	= this.postProcessors.length;
		this.postProcessors = this.postProcessors.reverse().filter(function(){
			return !qualifier.apply(self, arguments);
		}).reverse();
		return l - this.postProcessors.length;
	},
	removePostProcessor: function(qualifier){
		var self = this, done;
		this.postProcessors = this.postProcessors.reverse().filter(function(){
			return done = done || !qualifier.apply(self, arguments);
		}).reverse();
		return !!done;
	},
	postProcess: function(str){
		this.postProcessors.slice().reverse().forEach(function(proc){
			str = proc.call(this, str);
		});
		return str;
	},
	instructions: [
		{
			name: 'js',
			exec: function(args){
				var script, result = '';
				script	= 'var echo = arguments[0];\n';
				args	= args.replace(/@/g, 'this.');
				script	= Function(args);
				args	= script.call(this.variables, function(){
					result += [].slice.call(arguments).join('\t');
				});
				result += typeof args === 'undefined' ? '' : args;
				return result;
			}
		},
		{
			name: 'echo',
			exec: function(args){
				return this.instruct('js', 'return ' + args);
			}
		},
		{
			name: 'define',
			exec: function(args){
				var	parsed	= /^([^\s]+)(\s+(.+))?$/.exec(args);
				var	self	= this;
				var	proc;
				if (!parsed){
					throw new TypeError("DEFINE requires at least one argument.");
				}
				var	pattern	= /^\/(\\[^\x00-\x1f]|\[(\\[^\x00-\x1f]|[^\x00-\x1f\\\/])*\]|[^\x00-\x1f\\\/\[])+\/[gim]*/.exec(args);
				var	name	= parsed[1];

				if (pattern) {
					var	substitution	= /\s+(.+)$/.exec(args.substr(pattern[0].length));
					substitution = substitution ? substitution[1] : '';
					var method = substitution[0] === '#' ? Function('var $=[].slice.call(arguments);return ' + substitution.substr(1).replace(/@/g, 'this.')) : function(s){
						var x = [].slice.call(arguments);
						return substitution.replace(/\$([0-9]+)/g, function(a, n) {
							return x[+n];
						});
					};
					pattern = Function('return ' + pattern[0])();
					proc = function(str){
						return typeof str === 'string' ? str.replace(pattern, function(){
							return method.apply(self, arguments);
						}) : str;
					};
				} else {	
					if (typeof this.defines[name] !== 'undefined'){
						throw new SyntaxError("DEFINE cannot redefine " + name + ".");
					}

					if (!parsed[3]){
						this.defines[name] = '';
					} else {
						this.defines[name] = parsed[3];
					}

					proc = function(str){
						if (str instanceof Function){
							return str;
						}
						var res = '', i;
						while ((i = str.indexOf(name)) !== -1){
							res += str.substr(0, i) + self.defines[name];
							str = str.substr(i + name.length);
						}
						return res + str;
					};
				}

				proc.defs = true;

				this.addPostProcessor(proc);
				return '';
			}
		},
		{
			name: 'if',
			exec: function(args){
				if (!args){
					throw new TypeError("IF requires at least one argument.");
				}
				var isValid = !!this.instruct('js', 'return ' + args);

				function proc(str){
					return isValid ^ proc.els ? str : '';
				}
				proc.ifs	= true;
				proc.els	= false;

				this.addPostProcessor(proc);
				return '';
			}
		},
		{
			name: 'ifdef',
			exec: function(name){
				var	parsed	= /^[^\s]+$/.exec(name);
				if (!parsed){
					throw new TypeError("IFDEF takes one argument.");
				}
				name = name.toUpperCase();
				var isValid = typeof this.defines[name] !== 'undefined';

				function proc(str){
					return isValid ^ proc.els ? str : '';
				}
				proc.ifs	= true;
				proc.els	= false;

				this.addPostProcessor(proc);
				return '';
			}
		},
		{
			name: 'ifndef',
			exec: function(name){
				var	parsed	= /^[^\s]+$/.exec(name);
				if (!parsed){
					throw new TypeError("IFNDEF takes one argument.");
				}
				name = name.toUpperCase();
				var isValid = typeof this.defines[name] === 'undefined';

				function proc(str){
					return isValid ^ proc.els ? str : '';
				}
				proc.ifs	= true;
				proc.els	= false;

				this.addPostProcessor(proc);
				return '';
			}
		},
		{
			name: 'endif',
			exec: function(args){
				if (args){
					throw new TypeError("ENDIF takes no arguments.");
				}
				if (!this.removePostProcessor(function(proc){
					return !!this.ifs;
				})){
					
					throw new SyntaxError("ENDIF with no matching IF.");
				}
				return '';
			}
		},
		{
			name: 'else',
			exec: function(args){
				if (args){
					throw new TypeError("ELSE takes no arguments.");
				}
				var i = this.postProcessors.length, found;
				while(i--){
					if (this.postProcessors[i].ifs && !this.postProcessors[i].els){
						this.postProcessors[i].els = true;
						done = true;
						break;
					}
				}
				if (!done){
					throw new SyntaxError("ELSE with no matching IF.");
				}
				return '';
			}
		}
	],
};

this.Builder = __class('Builder', Builder);

this.context = function(){
	var i, f, g = (function(){return this}());
	for (i=0; i<arguments.length; i++){
		f = arguments[i];
		f = f instanceof Function ? Function('return ' + f)() : Function(f);
		f.call(g);
	}
};

function Comment(){
	this.unparsed = [];
}

Comment.prototype = {
	text: '',
	name: null,
	body: null,
	unparsed: null,
	__onfinish: null,
	onfinish: function (callback) {
		this.__onfinish = this.__onfinish || [];
		this.__onfinish.push(callback);
	},
}

Comment = this.Comment = __class('Comment', Comment);

function CommentParser(commands, postProcessors) {
	function processor(str) {
		var i, l, s, c, r;
		if (typeof str === 'string') {
			l = str;
			while ((i = l.search(processor.commentMatch)) !== -1) {
				c	= new Comment();
				c.body	= processor.commentMatch.exec(l)[0];
				l	= l.substr(i + c.body.length);
				r	= c.body.split(/\r\n?|\n/g).slice(1, -1);
				r.forEach(function(a){
					a = a.replace(/^\s*\*+\s?/, '');
					if (a[0] === '@') {
						a = a.substr(1);
						if (!a) {
							c.text += '@\n';
							return;
						}
						var i, s, cmd = /^([^\s]+)?\s*(.+)?$/.exec(a);
						for (i=0; i<processor.commands.length; i++) {
							if (processor.commands[i].name === cmd[1]) {
								processor.commands[i].exec.call(c, cmd[2]);
								s = true;
								break;
							}
						}
						if (!s) {
							c.unparsed.push([cmd[1], cmd[2]]);
						}
					} else {
						c.text += a + '\n';
					}
				});
				processor.postProcessors.forEach(function(p){
					p.call(c, l);
				});
				while(c.__onfinish) {
					r = c.__onfinish.shift();
					if (c.__onfinish.length === 0) delete c.__onfinish;
					r.call(c, l);
				}
				processor.comments.push(c);
			}
		}
		return str;
	}

	__extend(processor, CommentParser.prototype);
	processor.comments = [];
	processor.commands = commands ? processor.commands.concat(commands) : [].concat(processor.commands);
	processor.postProcessors = postProcessors ? processor.postProcessors.concat(postProcessors) : [].concat(processor.postProcessors);
	return processor;
}

CommentParser.prototype = {
	commentMatch: /\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//,
	commands: [
		{
			name: 'name',
			exec: function(args){
				this.name = args;
			},
		}
	],
	postProcessors: [
		function () {
			this.text = this.text.trim();
		},
		function (r) {
			if (!this.name) {
				var f = /^\s*function\s+([a-z_$][a-z_$0-9]*)/i.exec(r);
				if (f) { this.name = f[1]; return; }

				f = /^\s*([a-z_$][a-z_$0-9]*)\s*:\s*function/i.exec(r);
				if (f) { this.name = f[1]; return; }
			}
		}
	],
};

this.CommentParser = CommentParser;

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
	this.variables = variables || {};
}

Builder.prototype = {
	variables: null,
	run: function(on, filename){
		var	str	= on,
			r	= '',
			ctnt, pos;
		while((pos = str.search(/\/[\/\*]#/)) !== -1){
			ctnt	= str.substr(0, pos);
			r	+= ctnt;
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
		r += str;
		return r;
	},
	instruct: function(command, args){
		var s;
		if (arguments.length < 2){
			s	= /^\s*(\w+)/.exec(command);
			args	= command.substr(s[0].length).trim();
			command	= s[1];
		}
		command = command.toLowerCase();
		for (i=0; i<this.instructions.length; i++){
			if (this.instructions[i].name === command){
				return this.instructions[i].exec.call(this, args);
			}
		}
		throw "Invalid Builder instruction '" + command + "'!";
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

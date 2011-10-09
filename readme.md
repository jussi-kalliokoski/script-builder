# script-builder

Script builder is a tool for creating generated scripts. It's useful especially for large libraries, where you have to change many things when actually changing one thing, like a version number.

## Usage

```javascript

var builder = new require('script-builder').Builder();

builder.run("code here");

```

Generator instructions can be inserted like this:

```javascript

//#define XX

doSomething();

/*#ifdef XX */

doSomethingElse();

/*#js
return 1+1; // Prints out 2 into the the script
*/

//#else

waitWhat();

//#endif
```

No proper documentation yet, sorry, if you're interested, just drop me a message on GitHub.

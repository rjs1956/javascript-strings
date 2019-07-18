<script id='sprintf'>

	///////////////////////////////////////////////////////////////////////////////////////////////
	//
	// S P R I N T F
	//
	// This is a SLIGHLY simplified version of the standard POSIX sprintf function
	// Generally the differences are due to:
	//
	//	a) Capabilities are limited in the Javascript environment (e.g., there is a limited set of numeric types; ergo pointers and doubles are meaningless)
	//	b) Some enhancementss in the syntax are introduced (for example the "radix" (preceding precision) is overloaded for comma treatment)
	//	c) Performance considerations
	//		... the most (only?) intrusive example is with regard to blank padding of numeric types (see flags below)
	//	d) The fact that locale-specific handling is not supported
	//
	// Major differences in more detail:
	//
	//	1) Precision and Width
	//		the "*" and "*<m>$" forms are FORBIDDEN
	//		a negative value is FORBIDDEN (e.g., a format string such as "%--42.5f" or "%42.-5" is invalid)
	//	2) Flags
	//		the <blank> (positive sign displaced by blank) is NOT HANDLED (allowed) ...
	//			HOWEVER an underscore "_" flag is introduced as a synonym (replacement)
	//			this is related to the simplified pattern employed
	//		0 (left pad with zeroes) is HANDLED ... 
	//			HOWEVER the b (binary) conversion is also padded 
	//		- (padding location) is HANDLE as specified
	//		# (alternative forms) is 
	//			for x,X,o		HANDLED as specified
	//			for e,E,f,F,g,G,a,A	IGNORED ... the default "toString" result is used 
	//		I (alternative digits) is IGNORED ... due to locale dependency
	//		' is HANDLED ... HOWEVER the interpretation relative to locale is IGNORED
	//	3) Specifiers
	//		g and G are synonomous with f and F respectively	(since Javascript doesn't provide the double type)
	//		a and A (hex output of doubles) are handled as floats	(since Javascript doesn't provide the double type)
	//		p (pointer type) is IGNORED				(Javascript doesn't have an equivalent data type)
	//		n (turn around of length written) is IGNORED
	//		m (Glibc access to strerror) is IGNORED 
	//	4) Length Modifiers
	//		are all IGNORED ... most (all?) of these have to do with types (and conversions) that don't make sense in Javascript
	//		
	// Given this....
	//
	// 	the RegExp pattern employed follows the form %{%} | {% {n!} {flags} {width} {.} {precision} [<format>]} // blanks herein are used for clarity
	//
	// Notes:
	//
	//	Flag precedence (follows the standard ... this is just as a reminder)
	//		the - flag overrides the 0 flag
	//		the + flag overrides the _ flag
	//
	//	Name space (the following are appropriated from the global environment)
	//
	//		sprintf		the main interface (obviously)
	//		str_repeat	a helper function 
	//
	//		sprintf_specifiers	global definition of the specifiers (for clarity and reuse)
	//		sprintf_pattern regular expression used to scan for placeholders (compiled once for efficiency)
	//
	//	Implementation
	//		The code is heavily documented and verbose (i.e., uses long names for variables) and in pretty-print format
	//		There is a set of test cases that were (are) used for unit testing
	//		white space is used aplenty
	//			ergo the resultant code is longer than perhaps some woud like
	//		exception handling is performed at two levels
	//			errors for missing or incorectly typed values are FATAL
	//			warnings are logged for lessor infractions (for example providing more replacement values than required in the format string
	//
	//		IMPORTANT: a counter (local variable "cnt") is used to limit iterations in order to prevent a runaway process
	//			the limit on this counter is 100 that means a format_strinf cannot expect to handle more than 100 placeholders
	//			this should not be too severe a limit in practice!
	//	
	///////////////////////////////////////////////////////////////////////////////////////////////

	/* global */ var sprintf_specifiers =
		{
			dates		: "DWM",
			strings		: "sc",
			integers	: "boxXidu",
			floats		: "fFeEgGaA",
			numeric		: "",
			all		: "",
		}
	    sprintf_specifiers.numeric	= sprintf_specifiers.integers + sprintf_specifiers.floats;
	    sprintf_specifiers.all	= sprintf_specifiers.dates + sprintf_specifiers.strings + sprintf_specifiers.numeric;

	/* global */ var sprintf_pattern	= new RegExp("(?<matches>(?<pct>%%)|(%(((?<arg>[0-9]+)[$])?(?<flags>[-+0_#I']*)(?<width>[0-9]*)(?<radix>[.,]{0,1})(?<precision>[0-9]*)(?<specifier>[" + sprintf_specifiers.all + "]))))");


if(1)		// some test cases
{
	var d = new Date();
	var D = '3/14/1922';
	var f = 2369.8912727389;
	var s = 'a string';
	var F = "109.95";
	var p = 0.25;
	var O = {foo:'bar'}
		console.log('------- no args -------');
		console.log(sprintf(""));
		console.log(sprintf("%"));
		console.log('------- strings -------');
		console.log(sprintf("this is padded (20) and truncated (5) %20.5s!",	s));
		console.log(sprintf("this is truncated (25)%.25s!",			s));
		console.log('------- numeric -------');
		console.log(sprintf("hex %x.",		f));
		console.log(sprintf("octal %o.",	f));
		console.log(sprintf("binary %b.",	f));
		console.log(sprintf("char %c.",		f));
		console.log(sprintf("decimal %d %i.",	f,f));
		console.log(sprintf("unsigned %u.",	f));
		console.log(sprintf("float f %.3f F %.3F g %.3g G %.3G.",	f,f,f,f));
		console.log(sprintf("exponential e %.3e E %.3E %a A %A.",	f,f,f,f,f));
		console.log('------- dates -------');
		console.log(sprintf("Full Date %D.",		d));
		console.log(sprintf("Weekday %W.",	d));
		console.log(sprintf("Month %M.",	d));
		console.log('------- errors -------');
	try{	console.log(sprintf("ERROR missing arg 1: %d should reflect an error"));} catch(e){console.error(e);console.trace();}
	try{	console.log(sprintf("Date should be Mar 14 1922  %D.",		D));} catch(e){console.error(e);console.trace();}
	try{	console.log(sprintf("ERROR invalid date %D.",		O));} catch(e){console.error(e);console.trace();}
	try{	console.log(sprintf("ERROR invalid number %-30.4d.",			'foo'));} catch(e){console.error(e);console.trace();}
		console.log('------- more #s -------');
		console.log(sprintf("this is a right padded .%-30.4d%%.",		'63.4763'));
		console.log(sprintf("this is a left padded .%030.4d.",		'63.4763'));
		console.log(sprintf("this should appear as 64 '%.f'",		'63.763'));
		console.log('------- complex -------');
		console.log(sprintf("%%%%%this has a few %s values in integer %d and decimal %.2f and dollars $%,3f and percentage %.1f%%%% forms%%",
				"numeric",	1034542.5999,	"1034542.5999",	1034542.555,	1034542.555));
		console.log(sprintf("this %%s has a few %s values in integer %d and decimal %.2f and dollars $%,3f and percentage %3$.1f% forms",
				"numeric",	1034542.5999,	"2.5999",	1034542.555,	1034542.555));
}

	function sprintf( /*** varargs ***/ )									// an ever so slightly different implementation of the standard C function
	{
		var r = '';											// begin composition of the return value
		var ix		= 0;										// initialize the stack pointer
		var format	= arguments[ix++];								// grab the first argument from the stack (the format string)
		var format_string = format + '';								// clone the string for error handling
		var match, value, f, parts, pad, cnt = 0;							// declare the local variables (cnt is use to prevent a runaway)

		while (match = sprintf_pattern.exec(format))							// get the next placeholder
		{
			r += format.substr(0,match.index);							// add the prefix to the return value ...
			format = format.substr(match.index + match.groups.matches.length);			// and remove the prefix from the format string
	
			if (match.groups.pct)									// handle the 
				f = '%';
			else
			{
				value = arguments[ ( arg = match.groups.arg || ix++ ) ];

				if (value == undefined)			// check to see if there is something left on the stack
					throw ('SPRINTF: (ERROR) Expecting argument[' + arg + '] at:\n\t'
						 + (format_string.substr(0,format_string.length - format.length) + "<===" + format)
						 + '\nbut there is nothing there!');

				if (sprintf_specifiers.numeric.indexOf(match.groups.specifier) >= 0)		// check the data type to make sure it matches expectations
				{
					if (typeof (value) != 'number' && isNaN(parseFloat(value)))
						throw ('SPRINTF: (ERROR) Expecting a number at:\n\t'
						 + (format_string.substr(0,format_string.length - format.length) + "<===" + format)
						 + '\nbut found "' + value +'"!');
					value *= 1;
					z = match.groups.precision;
					match.groups.precision = (match.groups.radix) ? ((match.groups.precision || '0') * 1) : "";
				}
				else
				if (sprintf_specifiers.dates.indexOf(match.groups.specifier) >= 0)		// ... check for dates
				{
					if ( Object.prototype.toString.call(value) !== '[object Date]' )
					{
						if (typeof value == 'string')	value = new Date(value);
						else
							if (typeof value == 'number')	value = new Date(value);

						if ( Object.prototype.toString.call(value) !== '[object Date]' )
							throw ('SPRINTF: (ERROR) Expecting a date at:\n\t'
							 + (format_string.substr(0,format_string.length - format.length) + "<===" + format)
							 + '\nbut found "' + value +'"!');
					}
				}


				switch (match.groups.specifier)							// decide what to handle
				{
				case '%%':	f = "%";								break;	// %

				case 'D':	f = value.toString().substr(4,11);					break;	// date 
				case 'W':	f = value.toString().substr(0,3);					break;	// weekday 
				case 'M':	f = value.toString().substr(4,3);					break;	// month

				case 'b':	f = Math.round(value).toString(2) + "B";				break;	// binary
				case 'o':	f = (match.groups.flags.indexOf('#') >= 0 ? "0" : "")
						  + Math.round(value).toString(8);					break;	// octal
				case 'x':	f = (match.groups.flags.indexOf('#') >= 0 ? "0x" : "")
						  + Math.round(value).toString(16);					break;	// hex
				case 'c':	f = String.fromCharCode(value);						break;	// char
				case 'A':
				case 'a':	f = "0x" + value.toString(16);						break;	// hex of float

				case 'u':	f = Math.round(Math.abs(value)).toString();				break;	// unsigned
				case 'E':
				case 'e':	f = value.toExponential(match.groups.precision);			break;	// exponentioal
				case 'i':
				case 'd':	f = parseInt(value).toString();						break;	// integer
				case 'G':
				case 'g':
				case 'F':
				case 'f':	f = match.groups.precision === "" 
							? (parseFloat(value).toString())
							: (parseFloat(value).toFixed(match.groups.precision));		break;	// float
				case 's':
						f = match.groups.precision   != "" 
							? value.substr(0,match.groups.precision*1)
							: value;
						if (match.groups.width != "")
						{
							pad = str_repeat(' ',match.groups.width*1 - f.length);
							f = (match.groups.flags.indexOf('-') >= 0) ? pad + f : f + pad; 
						}									break;	// string
				default:
						
						throw ('SPRINTF: (ERROR) Unknown specifier "' + match.groups.specifier + '" encountered');
				}

				if (typeof(value) == 'number')
				{
					if (match.groups.radix == "," || match.groups.flags.indexOf("'") >= 0)		// handle adding commas
					{
						parts = f.split('.'); parts = {integer:parts[0],fraction:parts[1]}
						while (/(\d+)(\d{3})/.test(parts.integer))
						parts.integer = parts.integer.replace(/(\d+)(\d{3})/, '$1' + ',' + '$2');
						f = parts.integer + (parts.fraction ? '.' + parts.fraction : '');
					}

					if (value > 0)
					{
						if (match.groups.flags.indexOf('+') >= 0)				// handle explicit signing
							f = '+' + f;
						else
							if (match.groups.flags.indexOf('_') >= 0)			// NOTE: perhaps a &nbsp; is more appropriate
								f = ' ' + f;
					}

					if (match.groups.flags.indexOf('-') >= 0)					// handle numeric padding
					{										// right pad with blanks
						pad = str_repeat(' ',match.groups.width*1 - f.length);
						f += pad;
					}
					else
						if (match.groups.flags.indexOf('0') >= 0
						&& sprintf_specifiers.integers.indexOf(match.groups.specifier) >= 0)	// left pad with zeros
						{
							pad = str_repeat('0',match.groups.width*1 - f.length);
							f = pad + f;
						}

					if ('AXEGF'.indexOf(match.groups.specifier) >= 0)
						f = f.toUpperCase();
				}
			}

			r += f;
			if (cnt++ > 100) break;
		}
		r += format;
		if (ix < arguments.length)
			console.error("SPRINTF: (WARNING) Not all arguments were used: " + format_string);
		return r;
	}
	function str_repeat(i, m)
	{
		for (var o = []; m > 0; o[--m] = i);
		return o.join('');
	}
</script>

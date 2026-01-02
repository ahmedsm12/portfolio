/*
Copyright 2007 Rubicon Co.
*/

var pos=document.URL.indexOf('?',0)+1;

var mediaURL=document.URL.substr(pos);
var MediaID=mediaURL.substr(8);


var MediaTitle=MediaID.substr(0,MediaID.length-4);
//MediaID='U0305-C-5-M-1.swf';
//alert('['+MediaTitle+']');

document.writeln('<html>');
document.writeln('<head>');
document.writeln('<title>eScience '+MediaTitle+'</title>');
document.writeln('</head>');
document.writeln('<body topmargin="0" leftmargin="0" rightmargin="0" bottommargin="0">');
document.writeln('<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=7,0,0,0" width="100%" height="100%" id="CONTAINER" align="middle">');
document.writeln('<param name="movie" value="container.swf?MediaID='+MediaID+'"/>');
document.writeln('<param name="quality" value="high" />');
document.writeln('<param name="allowScriptAccess" value="sameDomain" />');
document.writeln('<param NAME=scale VALUE=showall>');
document.writeln('<param name="bgcolor" value="#ffffff" />');
document.writeln('<embed src="container.swf?MediaID='+MediaID+'"; quality=high scale=exactfit bgcolor=#ffffff width="100%" height="100%" name="container" align="middle" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" allowScriptAccess="sameDomain" />');
document.writeln('</object>');
document.writeln('</body>');
document.writeln('</html>');
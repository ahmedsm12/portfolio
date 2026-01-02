var pos = document.URL.indexOf('?', 0) + 1;
var mediaURL = document.URL.substr(pos);
var MediaID = mediaURL.substr(8);
var MediaTitle = MediaID.substr(0, MediaID.length - 4);

document.writeln('<html>');
document.writeln('<head>');
document.writeln('<title>eScience ' + MediaTitle + '</title>');
document.writeln('<style>');
document.writeln('html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#000; display:flex; justify-content:center; align-items:center; }');
document.writeln('</style>');
document.writeln('</head>');
document.writeln('<body>');
document.writeln('<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=7,0,0,0" width="1024" height="768" id="CONTAINER">');
document.writeln('<param name="movie" value="container.swf?MediaID=' + MediaID + '" />');
document.writeln('<param name="quality" value="high" />');
document.writeln('<param name="allowScriptAccess" value="sameDomain" />');
document.writeln('<param name="scale" value="showall" />'); // أو noborder أو noscale
document.writeln('<param name="bgcolor" value="#000000" />');
document.writeln('<param name="wmode" value="opaque" />');
document.writeln('<embed src="container.swf?MediaID=' + MediaID + '" width="1024" height="768" quality="high" scale="showall" bgcolor="#000000" wmode="opaque" name="container" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" allowScriptAccess="sameDomain" />');
document.writeln('</object>');
document.writeln('</body>');
document.writeln('</html>');
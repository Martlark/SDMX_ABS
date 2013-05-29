<?php

/* * *************************************************************************
 * USAGE
 * [1] r.php?pageName?token1=ABCDEFGH?token2=98734.......
 *
 * REQUIREMENTS
 *
 *  - Turn OFF magic quotes for incoming GET/POST data: add/modify the
 *    following line to your php.ini file:
 *     magic_quotes_gpc = Off
 *
 * ************************************************************************* */

$targetUrl = $_SERVER['QUERY_STRING'];
if (!$targetUrl) {
	header('Status: 400', true, 400); // Bad Request
	echo 'Target URL is not specified! <br/>';
	return;
}
// split by ? in the url
// r.php?page.html&par1=val1&par2=val2[....]
//print "target url:$targetUrl\n";
$urlParts = preg_split('/\?/', $targetUrl);
//echo $urlParts[0];
$parts = explode('&', $urlParts[0]);

$targetPath = basename($parts[0]);
if (file_exists($targetPath)) {
	$response = file_get_contents($targetPath);
} else {
	header('Status: 404', true, 404); // Bad Request
	echo "$targetPath not found";
	return;
}
// apply templates
// open this directory
for ($z = 0; $z < 3; $z++) {
	$myDirectory = opendir("templates");

// get each entry
	while ($entryName = readdir($myDirectory)) {
		if (strlen($entryName) > 3) {
			//echo $entryName;
			$template = file_get_contents("templates/$entryName");

			$replaceString = strtolower("<!--#$entryName#-->");
			$response = str_replace($replaceString, $template, $response);
		}
	}

// close template directory
	closedir($myDirectory);
}
// add the parameters to the page as #OPTION#
//$imp = implode( ',', $parts );
//print "parts=$imp\n";
$x = 0;
foreach ($parts as $value) {
	//print "$x value=$value\n";
	if ($x > 0) {
		$bits = explode('=', $value);
		//print "#$bits[0]#=$bits[1]\n";
		$replaceString = "#$bits[0]#";
		$response = str_replace($replaceString, $bits[1], $response);
	}
	$x++;
}
// add the rpage
//
$response = str_replace('rpage?', 'r.php?', $response);

echo $response;
?>

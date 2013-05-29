<?php

/* * *************************************************************************
 * USAGE
 * [1] http://<this-proxy-url>?<url>
 * [2] http://<this-proxy-url>?<url> (with POST body)
 * [3] http://<this-proxy-url>?<url>?token=ABCDEFGH
 *
 * note: [3] is used when fetching tiles from a secured service and the
 * JavaScript app sends the token instead of being set in this proxy
 *
 * REQUIREMENTS
 *  - cURL extension for PHP must be installed and loaded. To load it,
 *    add the following lines to your php.ini file:
 *     extension_dir = "<your-php-install-location>/ext"
 *     extension = php_curl.dll
 *
 *  - Turn OFF magic quotes for incoming GET/POST data: add/modify the
 *    following line to your php.ini file:
 *     magic_quotes_gpc = Off
 *
 * ************************************************************************* */

// check if the curl extension is loaded
if (!extension_loaded("curl")) {
    header('Status: 500', true, 500);
    echo 'cURL extension for PHP is not loaded! <br/> Add the following lines to your php.ini file: <br/> extension_dir = &quot;&lt;your-php-install-location&gt;/ext&quot; <br/> extension = php_curl.dll';
    return;
}

$targetUrl = $_SERVER['QUERY_STRING'];
if (!$targetUrl) {
    header('Status: 400', true, 400); // Bad Request
    echo 'Target URL is not specified! <br/> Usage: <br/> http://&lt;this-proxy-url&gt;?&lt;target-url&gt;';
    return;
}
ini_set('max_execution_time', 300); //300 seconds = 5 minutes
// open the curl session
$session = curl_init();
/* foreach ($_SERVER as $key => $value) {
  print "$key: $value<br>\n";
  } */
// set the appropriate options for this request
// increase timeout from 60 seconds
$options = array(
    CURLOPT_URL => $targetUrl,
    CURLOPT_HEADER => false,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 600,
    CURLOPT_CONNECTTIMEOUT => 600
);

if (array_key_exists('CONTENT_TYPE', $_SERVER) and array_key_exists('HTTP_REFERER', $_SERVER)) {
    $options[CURLOPT_HTTPHEADER] = array(
        'Content-Type: ' . $_SERVER['CONTENT_TYPE'],
        'Referer: ' . $_SERVER['HTTP_REFERER']
    );
}

// put the POST data in the request body
$postData = file_get_contents("php://input");
if (strlen($postData) > 0) {
    $options[CURLOPT_POST] = true;
    $options[CURLOPT_POSTFIELDS] = $postData;
}
curl_setopt_array($session, $options);

// make the call
$response = curl_exec($session);
$code = curl_getinfo($session, CURLINFO_HTTP_CODE);
$type = curl_getinfo($session, CURLINFO_CONTENT_TYPE);
curl_close($session);

// set the proper Content-Type
header("Status: " . $code, true, $code);
header("Content-Type: " . $type);

echo $response;
?>

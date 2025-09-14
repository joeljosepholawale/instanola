<?php
// Simplified DaisySMS proxy without complex error handling
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: text/plain');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit();
}

$api_key = $_GET['api_key'] ?? '';
$action = $_GET['action'] ?? '';

if (empty($api_key) || empty($action)) {
    echo 'BAD_REQUEST';
    exit();
}

// Build URL
$url = 'https://daisysms.com/stubs/handler_api.php?' . $_SERVER['QUERY_STRING'];

// Try to get the data
$response = @file_get_contents($url);

if ($response === false) {
    echo 'NO_CONNECTION';
} else {
    echo $response;
}
?>
<?php
// PaymentPoint API Proxy for CORS bypass
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Get request data
    $input = file_get_contents('php://input');
    $requestData = json_decode($input, true);
    
    if (!$requestData) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data']);
        exit();
    }
    
    // Validate required fields
    $requiredFields = ['email', 'name', 'phoneNumber', 'bankCode', 'businessId'];
    foreach ($requiredFields as $field) {
        if (!isset($requestData[$field]) || empty($requestData[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Missing required field: $field"]);
            exit();
        }
    }
    
    // Get API credentials from headers
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
    
    if (empty($authorization) || empty($apiKey)) {
        http_response_code(401);
        echo json_encode(['error' => 'Missing API credentials']);
        exit();
    }
    
    // Prepare PaymentPoint API request
    $paymentPointUrl = 'https://api.paymentpoint.co/api/v1/createVirtualAccount';
    
    $headers = [
        'Authorization: ' . $authorization,
        'Content-Type: application/json',
        'api-key: ' . $apiKey,
        'Accept: application/json',
        'User-Agent: ProxyNumSMS/1.0'
    ];
    
    // Make request to PaymentPoint API
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $paymentPointUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($requestData),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    // Check for cURL errors
    if ($response === false || !empty($curlError)) {
        error_log("PaymentPoint cURL error: $curlError");
        http_response_code(503);
        echo json_encode([
            'error' => 'PaymentPoint API connection failed',
            'message' => 'Unable to connect to PaymentPoint service'
        ]);
        exit();
    }
    
    // Check HTTP status
    if ($httpCode !== 200) {
        error_log("PaymentPoint API HTTP error: $httpCode - $response");
        http_response_code($httpCode);
        echo $response; // Forward the actual error response
        exit();
    }
    
    // Validate and forward response
    $responseData = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("PaymentPoint API invalid JSON response: $response");
        http_response_code(502);
        echo json_encode([
            'error' => 'Invalid response from PaymentPoint',
            'message' => 'PaymentPoint returned invalid data'
        ]);
        exit();
    }
    
    // Log successful request
    error_log("PaymentPoint API success: " . json_encode([
        'status' => $responseData['status'] ?? 'unknown',
        'customer_id' => $responseData['customer']['customer_id'] ?? 'unknown'
    ]));
    
    // Forward successful response
    http_response_code(200);
    echo $response;
    
} catch (Exception $e) {
    error_log('PaymentPoint Proxy Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => 'PaymentPoint proxy encountered an error'
    ]);
}
?>
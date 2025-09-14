<?php
// PaymentPoint Webhook Handler for production hosting
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Paymentpoint-Signature');
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

// Get webhook signature
$signature = $_SERVER['HTTP_X_PAYMENTPOINT_SIGNATURE'] ?? '';

// Get raw POST data
$raw_data = file_get_contents('php://input');
$payload = json_decode($raw_data, true);

// Log webhook for debugging
error_log('PaymentPoint webhook received: ' . $raw_data);

if (!$payload) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit();
}

// Basic validation
if (!isset($payload['payment_id']) || !isset($payload['status'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit();
}

// TODO: Verify webhook signature here if needed
// For now, we'll process the webhook

try {
    // Extract payment information
    $payment_id = $payload['payment_id'];
    $status = $payload['status'];
    $amount = floatval($payload['amount'] ?? 0);
    $user_id = $payload['customer']['user_id'] ?? '';
    
    if (empty($user_id)) {
        throw new Exception('Missing user ID in webhook payload');
    }
    
    // Log successful processing
    error_log("PaymentPoint webhook processed: Payment $payment_id, Status: $status, User: $user_id");
    
    // In a real implementation, you would:
    // 1. Update the payment record in your database
    // 2. Add funds to user wallet if payment is successful
    // 3. Send confirmation email
    // 4. Update transaction records
    
    // For now, just return success
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Webhook processed']);
    
} catch (Exception $e) {
    error_log('PaymentPoint webhook error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Webhook processing failed', 'message' => $e->getMessage()]);
}
?>
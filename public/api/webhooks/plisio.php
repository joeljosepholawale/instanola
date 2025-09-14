<?php
/**
 * Plisio Webhook Handler
 * Processes payment notifications from Plisio API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
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

// Get the raw POST data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Log the webhook for debugging (remove in production)
error_log('Plisio Webhook: ' . $input);

// Validate the webhook
if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit();
}

// Required fields from Plisio webhook
$required_fields = ['txn_id', 'status', 'amount', 'currency'];
foreach ($required_fields as $field) {
    if (!isset($data[$field])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required field: ' . $field]);
        exit();
    }
}

// Verify the webhook signature (implement signature verification)
// This is crucial for security in production
function verifyPlisioSignature($data, $signature, $secret) {
    $expected_signature = hash_hmac('sha256', json_encode($data), $secret);
    return hash_equals($expected_signature, $signature);
}

// Get signature from headers
$signature = $_SERVER['HTTP_X_PLISIO_SIGNATURE'] ?? '';

// For security, you should verify the signature
// $secret = 'your_plisio_webhook_secret';
// if (!verifyPlisioSignature($data, $signature, $secret)) {
//     http_response_code(401);
//     echo json_encode(['error' => 'Invalid signature']);
//     exit();
// }

try {
    // Process the payment based on status
    switch ($data['status']) {
        case 'completed':
            // Payment successful - update user wallet
            $invoice_id = $data['txn_id'];
            $amount = (float)$data['amount'];
            $currency = $data['currency'];
            
            // Here you would typically:
            // 1. Find the user associated with this payment
            // 2. Update their wallet balance
            // 3. Update the transaction record
            // 4. Send confirmation email
            
            // For now, just log the successful payment
            error_log("Plisio payment completed: $invoice_id, Amount: $amount $currency");
            
            // Return success response
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'message' => 'Payment processed successfully'
            ]);
            break;
            
        case 'pending':
            // Payment is pending confirmation
            error_log("Plisio payment pending: " . $data['txn_id']);
            
            http_response_code(200);
            echo json_encode([
                'status' => 'pending',
                'message' => 'Payment is pending'
            ]);
            break;
            
        case 'cancelled':
        case 'expired':
            // Payment was cancelled or expired
            error_log("Plisio payment " . $data['status'] . ": " . $data['txn_id']);
            
            http_response_code(200);
            echo json_encode([
                'status' => 'failed',
                'message' => 'Payment ' . $data['status']
            ]);
            break;
            
        default:
            // Unknown status
            error_log("Unknown Plisio payment status: " . $data['status']);
            
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Unknown payment status'
            ]);
            break;
    }
    
} catch (Exception $e) {
    error_log('Plisio webhook error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Internal server error'
    ]);
}

?>

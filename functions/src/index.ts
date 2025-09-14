@@ .. @@
    // Make API call to PaymentPoint
    const response = await fetch('https://api.paymentpoint.co/api/v1/createVirtualAccount', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey.trim()}`,
        'api-key': apiKey.trim(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'InstantNums/1.0'
      },
      body: JSON.stringify(requestBody)
    });
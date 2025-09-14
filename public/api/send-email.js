// Email sending API endpoint
// Handles email sending via various providers

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { provider, config, email } = req.body;

    if (!provider || !config || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let result;
    
    switch (provider) {
      case 'smtp':
        result = await sendViaSMTP(email, config);
        break;
      case 'sendgrid':
        result = await sendViaSendGrid(email, config);
        break;
      case 'mailgun':
        result = await sendViaMailgun(email, config);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported email provider' });
    }

    if (result.success) {
      res.status(200).json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ 
      error: 'Email sending failed',
      message: error.message 
    });
  }
}

async function sendViaSMTP(email, config) {
  try {
    // In a real implementation, you would use nodemailer here
    // For now, simulate successful sending
    console.log('Would send email via SMTP:', {
      to: email.to,
      subject: email.subject,
      from: `${config.fromName} <${config.fromEmail}>`
    });
    
    return { success: true, messageId: `smtp_${Date.now()}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendViaSendGrid(email, config) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: email.to }],
          subject: email.subject
        }],
        from: {
          email: config.fromEmail,
          name: config.fromName
        },
        content: [{
          type: 'text/html',
          value: email.html
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`SendGrid error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    return { success: true, messageId: response.headers.get('x-message-id') || `sg_${Date.now()}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendViaMailgun(email, config) {
  try {
    const formData = new FormData();
    formData.append('from', `${config.fromName} <${config.fromEmail}>`);
    formData.append('to', email.to);
    formData.append('subject', email.subject);
    formData.append('html', email.html);

    const response = await fetch(`https://api.mailgun.net/v3/${config.domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${config.apiKey}`).toString('base64')}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Mailgun error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
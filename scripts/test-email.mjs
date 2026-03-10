import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
    try {
        const data = await resend.emails.send({
            from: 'Melissa <melissa@elvoraconsulting.co.uk>',
            to: ['melissa@elvoraconsulting.co.uk'],
            subject: 'Have a magical day!',
            html: `
        <div style="font-family: sans-serif; color: #333;">
          <p>Hey there sexy, I hope you have a magical day!</p>
        </div>
      `
        });

        if (data.error) {
            console.error('❌ Resend API returned an error:', data.error);
        } else {
            console.log('✅ Email sent successfully! ID:', data.data.id);
        }
    } catch (error) {
        console.error('❌ Failed to send email:', error);
    }
}

sendTestEmail();

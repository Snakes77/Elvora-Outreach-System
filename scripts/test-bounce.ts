import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

async function run() {
    console.log('Sending bare-bones test to see if content is triggering the bounce...');
    const { data, error } = await resend.emails.send({
        from: 'Melissa <melissa@elvoraconsulting.co.uk>',
        to: 'paul@staxxd.co.uk',
        subject: 'Ping from Elvora System',
        text: 'This is a secure connection test. Please reply if received.'
    });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sent ID:', data?.id);
        
        // Wait 5 seconds and poll status to see if it bounces instantly
        console.log('Waiting 5 seconds to check bounce status...');
        await new Promise(r => setTimeout(r, 5000));
        
        const details = await resend.emails.get(data!.id);
        console.log('Current Status:', details.data?.last_event);
    }
}
run();

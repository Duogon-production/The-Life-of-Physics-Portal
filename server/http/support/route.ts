import 'server-only';

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId) return new NextResponse('Sign in required', { status: 401 });
		if (req.headers.get('origin') !== (process.env.APP_ORIGIN || new URL(req.url).origin)) return new NextResponse('Invalid origin', { status: 403 });
		if (Number(req.headers.get('content-length')) > 12000) return new NextResponse('Request too large', { status: 413 });
		const reader=req.body?.getReader();if(!reader)return new NextResponse('Body required',{status:400});
		let size=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>12000){await reader.cancel();return new NextResponse('Request too large',{status:413});}chunks.push(value);}
		const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));

		const name =
		typeof body?.name === 'string' && body.name.trim()
		? body.name.trim()
		: 'Student';
		const email =
		typeof body?.email === 'string'
		? body.email.trim().toLowerCase()
		: typeof body?.studentEmail === 'string'
		? body.studentEmail.trim().toLowerCase()
		: '';
		const subject =
		typeof body?.subject === 'string' && body.subject.trim()
		? body.subject.trim()
		: typeof body?.category === 'string' && body.category.trim()
		? body.category.replace(/_/g, ' ')
		: 'Platform Support Request';
		const message = typeof body?.message === 'string' ? body.message.trim() : '';

		if (!email || !message) {
			return new NextResponse('Email and message are required.', { status: 400 });
		}

		const recipients = (process.env.SUPPORT_EMAIL_TO || '').split(',').map(v => v.trim()).filter(Boolean);
		const from = process.env.SUPPORT_EMAIL_FROM;
		if (!process.env.RESEND_API_KEY || !from || !recipients.length) return new NextResponse('Support email is not configured.', { status: 503 });
		if (message.length > 2000 || subject.length > 120 || name.length > 128 || email.length > 254) return new NextResponse('Request too large', { status: 400 });
		const escape = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
		// Initialize Resend using environment variable
		const resend = new Resend(process.env.RESEND_API_KEY);

		// Send dispatch email to official support and teacher inbox
		const emailResult = await resend.emails.send({
			from,
			to: recipients,
			subject: `[Support Ticket] ${subject}`,
			html: `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
			<div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
			<h1 style="color: #0369a1; font-size: 20px; margin: 0;">The Life of Physics — Support Request</h1>
			<p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">New inquiry submitted through the student portal</p>
			</div>

			<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
			<tr>
			<td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: bold; width: 120px;">Student Name:</td>
			<td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${escape(name)}</td>
			</tr>
			<tr>
			<td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: bold;">Student Email:</td>
			<td style="padding: 6px 0; color: #0369a1; font-size: 14px; font-family: monospace;">${escape(email)}</td>
			</tr>
			<tr>
			<td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: bold;">Subject:</td>
			<td style="padding: 6px 0; color: #0f172a; font-size: 14px;">${escape(subject)}</td>
			</tr>
			</table>

			<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
			<div style="color: #475569; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px;">Message Details:</div>
			<div style="color: #1e293b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escape(message)}</div>
			</div>

			<div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; color: #94a3b8; font-size: 12px;">
			The Life of Physics — Automated Dispatch System
			</div>
			</div>
			`,
		});

		if (emailResult.error) return new NextResponse('Email provider did not accept this request.', { status: 502 });
		// Save record in database
		try {
			await db.supportTicket.create({
				data: {
					userId,
					studentEmail: email,
					category: 'OTHER',
					message: `[${subject}] ${message}`,
				},
			});
		} catch (dbError) {
			console.error('[SUPPORT_TICKET_DB_SAVE_ERROR]', dbError);
		}

		return NextResponse.json({ success: true, emailId: emailResult.data?.id });
	} catch (error) {
		console.error('[SUPPORT_TICKET_POST_ERROR]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}

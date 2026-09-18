import { createServerFn } from "@tanstack/react-start";
import nodemailer, { type Transporter } from "nodemailer";
import { z } from "zod";

const emailInputSchema = z.object({
  to: z.string().email(),
  citizenName: z.string(),
  ticket: z.string(),
  title: z.string(),
  issueId: z.string().optional(),
  type: z.enum(["verified", "assigned", "in_progress", "resolved", "rejected", "needs_info", "custom"]),
  officerName: z.string().default("Municipal Operations Officer"),
  note: z.string().optional(),
  resolutionPhotoUrl: z.string().optional(),
  department: z.string().optional(),
});

export type EmailPayload = z.infer<typeof emailInputSchema>;

export const sendCitizenEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailInputSchema.parse(input))
  .handler(async ({ data }) => {
    const smtpHost = process.env["SMTP_HOST"] || "smtp.gmail.com";
    const smtpPort = Number(process.env["SMTP_PORT"] || 587);
    const smtpUser = process.env["SMTP_USER"];
    const smtpPass = process.env["SMTP_PASS"];
    const fromAddress = process.env["SMTP_FROM"] || `"CivicFlow Municipal Services" <noreply@civicflow.gov>`;

    // Fallback Ethereal test account if credentials are not explicitly set
    let transporter: Transporter;

    if (smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
    } else {
      // Create a simulated or test transporter for local preview
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const typeDetails: Record<EmailPayload["type"], { subject: string; badgeColor: string; title: string; desc: string }> = {
      verified: {
        subject: `[CivicFlow] Complaint Verified: ${data.ticket} - ${data.title}`,
        badgeColor: "#2563eb",
        title: "Complaint Verified by Municipal Officer",
        desc: "Your reported public infrastructure complaint has been inspected, validated by AI triage, and confirmed by the officer.",
      },
      assigned: {
        subject: `[CivicFlow] Field Crew Dispatched: ${data.ticket}`,
        badgeColor: "#d97706",
        title: "Assigned to Field Repair Unit",
        desc: `Your complaint has been assigned to the ${data.department || "Municipal Field Unit"} for on-site inspection and repair.`,
      },
      in_progress: {
        subject: `[CivicFlow] Repair In Progress: ${data.ticket}`,
        badgeColor: "#ea580c",
        title: "On-Site Repair Work Underway",
        desc: "Field repair operations are currently active at the reported site.",
      },
      resolved: {
        subject: `[CivicFlow] Issue Resolved: ${data.ticket} - ${data.title}`,
        badgeColor: "#16a34a",
        title: "Infrastructure Issue Successfully Resolved",
        desc: "The reported public infrastructure defect has been repaired and verified complete by the municipal field supervisor.",
      },
      rejected: {
        subject: `[CivicFlow] Complaint Update: ${data.ticket}`,
        badgeColor: "#dc2626",
        title: "Complaint Review Outcome",
        desc: "Your submission was reviewed by the department officer. Please see the officer notes below.",
      },
      needs_info: {
        subject: `[CivicFlow] Action Required: Additional Details Needed for ${data.ticket}`,
        badgeColor: "#9333ea",
        title: "Additional Information Requested",
        desc: "The municipal officer has requested additional details or clearer landmarks to proceed with on-site inspection.",
      },
      custom: {
        subject: `[CivicFlow] Operational Update: ${data.ticket}`,
        badgeColor: "#0284c7",
        title: "Municipal Operational Update",
        desc: "An update has been issued regarding your reported infrastructure ticket.",
      },
    };

    const details = typeDetails[data.type];

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; color: #f8fafc; padding: 24px; text-align: left; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; color: #ffffff; font-size: 12px; font-weight: 600; margin-top: 10px; text-transform: uppercase; background-color: ${details.badgeColor}; }
    .content { padding: 24px; }
    .ticket-box { background: #f1f5f9; border-left: 4px solid #0f172a; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; }
    .note-box { background: #fefce8; border: 1px solid #fef08a; padding: 14px; border-radius: 6px; margin: 16px 0; color: #713f12; font-size: 14px; }
    .photo-container { margin: 16px 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .photo-container img { width: 100%; max-height: 260px; object-fit: cover; display: block; }
    .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CivicFlow Municipal Services</h1>
      <span class="badge">${data.type.replace("_", " ")}</span>
    </div>
    <div class="content">
      <p>Dear <strong>${data.citizenName}</strong>,</p>
      <p>${details.desc}</p>
      
      <div class="ticket-box">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Ticket Reference</p>
        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #0f172a;">${data.ticket} ${data.issueId ? `<span style="font-size: 13px; color: #64748b;">(Linked Issue: ${data.issueId})</span>` : ""}</p>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #334155;">${data.title}</p>
      </div>

      ${data.note ? `
      <div class="note-box">
        <strong>Officer Note:</strong>
        <p style="margin: 4px 0 0 0;">"${data.note}"</p>
        <p style="margin: 6px 0 0 0; font-size: 12px; color: #854d0e;">— ${data.officerName}</p>
      </div>
      ` : ""}

      ${data.resolutionPhotoUrl ? `
      <div class="photo-container">
        <p style="margin: 8px 12px; font-size: 12px; font-weight: bold; color: #475569;">Verified Resolution Proof:</p>
        <img src="${data.resolutionPhotoUrl}" alt="Resolution Proof" />
      </div>
      ` : ""}

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        You can track the ongoing progress and officer logs of this ticket at any time on the CivicFlow Citizen Portal.
      </p>
    </div>
    <div class="footer">
      This is an automated notification from the Municipal Infrastructure Triage Division.
    </div>
  </div>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: data.to,
      subject: details.subject,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    };
  });

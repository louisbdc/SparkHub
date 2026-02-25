import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM ?? 'Sparkhub <notifications@sparkhub.fr>'

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(error.message)
}

export async function sendTicketAssignedEmail(
  to: string,
  assigneeName: string,
  ticketTitle: string,
  ticketUrl: string
): Promise<void> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://sparkhub.fr').replace(/\/$/, '')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ticket assigné</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#09090b;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${appUrl}/logo_sparkhub.png" width="32" height="32" alt="Sparkhub" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="font-size:15px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">Sparkhub</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#09090b;">
                Ticket assigné
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
                Bonjour <strong style="color:#09090b;">${assigneeName}</strong>,
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#3f3f46;line-height:1.7;">
                Le ticket suivant vient de vous être assigné :
              </p>

              <!-- Ticket card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.08em;">Ticket</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#09090b;">${ticketTitle}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#09090b;border-radius:10px;">
                    <a href="${ticketUrl}"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;
                              font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">
                      Voir le ticket →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a1a1aa;line-height:1.6;">
                Vous recevez cet email car vous êtes membre de <strong>Sparkhub</strong>.<br/>
                <a href="${appUrl}" style="color:#71717a;text-decoration:none;">sparkhub.fr</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    await sendEmail(to, `Ticket assigné : "${ticketTitle}"`, html)
  } catch (err) {
    console.error('[email] sendTicketAssignedEmail failed:', err)
    // Ne pas bloquer la réponse API si l'email échoue
  }
}

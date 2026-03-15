
'use server';

import nodemailer from 'nodemailer';

/**
 * Envia un correo electrónico de notificación de restablecimiento utilizando el diseño HTML profesional.
 * Nota: El enlace real de Firebase se envía por separado a través de los servidores de Google.
 * Esta acción sirve para dar un aviso profesional adicional si se desea.
 */
export async function sendResetNotificationAction(to: string, userName: string) {
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Restablecimiento de acceso solicitado</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f6fb; font-family: Arial, Helvetica, sans-serif;">

<table align="center" width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" style="background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.05);">

<tr>
<td style="background:linear-gradient(135deg,#7b4dff,#2f80ed); padding:25px; text-align:center; color:white;">
<h1 style="margin:0; font-size:26px;">ZYRA</h1>
<p style="margin:5px 0 0 0; font-size:14px; opacity:0.9;">Sistema de Gestión</p>
</td>
</tr>

<tr>
<td style="padding:35px; color:#333; line-height:1.6;">

<p>Hola <strong>${userName}</strong>,</p>

<p>
Hemos recibido una solicitud para restablecer la contraseña de acceso a su cuenta en <strong>ZYRA</strong>.
</p>

<p>
Por seguridad y cumplimiento de protocolos, se ha disparado un <strong>enlace oficial de recuperación</strong> a esta misma dirección de correo.
</p>

<div style="background:#f2f4ff; border-left:4px solid #2f80ed; padding:15px; margin:20px 0; font-size:14px; text-align:center;">
Busque en su bandeja de entrada (o SPAM) un correo enviado por <strong>Firebase/Google</strong> con el asunto "Reset your password".
</div>

<p>
Haga clic en el enlace incluido en ese mensaje oficial para configurar su nueva clave privada. Una vez dentro, le recomendamos verificar sus datos desde la sección de <strong>perfil</strong>.
</p>

<p style="margin-top:30px;">
Si usted <strong>no solicitó este cambio</strong>, le recomendamos contactar con el administrador del sistema inmediatamente.
</p>

<p style="margin-top:40px;">
Atentamente,<br>
<strong>Administración del Sistema</strong><br>
ZYRA Command
</p>

</td>
</tr>

<tr>
<td style="background:#f4f6fb; text-align:center; padding:15px; font-size:12px; color:#888;">
© 2026 ZYRA Command — Todos los derechos reservados
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"ZYRA Command" <${process.env.SMTP_USER || 'admin@zyra.com'}>`,
      to: to,
      subject: "Restablecimiento de contraseña solicitado - ZYRA Command",
      html: htmlTemplate,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error enviando email via SMTP:", error);
    return { 
      success: false, 
      error: error.message || "Error de configuración SMTP" 
    };
  }
}

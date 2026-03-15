'use server';

import nodemailer from 'nodemailer';

/**
 * Envia un correo electrónico de restablecimiento de contraseña utilizando el diseño HTML profesional.
 * Requiere configuración de variables de entorno SMTP para funcionar en producción.
 */
export async function sendResetEmailAction(to: string, userName: string, tempPassword: string) {
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Restablecimiento de contraseña</title>
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
Por seguridad, se ha generado la siguiente <strong>contraseña temporal</strong>:
</p>

<div style="background:#f2f4ff; border-left:4px solid #2f80ed; padding:15px; margin:20px 0; font-size:18px; font-weight:bold; text-align:center; letter-spacing:2px;">
${tempPassword}
</div>

<p>
Utilice esta contraseña para iniciar sesión en la plataforma. Una vez dentro, le recomendamos cambiarla inmediatamente desde la sección de <strong>perfil</strong>.
</p>

<p>
Si también recibió un correo automático de Firebase, puede utilizar el enlace de restablecimiento incluido en ese mensaje como método alternativo.
</p>

<p style="margin-top:30px;">
Si usted <strong>no solicitó este cambio</strong>, le recomendamos contactar con el administrador del sistema.
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
    // Configuración de transporte (utiliza variables de entorno o valores por defecto)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verificación rápida de conexión (opcional)
    // await transporter.verify();

    await transporter.sendMail({
      from: `"ZYRA Command" <${process.env.SMTP_USER || 'admin@zyra.com'}>`,
      to: to,
      subject: "Restablecimiento de contraseña - ZYRA Command",
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

"""
Email Service — uses Python's built-in smtplib with Gmail SMTP.
No extra pip packages required.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an HTML email via Gmail SMTP. Returns True on success."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[EmailService] Failed to send email to {to_email}: {e}")
        return False


def _html_template(heading: str, body_html: str, button_url: str = None, button_label: str = None) -> str:
    button_section = ""
    if button_url and button_label:
        button_section = f"""
        <div style="text-align:center;margin:32px 0;">
          <a href="{button_url}"
             style="background:#0d9488;color:#fff;padding:14px 32px;
                    border-radius:8px;text-decoration:none;font-weight:600;
                    font-size:15px;display:inline-block;">
            {button_label}
          </a>
        </div>
        <p style="text-align:center;font-size:12px;color:#6b7280;margin-top:8px;">
          Or copy this link: <a href="{button_url}" style="color:#0d9488;word-break:break-all;">{button_url}</a>
        </p>"""

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;
              box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#134e4a,#0d9488);padding:32px;text-align:center;">
      <span style="font-size:36px;">🎓</span>
      <h1 style="color:#fff;margin:8px 0 0;font-size:22px;letter-spacing:0.5px;">ExamBuddy</h1>
    </div>
    <!-- Body -->
    <div style="padding:32px 40px;">
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">{heading}</h2>
      {body_html}
      {button_section}
    </div>
    <!-- Footer -->
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">
        © 2025 ExamBuddy. If you did not request this, please ignore this email.
      </p>
    </div>
  </div>
</body>
</html>"""


def send_password_reset_email(to_email: str, reset_token: str, user_name: str = None) -> bool:
    """Send a password reset link to the user's email."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    name = user_name or "there"
    body = f"""
    <p style="color:#374151;line-height:1.6;">Hi {name},</p>
    <p style="color:#374151;line-height:1.6;">
      We received a request to reset the password for your ExamBuddy account.
      Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.
    </p>"""
    html = _html_template(
        heading="Reset Your Password",
        body_html=body,
        button_url=reset_url,
        button_label="Reset Password"
    )
    return _send_email(to_email, "Reset your ExamBuddy password", html)


def send_password_set_notification(to_email: str, user_name: str = None) -> bool:
    """Notify user that they have successfully set a password."""
    name = user_name or "there"
    body = f"""
    <p style="color:#374151;line-height:1.6;">Hi {name},</p>
    <p style="color:#374151;line-height:1.6;">
      You have successfully set a password for your ExamBuddy account.
      You can now log in using either your Google account or your email and this new password.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="color:#166534;margin:0;font-size:14px;">
        ✅ Password set successfully. Your account is more secure now!
      </p>
    </div>"""
    html = _html_template(heading="Password Set Successfully", body_html=body)
    return _send_email(to_email, "Your ExamBuddy password has been set", html)


def send_password_changed_notification(to_email: str, user_name: str = None) -> bool:
    """Notify user that their password was changed."""
    name = user_name or "there"
    body = f"""
    <p style="color:#374151;line-height:1.6;">Hi {name},</p>
    <p style="color:#374151;line-height:1.6;">
      Your ExamBuddy password has been changed successfully.
    </p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="color:#9a3412;margin:0;font-size:14px;">
        ⚠️ If you did not make this change, please contact support immediately.
      </p>
    </div>"""
    html = _html_template(heading="Password Changed", body_html=body)
    return _send_email(to_email, "Your ExamBuddy password was changed", html)

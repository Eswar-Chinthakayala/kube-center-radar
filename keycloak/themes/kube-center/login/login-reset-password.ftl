<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true displayMessage=!messagesPerField.existsError('username'); section>

  <#if section = "header">
    Reset password

  <#elseif section = "form">
    <h1 style="font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.4px;margin-bottom:6px;">Forgot your password?</h1>
    <p style="font-size:13px;color:#6b7280;margin-bottom:24px;">Enter your email and we'll send you a reset link.</p>

    <form id="kc-reset-password-form" action="${url.loginAction}" method="post">
      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:12px;font-weight:500;color:#6b7280;margin-bottom:6px;">Work email</label>
        <input type="email" id="username" name="username" autofocus
          value="${(auth.attemptedUsername!'')}"
          placeholder="you@company.com"
          style="width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:8px;color:#111827;font-size:14px;padding:11px 14px;outline:none;box-sizing:border-box;"
          onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 0 3px rgba(16,185,129,0.12)'"
          onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'"/>
        <#if messagesPerField.existsError('username')>
          <div style="color:#ef4444;font-size:12px;margin-top:6px;">${kcSanitize(messagesPerField.get('username'))?no_esc}</div>
        </#if>
      </div>

      <input type="submit" value="Send reset link"
        style="width:100%;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;padding:12px;cursor:pointer;margin-bottom:16px;"
        onmouseover="this.style.background='#059669'"
        onmouseout="this.style.background='#10b981'"/>

      <div style="text-align:center;font-size:13px;color:#6b7280;">
        <a href="${url.loginUrl}" style="color:#10b981;font-weight:500;">← Back to sign in</a>
      </div>
    </form>

  <#elseif section = "info">
    <div style="margin-top:20px;padding:14px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:13px;color:#065f46;line-height:1.5;">
      If an account with that email exists, you'll receive a reset link shortly. Check your spam folder too.
    </div>
  </#if>

</@layout.registrationLayout>

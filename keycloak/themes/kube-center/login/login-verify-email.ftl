<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>

  <#if section = "header">
    Verify email

  <#elseif section = "form">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;background:#d1fae5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:#111827;margin-bottom:8px;">Check your email</h1>
      <p style="font-size:14px;color:#6b7280;line-height:1.5;margin-bottom:4px;">We sent a verification link to</p>
      <p style="font-size:14px;font-weight:600;color:#111827;margin-bottom:20px;">${(user.email!'your email')}</p>
      <p style="font-size:13px;color:#6b7280;line-height:1.5;">
        Click the link in the email to activate your account.<br/>
        Didn't get it? Check your spam folder or
        <a href="${url.loginAction}" style="color:#10b981;font-weight:500;">resend the email</a>.
      </p>
    </div>

    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;">
      <a href="${url.loginUrl}" style="font-size:13px;color:#6b7280;text-decoration:none;">
        &larr; Back to sign in
      </a>
    </div>
  </#if>

</@layout.registrationLayout>

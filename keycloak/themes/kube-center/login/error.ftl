<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
  <#if section = "header">
    Error
  <#elseif section = "form">
    <div style="text-align:center;padding:24px 0;">
      <div style="width:56px;height:56px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:#111827;margin-bottom:8px;">Something went wrong</h1>
      <p style="font-size:13px;color:#6b7280;margin-bottom:28px;line-height:1.6;">
        <#if message??>${kcSanitize(message.summary)?no_esc}</#if>
      </p>
      <#if client?? && client.baseUrl?has_content>
        <a href="${client.baseUrl}" style="display:inline-block;width:100%;background:#10b981;color:#fff;border-radius:8px;font-size:14px;font-weight:600;padding:12px;text-align:center;text-decoration:none;box-sizing:border-box;">
          Back to application
        </a>
      <#else>
        <a href="${url.loginUrl}" style="display:inline-block;width:100%;background:#10b981;color:#fff;border-radius:8px;font-size:14px;font-weight:600;padding:12px;text-align:center;text-decoration:none;box-sizing:border-box;">
          Back to sign in
        </a>
      </#if>
    </div>
  </#if>
</@layout.registrationLayout>

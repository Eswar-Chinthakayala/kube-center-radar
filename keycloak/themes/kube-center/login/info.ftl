<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
  <#if section = "header">
    <#if messageHeader?? && messageHeader?has_content>${messageHeader}<#else>Info</#if>
  <#elseif section = "form">
    <#assign summary = message.summary!''>
    <#assign isLogout = summary?lower_case?contains("logged out")>
    <div style="text-align:center;padding:24px 0;">
      <div style="width:56px;height:56px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <#if isLogout>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          <#else>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </#if>
        </svg>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:#111827;margin-bottom:8px;">
        <#if isLogout>You've been signed out<#elseif messageHeader?? && messageHeader?has_content>${messageHeader}<#else>Done</#if>
      </h1>
      <p style="font-size:13px;color:#6b7280;margin-bottom:28px;line-height:1.6;">
        <#if isLogout>Your session has ended. Sign in again to continue.<#else>${kcSanitize(summary)?no_esc}</#if>
      </p>
      <a href="${url.loginUrl}" style="display:inline-block;width:100%;background:#10b981;color:#fff;border-radius:8px;font-size:14px;font-weight:600;padding:12px;text-align:center;text-decoration:none;box-sizing:border-box;">
        <#if isLogout>Sign in again<#else>Back to sign in</#if>
      </a>
    </div>
  </#if>
</@layout.registrationLayout>

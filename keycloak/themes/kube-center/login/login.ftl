<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>

  <#if section = "header">
    Sign in

  <#elseif section = "form">
    <h1 style="font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.4px;margin-bottom:6px;">Welcome back</h1>
    <p style="font-size:13px;color:#6b7280;margin-bottom:28px;">Enter your work email to continue</p>

    <#if realm.password>
      <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">

        <#if !usernameHidden??>
          <div style="margin-bottom:20px;">
            <label for="username" style="display:block;font-size:12px;font-weight:500;color:#6b7280;margin-bottom:6px;">Work email</label>
            <input
              id="username" name="username" type="email" autofocus autocomplete="email"
              placeholder="you@company.com" value="${(login.username!'')}"
              style="width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:8px;color:#111827;font-size:14px;padding:11px 14px;outline:none;box-sizing:border-box;"
              onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 0 3px rgba(16,185,129,0.12)'"
              onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'"/>
            <#if messagesPerField.existsError('username','password')>
              <div style="color:#ef4444;font-size:12px;margin-top:4px;">${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}</div>
            </#if>
          </div>
        </#if>

        <input id="login" name="login" type="submit" value="Continue"
          style="width:100%;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;padding:12px;cursor:pointer;"
          onmouseover="this.style.background='#059669'"
          onmouseout="this.style.background='#10b981'"/>

      </form>
    </#if>

  <#elseif section = "info">
    <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
      <div style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">
        Don't have an account? <a href="${url.registrationUrl}" style="color:#10b981;font-weight:500;">Sign up</a>
      </div>
    </#if>
  </#if>

</@layout.registrationLayout>

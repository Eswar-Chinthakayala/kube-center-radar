<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('password'); section>

  <#if section = "header">
    Sign in

  <#elseif section = "form">
    <h1 style="font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.4px;margin-bottom:6px;">Welcome back</h1>
    <p style="font-size:13px;color:#6b7280;margin-bottom:24px;">
      Signing in as <strong style="color:#111827;">${(auth.attemptedUsername!'')}</strong>
    </p>

    <form id="kc-form-login" action="${url.loginAction}" method="post">
      <input type="hidden" id="username" name="username" value="${(auth.attemptedUsername!'')}" />

      <div style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <label style="font-size:12px;font-weight:500;color:#6b7280;">Password</label>
          <#if realm.resetPasswordAllowed>
            <a href="${url.loginResetCredentialsUrl}" style="font-size:12px;color:#10b981;text-decoration:none;">Forgot password?</a>
          </#if>
        </div>
        <input
          id="password" name="password" type="password"
          autofocus autocomplete="current-password"
          placeholder="••••••••"
          style="width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:8px;color:#111827;font-size:14px;padding:11px 14px;outline:none;box-sizing:border-box;"
          onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 0 3px rgba(16,185,129,0.12)'"
          onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'"/>
        <#if messagesPerField.existsError('password')>
          <div style="color:#ef4444;font-size:12px;margin-top:6px;">${kcSanitize(messagesPerField.get('password'))?no_esc}</div>
        </#if>
      </div>

      <input type="submit" id="kc-login" name="login" value="Sign in"
        style="width:100%;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;padding:12px;cursor:pointer;"
        onmouseover="this.style.background='#059669'"
        onmouseout="this.style.background='#10b981'"/>

      <div style="text-align:center;margin-top:16px;font-size:13px;color:#6b7280;">
        Not you? <a href="${url.loginRestartFlowUrl}" style="color:#10b981;font-weight:500;">Use a different account</a>
      </div>
    </form>
  </#if>

</@layout.registrationLayout>

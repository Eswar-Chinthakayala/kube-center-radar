<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm'); section>

  <#if section = "header">
    Create account

  <#elseif section = "form">
    <h1 style="font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.4px;margin-bottom:6px;">Create your account</h1>
    <p style="font-size:13px;color:#6b7280;margin-bottom:24px;">Join Kube Center to manage your Kubernetes clusters.</p>

    <form id="kc-register-form" action="${url.registrationAction}" method="post">

      <#if realm.registrationEmailAsUsername>
        <input type="hidden" name="firstName" value=""/>
        <input type="hidden" name="lastName" value=""/>
      </#if>

      <#if !realm.registrationEmailAsUsername>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:500;color:#6b7280;margin-bottom:6px;">First name</label>
            <input type="text" id="firstName" name="firstName" value="${(register.formData.firstName!'')}"
              autocomplete="given-name" placeholder="Jane"
              style="width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:8px;color:#111827;font-size:14px;padding:11px 14px;outline:none;box-sizing:border-box;"
              onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 0 3px rgba(16,185,129,0.12)'"
              onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'"/>
            <#if messagesPerField.existsError('firstName')>
              <div style="color:#ef4444;font-size:12px;margin-top:4px;">${kcSanitize(messagesPerField.get('firstName'))?no_esc}</div>
            </#if>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:500;color:#6b7280;margin-bottom:6px;">Last name</label>
            <input type="text" id="lastName" name="lastName" value="${(register.formData.lastName!'')}"
              autocomplete="family-name" placeholder="Smith"
              style="width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:8px;color:#111827;font-size:14px;padding:11px 14px;outline:none;box-sizing:border-box;"
              onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 0 3px rgba(16,185,129,0.12)'"
              onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'"/>
            <#if messagesPerField.existsError('lastName')>
              <div style="color:#ef4444;font-size:12px;margin-top:4px;">${kcSanitize(messagesPerField.get('lastName'))?no_esc}</div>
            </#if>
          </div>
        </div>
      </#if>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:12px;font-weight:500;color:#6b7280;margin-bottom:6px;">Work email</label>
        <input type="email" id="email" name="email" value="${(register.formData.email!'')}"
          autocomplete="email" placeholder="you@company.com"
          style="width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:8px;color:#111827;font-size:14px;padding:11px 14px;outline:none;box-sizing:border-box;"
          onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 0 3px rgba(16,185,129,0.12)'"
          onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'"/>
        <#if messagesPerField.existsError('email')>
          <div style="color:#ef4444;font-size:12px;margin-top:4px;">${kcSanitize(messagesPerField.get('email'))?no_esc}</div>
        </#if>
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:12px;font-weight:500;color:#6b7280;margin-bottom:6px;">Password</label>
        <input type="password" id="password" name="password"
          autocomplete="new-password" placeholder="••••••••"
          style="width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:8px;color:#111827;font-size:14px;padding:11px 14px;outline:none;box-sizing:border-box;"
          onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 0 3px rgba(16,185,129,0.12)'"
          onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'"/>
        <#if messagesPerField.existsError('password')>
          <div style="color:#ef4444;font-size:12px;margin-top:4px;">${kcSanitize(messagesPerField.get('password'))?no_esc}</div>
        </#if>
      </div>

      <div style="margin-bottom:24px;">
        <label style="display:block;font-size:12px;font-weight:500;color:#6b7280;margin-bottom:6px;">Confirm password</label>
        <input type="password" id="password-confirm" name="password-confirm"
          autocomplete="new-password" placeholder="••••••••"
          style="width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:8px;color:#111827;font-size:14px;padding:11px 14px;outline:none;box-sizing:border-box;"
          onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 0 3px rgba(16,185,129,0.12)'"
          onblur="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'"/>
        <#if messagesPerField.existsError('password-confirm')>
          <div style="color:#ef4444;font-size:12px;margin-top:4px;">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</div>
        </#if>
      </div>

      <input type="submit" value="Create account"
        style="width:100%;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;padding:12px;cursor:pointer;"
        onmouseover="this.style.background='#059669'"
        onmouseout="this.style.background='#10b981'"/>

      <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">
        Already have an account? <a href="${url.loginUrl}" style="color:#10b981;font-weight:500;">Sign in</a>
      </div>

    </form>
  </#if>

</@layout.registrationLayout>

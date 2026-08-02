<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("loginTitle",(realm.displayName!''))}</title>
  <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" type="image/x-icon"/>
  <link rel="stylesheet" href="${url.resourcesPath}/css/kube-center.css"/>
  <#if properties.scripts?has_content>
    <#list properties.scripts?split(' ') as script>
      <script src="${url.resourcesPath}/${script}" defer></script>
    </#list>
  </#if>
</head>
<body class="${bodyClass}">

<div class="kc-split-layout">

  <!-- ── Left panel: marketing ─────────────────────────────────────────── -->
  <div class="kc-split-left">
    <div class="kc-split-left-inner">
      <div class="kc-brand">
        <div class="kc-logo-mark">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
            <path d="M2 12h20"/>
          </svg>
        </div>
        <span class="kc-brand-name">Kube Center</span>
      </div>

      <div class="kc-hero">
        <h1>The Kubernetes platform your team will actually use.</h1>
        <p>Visibility, access control, and GitOps workflows — all in one place. No YAML expertise required.</p>
      </div>

      <ul class="kc-features">
        <li>
          <span class="kc-feature-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </span>
          <span>Real-time cluster topology &amp; resource browser</span>
        </li>
        <li>
          <span class="kc-feature-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          <span>Role-based access — viewer, member, admin</span>
        </li>
        <li>
          <span class="kc-feature-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
          </span>
          <span>GitOps with Argo CD &amp; Flux built in</span>
        </li>
        <li>
          <span class="kc-feature-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          </span>
          <span>Multi-cluster, multi-team project isolation</span>
        </li>
      </ul>
    </div>
  </div>

  <!-- ── Right panel: auth form ────────────────────────────────────────── -->
  <div class="kc-split-right">
    <div class="kc-split-right-inner">

      <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <div class="alert alert-${message.type}">
          <#if message.type = 'success'><span class="alert-icon">✓</span></#if>
          <#if message.type = 'warning'><span class="alert-icon">⚠</span></#if>
          <#if message.type = 'error'><span class="alert-icon">✕</span></#if>
          <#if message.type = 'info'><span class="alert-icon">ℹ</span></#if>
          ${kcSanitize(message.summary)?no_esc}
        </div>
      </#if>

      <span style="display:none"><#nested "header"></span>
      <#nested "form">

      <#if displayInfo>
        <div id="kc-info">
          <div id="kc-info-wrapper">
            <#nested "info">
          </div>
        </div>
      </#if>

    </div>
  </div>

</div>

</body>
</html>
</#macro>

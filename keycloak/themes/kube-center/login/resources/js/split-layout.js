(function() {
  function initLayout() {
    if (document.querySelector('.kc-split-left')) return; // Already initialized

    // Create the left marketing pane
    // Get the base resource path dynamically from our own script tag
    const scriptTag = document.querySelector('script[src*="split-layout.js"]');
    const resourcePath = scriptTag ? scriptTag.src.split('/js/split-layout.js')[0] : '';
    
    // Create the left marketing pane
    const leftPane = document.createElement('div');
    leftPane.className = 'kc-split-left';
    
    leftPane.innerHTML = `
      <div class="kc-marketing-content" style="display: flex; flex-direction: column; gap: 32px; align-items: flex-start; max-width: 600px;">
        <div class="kc-marketing-text">
          <h1>Kube Center Platform.</h1>
          <p style="font-size: 18px; line-height: 1.6; margin-bottom: 24px;">Accelerate your cloud-native journey with our unified enterprise platform. Seamlessly manage clusters, deployments, and security policies from a single pane of glass.</p>
          
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px;">
            <li style="display: flex; align-items: center; gap: 12px; font-size: 16px; font-weight: 500;">
              <span style="background: rgba(255,255,255,0.2); padding: 6px; border-radius: 8px;">🚀</span>
              Automated GitOps CI/CD Pipelines
            </li>
            <li style="display: flex; align-items: center; gap: 12px; font-size: 16px; font-weight: 500;">
              <span style="background: rgba(255,255,255,0.2); padding: 6px; border-radius: 8px;">🛡️</span>
              Zero-Trust Security & RBAC
            </li>
            <li style="display: flex; align-items: center; gap: 12px; font-size: 16px; font-weight: 500;">
              <span style="background: rgba(255,255,255,0.2); padding: 6px; border-radius: 8px;">💰</span>
              AI-Driven Cost Optimization
            </li>
          </ul>
        </div>
      </div>
    `;
    
    // Prepend left pane to body
    document.body.classList.add('kc-split-layout');
    document.body.insertBefore(leftPane, document.body.firstChild);
    
    // Create right pane
    const rightPane = document.createElement('div');
    rightPane.className = 'kc-split-right';
    
    // Move all existing children (except leftPane) into rightPane
    const children = Array.from(document.body.children);
    for (let child of children) {
      if (child !== leftPane) {
        rightPane.appendChild(child);
      }
    }
    
    // Append right pane to body
    document.body.appendChild(rightPane);
  }

  if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", initLayout);
  } else {
    initLayout();
  }
})();

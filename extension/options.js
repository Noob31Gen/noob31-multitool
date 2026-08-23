// MultiTools Extension Options & Domain Filter Logic
// Domain-Salted SHA-256 Hashing and Outbound Whitelist Management

const DOMAIN_SALT = 'tools.noob31.com:salt:v1:';

const BUILTIN_DOMAINS = [
  'dns.google',
  'cloudflare-dns.com',
  'dns.alidns.com',
  'dns.adguard-dns.com',
  'dns.quad9.net',
  'doh.opendns.com',
  'data.iana.org',
  'crt.name',
  'crt.sh',
  'api.certspotter.com',
  'api.mnemonic.no',
  'api.hackertarget.com',
  'rapiddns.io',
  'otx.alienvault.com',
  'urlscan.io',
  'rdap.org',
  'rdap.arin.net',
  'rdap.db.ripe.net',
  'stat.ripe.net',
  'rdap.apnic.net',
  'rdap.lacnic.net',
  'rdap.afrinic.net',
  'who-dat.as93.net',
  'api.ipapi.is',
  'ipwhois.app',
  'ip-api.com',
  'freeipapi.com',
  'ip.guide',
  'api.iplocation.net',
  'ip2c.org',
  'wtfismyip.com',
  'peeringdb.com',
  'www.peeringdb.com',
  'ipapi.co',
  'api.bgpview.io',
  'internetdb.shodan.io',
  'cvedb.shodan.io',
  'geonet.shodan.io',
  'entitydb.shodan.io',
  'cve.circl.lu',
  'api.osv.dev',
  'www.cisa.gov',
  'api.blocklist.de',
  'api.stopforumspam.org',
  'stopforumspam.com',
  'sitecheck.sucuri.net',
  'autocomplete.clearbit.com',
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'data.sec.gov',
  'api.troubleshooting.tools',
  'www.macvendorlookup.com',
  'api.maclookup.app',
  'api.macvendors.com'
];

async function sha256Hex(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(DOMAIN_SALT + str);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const statusBox = document.getElementById('statusBox');
  const statusText = document.getElementById('statusText');
  const authForm = document.getElementById('authForm');
  const passwordInput = document.getElementById('passwordInput');
  const clearBtn = document.getElementById('clearBtn');
  const hashPreview = document.getElementById('hashPreview');
  const domainCountBadge = document.getElementById('domainCountBadge');
  const allowAllToggle = document.getElementById('allowAllToggle');
  const customDomainInput = document.getElementById('customDomainInput');
  const addDomainBtn = document.getElementById('addDomainBtn');
  const domainList = document.getElementById('domainList');

  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPane = document.getElementById(targetTab);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  function updateStatusUI(hash, customDomains = [], allowAll = false) {
    const totalCount = BUILTIN_DOMAINS.length + customDomains.length;
    if (hash) {
      statusBox.className = 'status-card configured';
      statusText.textContent = 'Salted Password Hash Active';
      hashPreview.textContent = `Salted SHA-256: ${hash.substring(0, 16)}...${hash.substring(48)}`;
    } else {
      statusBox.className = 'status-card unconfigured';
      statusText.textContent = 'Password Hash Not Configured';
      hashPreview.textContent = '';
    }

    if (allowAll) {
      domainCountBadge.textContent = 'All Targets Permitted';
      domainCountBadge.style.background = 'rgba(245, 158, 11, 0.15)';
      domainCountBadge.style.color = '#f59e0b';
    } else {
      domainCountBadge.textContent = `${totalCount} Sources Active`;
      domainCountBadge.style.background = 'rgba(59, 130, 246, 0.1)';
      domainCountBadge.style.color = '#3b82f6';
    }

    renderDomainList(customDomains);
  }

  function renderDomainList(customDomains) {
    domainList.innerHTML = '';

    // Render custom domains first with delete button
    customDomains.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'domain-item';
      item.innerHTML = `
        <span style="color: #60a5fa; font-weight: 600;">${domain}</span>
        <button type="button" data-del="${domain}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 11px; padding: 0 4px;">✕</button>
      `;
      domainList.appendChild(item);
    });

    // Render built-in domains
    BUILTIN_DOMAINS.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'domain-item';
      item.innerHTML = `
        <span>${domain}</span>
        <span class="domain-tag">built-in</span>
      `;
      domainList.appendChild(item);
    });

    // Attach delete listeners
    domainList.querySelectorAll('button[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const domainToDelete = btn.getAttribute('data-del');
        chrome.storage.local.get(['custom_allowed_domains'], (res) => {
          const current = (res.custom_allowed_domains || []).filter(d => d !== domainToDelete);
          chrome.storage.local.set({ custom_allowed_domains: current }, () => {
            chrome.storage.local.get(['extension_auth_hash', 'allow_all_targets'], (state) => {
              updateStatusUI(state.extension_auth_hash, current, state.allow_all_targets);
            });
          });
        });
      });
    });
  }

  // Load existing state
  chrome.storage.local.get(['extension_auth_hash', 'custom_allowed_domains', 'allow_all_targets'], (res) => {
    allowAllToggle.checked = !!res.allow_all_targets;
    updateStatusUI(res.extension_auth_hash, res.custom_allowed_domains || [], res.allow_all_targets);
  });

  // Handle password save
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passwordInput.value.trim();
    if (!password) return;

    const hash = await sha256Hex(password);
    chrome.storage.local.set({ extension_auth_hash: hash }, () => {
      chrome.storage.local.get(['custom_allowed_domains', 'allow_all_targets'], (state) => {
        updateStatusUI(hash, state.custom_allowed_domains || [], state.allow_all_targets);
      });
      passwordInput.value = '';
    });
  });

  // Handle clear auth
  clearBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['extension_auth_hash'], () => {
      chrome.storage.local.get(['custom_allowed_domains', 'allow_all_targets'], (state) => {
        updateStatusUI(null, state.custom_allowed_domains || [], state.allow_all_targets);
      });
      passwordInput.value = '';
    });
  });

  // Handle allowAll toggle
  allowAllToggle.addEventListener('change', () => {
    const isAllowAll = allowAllToggle.checked;
    chrome.storage.local.set({ allow_all_targets: isAllowAll }, () => {
      chrome.storage.local.get(['extension_auth_hash', 'custom_allowed_domains'], (state) => {
        updateStatusUI(state.extension_auth_hash, state.custom_allowed_domains || [], isAllowAll);
      });
    });
  });

  // Handle add custom domain
  addDomainBtn.addEventListener('click', () => {
    const val = customDomainInput.value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!val) return;

    chrome.storage.local.get(['custom_allowed_domains', 'extension_auth_hash', 'allow_all_targets'], (res) => {
      const existing = res.custom_allowed_domains || [];
      if (!existing.includes(val) && !BUILTIN_DOMAINS.includes(val)) {
        const updated = [...existing, val];
        chrome.storage.local.set({ custom_allowed_domains: updated }, () => {
          updateStatusUI(res.extension_auth_hash, updated, res.allow_all_targets);
          customDomainInput.value = '';
        });
      } else {
        customDomainInput.value = '';
      }
    });
  });
});

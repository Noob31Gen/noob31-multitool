# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: threatIntel.spec.ts >> Threat Intelligence Explorer End-to-End Tests >> should handle file hash query detection and render details tabs
- Location: tests\threatIntel.spec.ts:45:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button[role=\'tab\'][value=\'malwarebazaar\']')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('button[role=\'tab\'][value=\'malwarebazaar\']')

```

```yaml
- banner:
  - button "All Tools"
  - link "Noob31":
    - /url: /
    - img "Noob31"
  - searchbox
  - text: "MultiTool: Enter a domain, IP, URL, or Email..."
  - button "Lookup"
  - switch [checked]
  - button "Toggle theme"
  - button "Settings"
- main:
  - heading "Threat Intelligence Explorer" [level=1]
  - paragraph: Aggregated real-time unauthenticated feeds lookup for IOCs (Indicators of Compromise).
  - textbox "Domain, IP, URL, File Hash (MD5/SHA), or keyword...": e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - button "Search Threat Intel"
  - text: "Input Detection: File Hash (MD5/SHA) Target Indicator File Hash (MD5/SHA)"
  - heading "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" [level=2]
  - text: Aggregated Risk Assessment MALICIOUS / HIGH RISK Query Time 4299 ms
  - button "Copy Results"
  - button "Export JSON"
  - heading "External Threat Portals" [level=3]
  - paragraph: "Deep link search redirects to professional assessment suites:"
  - button "VirusTotal Hash"
  - button "AlienVault OTX"
  - button "MalwareBazaar Details"
  - button "ThreatMiner Hash"
  - tablist:
    - tab "AlienVault OTX (50)" [selected]
    - tab "ThreatMiner (0)"
    - tab "URLScan.io (0)"
    - tab "MalwareBazaar"
  - tabpanel "AlienVault OTX (50)":
    - text: OTX Security Pulses Active threat advisory reports associated with this indicator in AlienVault OTX. Matched active security threat advisories. Keep in mind unauthenticated rate limits apply.
    - link "Honeypot Data – T-Pot - Sydney, Australia - May 2026":
      - /url: https://otx.alienvault.com/pulse/69f4022bbc9f2eb63058f951
    - text: 5/1/2026 • OTX Contributor
    - paragraph: "Rolling monthly view for May 2026 of indicators observed by T-Pot CE honeypots. Each run looks back the last 24h and appends newly seen indicators for this month. Signals are deduped and filtered (min event count threshold; private IPs excluded). Intended for defensive use; infrastructure may be compromised or spoofed. Sensor: T-Pot CE. Location: Sydney, Australia."
    - text: tpot honeypot sensor-tagged cowrie suricata dionaea honeytrap p0f
    - link "Honeypot Data – T-Pot - Sydney, Australia - June 2026":
      - /url: https://otx.alienvault.com/pulse/6a1cd294fcfdf46842616af3
    - text: 6/1/2026 • OTX Contributor
    - paragraph: "Rolling monthly view for June 2026 of indicators observed by T-Pot CE honeypots. Each run looks back the last 24h and appends newly seen indicators for this month. Signals are deduped and filtered (min event count threshold; private IPs excluded). Intended for defensive use; infrastructure may be compromised or spoofed. Sensor: T-Pot CE. Location: Sydney, Australia."
    - text: tpot honeypot sensor-tagged cowrie suricata dionaea honeytrap p0f
    - 'link "The 777 Quartz Loop: Structural Polyglot Forgery & Global Wiper Convergence"':
      - /url: https://otx.alienvault.com/pulse/6a01d3836a1a757aded89ba4
    - text: 5/11/2026 • OTX Contributor
    - paragraph: "Malicious C2 is hidden in plain sight. Using webcontent.com (Reg. 1998), the factory mimics legitimate com.apple.WebKit.WebContent traffic. This is the permanent \"static\" that makes the Wiper indistinguishable from OS noise.C2 Anchors: ://webcontent.com, ://webcontent.comIP Nodes: 35.208.49.255, 18.208.88.157, 98.84.224.111, 3.33.251.168The \"Rose Quartz\" Structural MixA \"Frankensign\" universal bypass. It \"United\" three OS trust boundaries into a single loop:DigiCert (Windows): Forged overlay using the broken MD5 a1d6...6e72.Apple ARM (macOS): 64c/d or B0 thumbprints pivoting through WebKit/QuartzCore.Google (Drop): Execution via a Google 202 shell (GoogleUpdate.exe).The 777 AnchorThe 777 entropy pattern is the mathematical anchor forcing this messy alignment. It cannot be \"fixed\" by revocation because it is already cached in the internet's trust model."
    - text: status creation date date pulse indicator url analysis passive dns urls files
    - link "*Dormant Destruction* VirusTotal report for index.html":
      - /url: https://otx.alienvault.com/pulse/6a0050a164795207832b4331
    - text: 5/10/2026 • OTX Contributor
    - paragraph: This threat intelligence pulse tracks a long-dormant wiper, dating back to the early 2000s, which has persisted across multiple environments undetected. The malware features sophisticated, "hidden" destructive mechanisms capable of widespread data wiping. It appears to leverage administrative-level access, allowing it to move laterally and compromise systems extensively. Continued inaction regarding this infection chain poses a critical risk to data integrity. The ONLY way to fix this as it has taken over the root is by addressing the problem for what it actually is, the math and drops do not lie, deletion and new certs/exp certs will fail. The science is clear, the answer is foggy. Its best to see clearly.
    - text: mitre attack network info processes extra meta performs dns t1055 process overview overview zenbox
    - link "*Dormant Destruction* VirusTotal report for index.html":
      - /url: https://otx.alienvault.com/pulse/6a0050a78094bfae20c7f947
    - text: 5/10/2026 • OTX Contributor
    - paragraph: This threat intelligence pulse tracks a long-dormant wiper, dating back to the early 2000s, which has persisted across multiple environments undetected. The malware features sophisticated, "hidden" destructive mechanisms capable of widespread data wiping. It appears to leverage administrative-level access, allowing it to move laterally and compromise systems extensively. Continued inaction regarding this infection chain poses a critical risk to data integrity. The ONLY way to fix this as it has taken over the root is by addressing the problem for what it actually is, the math and drops do not lie, deletion and new certs/exp certs will fail. The science is clear, the answer is foggy. Its best to see clearly.
    - text: mitre attack network info processes extra meta performs dns t1055 process overview overview zenbox
    - link "*Dormant Destruction* VirusTotal report for index.html":
      - /url: https://otx.alienvault.com/pulse/6a0050a3b1d71cc50840286e
    - text: 5/10/2026 • OTX Contributor
    - paragraph: This threat intelligence pulse tracks a long-dormant wiper, dating back to the early 2000s, which has persisted across multiple environments undetected. The malware features sophisticated, "hidden" destructive mechanisms capable of widespread data wiping. It appears to leverage administrative-level access, allowing it to move laterally and compromise systems extensively. Continued inaction regarding this infection chain poses a critical risk to data integrity. The ONLY way to fix this as it has taken over the root is by addressing the problem for what it actually is, the math and drops do not lie, deletion and new certs/exp certs will fail. The science is clear, the answer is foggy. Its best to see clearly.
    - text: mitre attack network info processes extra meta performs dns t1055 process overview overview zenbox
    - link "*Dormant Destruction* VirusTotal report for index.html":
      - /url: https://otx.alienvault.com/pulse/6a0050a527cf92f4dfd0195b
    - text: 5/10/2026 • OTX Contributor
    - paragraph: This threat intelligence pulse tracks a long-dormant wiper, dating back to the early 2000s, which has persisted across multiple environments undetected. The malware features sophisticated, "hidden" destructive mechanisms capable of widespread data wiping. It appears to leverage administrative-level access, allowing it to move laterally and compromise systems extensively. Continued inaction regarding this infection chain poses a critical risk to data integrity. The ONLY way to fix this as it has taken over the root is by addressing the problem for what it actually is, the math and drops do not lie, deletion and new certs/exp certs will fail. The science is clear, the answer is foggy. Its best to see clearly.
    - text: mitre attack network info processes extra meta performs dns t1055 process overview overview zenbox
    - link "CAPE Sandbox - \"Client Challenge\" Created 4/27/2025.":
      - /url: https://otx.alienvault.com/pulse/69fed99080ca19fd27b184cb
    - text: 5/9/2026 • OTX Contributor
    - paragraph: "[The Cuckoo.com website has been shut down by Microsoft, with the result of an analysis of the network's traffic patterns, and the results of its analysis] A SHA for an educational app/website I dont even have generated what is called \" Client Challenge\" 2c4b2093aa07afb9d633fd4e734a9707 2732a5adf7152c21b4a5aaa0a7b45f3d4be7874a aa7261397b39ae202abcfc337b8307c7d2532a9b7ee721f7a87a6f25aa59608d 622b6b82655de58b927dd956ab84db9d 48:IYhkrFN9YfHFTtJXQHyeyQ4v3W7UNp/xmhIfgjOGkOHMZKKyMaiskaO3n:TsYdxJXQHFY375ro6tZ8MaM93n T1E05100012CF6C176147724BB9E73B25A2B5064476216E41C3AEDDA28CF82FD9EC426EC HTML internet html HTML document, Unicode text, UTF-8 text HyperText Markup Language (100%) HTML 3.03 KB (3101 bytes) /_fs-ch-1T1wmsGaOgGaSxcX/assets/inter-var.woff2 /_fs-ch-1T1wmsGaOgGaSxcX/assets/styles.css -13jdrops from one html/38 malic files/bluetooth cap."
    - text: nothing registry keys mutexes nothing data datacrashpad edge created parent pid
    - link "CAPE Sandbox- Very Evasive and Aggressive 'bot?'.......":
      - /url: https://otx.alienvault.com/pulse/69df607b31f6ed471c32d4e3
    - text: 4/15/2026 • OTX Contributor
    - paragraph: A full report on the Microsoft Office malware, published on 3 February 2026, has been published online by the University of California, Los Angeles, and the National Security Agency (NSA) in New York.> This is malicious.
    - text: settings first counter default toolspanose mwdb bazaar sha3384 ssdeep
    - link "CAPE Sandbox- Very Evasive and Aggressive 'bot?'.......":
      - /url: https://otx.alienvault.com/pulse/69df607ced5dad90593b17cb
    - text: 4/15/2026 • OTX Contributor
    - paragraph: A full report on the Microsoft Office malware, published on 3 February 2026, has been published online by the University of California, Los Angeles, and the National Security Agency (NSA) in New York.> This is malicious.
    - text: settings first counter default toolspanose mwdb bazaar sha3384 ssdeep
    - 'link "Laboratorio #3"':
      - /url: https://otx.alienvault.com/pulse/69de7d7900ff23ea2f6cbffb
    - text: 4/14/2026 • OTX Contributor
    - paragraph: No description provided.
    - 'link "Laboratorio #3"':
      - /url: https://otx.alienvault.com/pulse/69de7dbcd41b39709f2d55f8
    - text: 4/14/2026 • OTX Contributor
    - paragraph: No description provided.
    - link "Lab - Pulse Seguridad":
      - /url: https://otx.alienvault.com/pulse/69deccd0e7f905e7396945a6
    - text: 4/14/2026 • OTX Contributor
    - paragraph: Pulse creado para detectar indicadores de compromiso en el laboratorio de seguridad.
    - text: lab malware windows
    - link "Lab - Pulse Seguridad":
      - /url: https://otx.alienvault.com/pulse/69deccd3bc049541e275b7b8
    - text: 4/14/2026 • OTX Contributor
    - paragraph: Pulse creado para detectar indicadores de compromiso en el laboratorio de seguridad.
    - text: lab malware windows
    - link "Lab - Pulse Seguridad":
      - /url: https://otx.alienvault.com/pulse/69deccf8946911072d69a86d
    - text: 4/14/2026 • OTX Contributor
    - paragraph: Pulse creado para detectar indicadores de compromiso en el laboratorio de seguridad.
    - text: lab malware windows
    - link "Lab - Pulse de Seguridad":
      - /url: https://otx.alienvault.com/pulse/69ded9de85c429a96b517780
    - text: 4/15/2026 • OTX Contributor
    - paragraph: Pulse creado para laboratorio de ciberseguridad con el objetivo de identificar indicadores de compromiso en un endpoint utilizando OTX.
    - text: lab malware windows security
    - link "Lab - Pulse de Seguridad":
      - /url: https://otx.alienvault.com/pulse/69ded9e111454607ecccb562
    - text: 4/15/2026 • OTX Contributor
    - paragraph: Pulse creado para laboratorio de ciberseguridad con el objetivo de identificar indicadores de compromiso en un endpoint utilizando OTX.
    - text: lab malware windows security
    - link "VirusTotal report for l-Management-System-School-ERP-nulled-by-CodeAlright.Com.zip":
      - /url: https://otx.alienvault.com/pulse/69d46ee073b843b1b52f59a2
    - text: 4/7/2026 • OTX Contributor
    - paragraph: A look at the results of a report generated by the University of California, Los Angeles (UCLA) and compiled by codecanyon, a university-instikit and an academy.
    - text: file type unix mitre attack network info wed jun overview dropped info processes extra
    - link "VirusTotal report for l-Management-System-School-ERP-nulled-by-CodeAlright.Com.zip":
      - /url: https://otx.alienvault.com/pulse/69d46ee1379578309fae9a4a
    - text: 4/7/2026 • OTX Contributor
    - paragraph: A look at the results of a report generated by the University of California, Los Angeles (UCLA) and compiled by codecanyon, a university-instikit and an academy.
    - text: file type unix mitre attack network info wed jun overview dropped info processes extra
    - link "Honeypot Data – T-Pot - Sydney, Australia - March 2026":
      - /url: https://otx.alienvault.com/pulse/69a388a0684b0ef823ae2c31
    - text: 3/1/2026 • OTX Contributor
    - paragraph: "Rolling monthly view for March 2026 of indicators observed by T-Pot CE honeypots. Each run looks back the last 24h and appends newly seen indicators for this month. Signals are deduped and filtered (min event count threshold; private IPs excluded). Intended for defensive use; infrastructure may be compromised or spoofed. Sensor: T-Pot CE. Location: Sydney, Australia."
    - text: tpot honeypot sensor-tagged cowrie suricata dionaea honeytrap p0f
    - link "LCIA HoneyNet Data - March 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/69c4350979501d83bf9876f3
    - text: 3/25/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: sftp cowrie malicious ssh
    - link "Honeypot Data - March 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/69c44465393381fc2c4611a5
    - text: 3/25/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: Redishoneypot heralding LAMP cowrie honeytrap ssh cisco sftp
    - link "Honeypot Data - March 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/69c2b32709ffdfe1847182ae
    - text: 3/24/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: malicious sftp cowrie ssh cisco
    - link "LCIA HoneyNet Data - March 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/69b8d36888283bf457acaec7
    - text: 3/17/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: malicious honeytrap cowrie LAMP ssh cisco sftp
    - link "Honeypot Data - March 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/69b8cb8d97682db150f3d66a
    - text: 3/17/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: malicious ssh cowrie sftp
    - link "VirusTotal report for install.sh":
      - /url: https://otx.alienvault.com/pulse/69bbb1f0a1b67477485d69c2
    - text: 3/19/2026 • OTX Contributor
    - paragraph: No description provided.
    - link "LCIA HoneyNet Data - March 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/69a38183b206b95d04d88d43
    - text: 3/1/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: cowrie ssh malicious sftp
    - link "Honeypot Data - March 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/69b43c926afdc8df5e572a47
    - text: 3/13/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: ssh sftp malicious cowrie
    - link "Honeypot Data - March 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/69b3faea939a0c419685cbf3
    - text: 3/13/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: sftp ssh malicious cowrie
    - link "Honeypot Data - March 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/69a38183f975648bb629719f
    - text: 3/1/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: malicious cowrie ssh sftp
    - link "CVE-2022-25765":
      - /url: https://otx.alienvault.com/pulse/69aee968971688355c6bbfba
    - text: 3/9/2026 • OTX Contributor
    - paragraph: "Feb 11, 2026 200 104.21.88.234 Feb 11, 2026 200 15.197.253.240 Feb 11, 2026 200 104.21.88.234 Nov 20, 2025 200 3.33.249.164 Jul 20, 2025 Connection Error Not Present Jul 20, 2025 Connection Error Not Present May 9, 2025 200 15.197.253.240 (tmobile owner recieved pdfkit.net dmv10 may 4) Nov 27, 2024 200 99.83.185.157 Sep 21, 2024 Connection Error Not Present Aug 2, 2024 200 93.93.130.231 Nov 8, 2021 200 54.216.252.255 (root cert) SHOWING 1 TO 11 OF 11 ENTRIES Verification confirms no physical Raspberry Pi hardware present. The Aug 2, 2024 (200 OK) log to 93.93.130.231 indicates a virtual MAC identity provisioned via the Nov 8, 2021 Root Cert. The May 9, 2025 AWS check-in (SHA-256: E3B0C442...) matches the PDFKit.NET DMV10 metadata signature. This confirms an administrative trust bypass was used to enforce subnet isolation during the whistleblower retaliation window"
    - link "Honeypot Data – T-Pot - Sydney, Australia - February 2026":
      - /url: https://otx.alienvault.com/pulse/697e9e9cd810b69811e492e0
    - text: 2/1/2026 • OTX Contributor
    - paragraph: "Rolling monthly view for February 2026 of indicators observed by T-Pot CE honeypots. Each run looks back the last 24h and appends newly seen indicators for this month. Signals are deduped and filtered (min event count threshold; private IPs excluded). Intended for defensive use; infrastructure may be compromised or spoofed. Sensor: T-Pot CE. Location: Sydney, Australia."
    - text: tpot honeypot sensor-tagged cowrie suricata dionaea honeytrap p0f
    - link "LCIA HoneyNet Data - February 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/697e978635f9680280a1b4d9
    - text: 2/1/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: cowrie sip ssh cisco sftp sentrypeer malicious
    - link "Honeypot Data - February 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/697e97867a8488d55ac45f1c
    - text: 2/1/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: sip cisco sftp sentrypeer cowrie malicious ssh
    - link "VirusTotal report for base.apk":
      - /url: https://otx.alienvault.com/pulse/69c54093677b8e2b9fb4081f
    - text: 3/26/2026 • OTX Contributor
    - paragraph: No description provided.
    - text: has permission file type https mitre attack network info dropped info apks reads
    - link "VirusTotal report for base.apk":
      - /url: https://otx.alienvault.com/pulse/69c52b603fa05bc7bddd55f7
    - text: 3/26/2026 • OTX Contributor
    - paragraph: A security report on the Android 9 operating system has been published by the University of South Africa's Security Research Centre (USA). Â£1.3m. Ã‚¬<pretext ***Malicious
    - text: has permission file type https mitre attack network info dropped info apks reads
    - link "VirusTotal report for base.apk":
      - /url: https://otx.alienvault.com/pulse/69c52b5e3bcbac4028418ca9
    - text: 3/26/2026 • OTX Contributor
    - paragraph: A security report on the Android 9 operating system has been published by the University of South Africa's Security Research Centre (USA). Â£1.3m. Ã‚¬<pretext ***Malicious
    - text: has permission file type https mitre attack network info dropped info apks reads
    - link "ACTIVIDAD MALICIOSA | Relacionada con Phantom 0APT Campaign 19022026":
      - /url: https://otx.alienvault.com/pulse/699758817892ad27d3a630b8
    - text: 2/19/2026 • OTX Contributor
    - paragraph: Esta campaña documenta la aparición y las tácticas engañosas del grupo de ransomware apt, que irrumpió en la escena a finales de enero de 2026. A diferencia de las operaciones de ransomware tradicionales que validan sus intrusiones con pruebas, 0APT lanzó una campaña de propaganda masiva, reclamando más de 190 víctimas en sus primeras semanas de actividad. Esta estrategia, inusualmente agresiva, buscaba generar un impacto mediático y de mercado instantáneo para posicionarse como un actor importante y atraer afiliados a su plataforma RaaS.
    - text: tcticas ta0040 impact ta0042 tcnicas t1486 data encrypted impact t1585 t1485 data destruction
    - link "Honeypot Data – T-Pot - Sydney, Australia - January 2026":
      - /url: https://otx.alienvault.com/pulse/6955c00fc71c3eed5b3fa565
    - text: 1/1/2026 • OTX Contributor
    - paragraph: "Rolling monthly view for January 2026 of indicators observed by T-Pot CE honeypots. Each run looks back the last 24h and appends newly seen indicators for this month. Signals are deduped and filtered (min event count threshold; private IPs excluded). Intended for defensive use; infrastructure may be compromised or spoofed. Sensor: T-Pot CE. Location: Sydney, Australia."
    - text: tpot honeypot sensor-tagged cowrie suricata dionaea honeytrap p0f
    - link "LCIA HoneyNet Data - January 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/695f1b02756669f02d029812
    - text: 1/8/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: sftp malicious cowrie ssh
    - link "Honeypot Data - January 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/6979cd284342721493363ea6
    - text: 1/28/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: heralding LAMP cisco cowrie honeytrap ssh malicious sftp
    - link "Honeypot Data - January 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/697030aab10c0cbf6023b4e5
    - text: 1/21/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: cisco cowrie ssh sftp malicious
    - link "The Blender Foundation BouncyCastle-Virut | Malware /Stealer Empty FileHash | Eternal7 (Shadow Broker) Related":
      - /url: https://otx.alienvault.com/pulse/6975c5cd4db6104ea1a3d69b
    - text: 1/25/2026 • OTX Contributor
    - paragraph: Empty FileHash isn’t benign. Interesting relationships to the Eternal 7. Malware, Stealer and Suspicious History File Operation. BouncyCastle-Virut PublicKeyToken=cc7b13ffcd 2ddd51 1D11.tmp Ultimate-Chicken-Horse- T1O SteamRIP.com.rarys / Startul ErrorPageTemplate[1] netcore, BouncyCastle.
    - text: empty blender eurostile augustin butterfield cook drummer erickson
    - link "Honeypot Data - January 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/695f0cf156eeb6a7fc1dd482
    - text: 1/8/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: cowrie malicious sftp ssh
    - link "LCIA HoneyNet Data - January 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/695e32f8d85fb2f34930319f
    - text: 1/7/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: malicious sftp cowrie ssh
    - link "Honeypot Data - January 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/695ed5841365902d750dfc7e
    - text: 1/7/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: heralding ssh sftp malicious cowrie
    - link "Honeypot Data - January 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/695e30537da74d7badd0a7b0
    - text: 1/7/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: malicious sftp ssh cowrie
    - link "LCIA HoneyNet Data - January 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/6955b9026d8634abac79509b
    - text: 1/1/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: malicious cowrie sftp ssh
    - link "Honeypot Data - January 2026 - Cowrie":
      - /url: https://otx.alienvault.com/pulse/6955b90315b555d35e1a2d8e
    - text: 1/1/2026 • OTX Contributor
    - paragraph: Data collected from honeypots in Louisiana. Just a fun project I tinker with.. data submitted with some gnarly python scripts for automation.
    - text: sftp ssh malicious cowrie
    - link "BLOCK_2024":
      - /url: https://otx.alienvault.com/pulse/6675c61d2a8e4554b9985027
    - text: 6/21/2024 • OTX Contributor
    - paragraph: No description provided.
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Threat Intelligence Explorer End-to-End Tests", () => {
  4  |   test("should load the explorer page and perform search query with auto-classification", async ({ page }) => {
  5  |     // 1. Visit Threat Intel page
  6  |     await page.goto("/security/threat-intel");
  7  | 
  8  |     // 2. Assert page header is present
  9  |     await expect(page.locator("h1")).toContainText("Threat Intelligence Explorer");
  10 | 
  11 |     // 3. Confirm default detection indicator shows keyword
  12 |     const detector = page.locator("span:has-text('Input Detection:') + div, span:has-text('Input Detection:') + span");
  13 |     await expect(detector).toContainText("General Keyword");
  14 | 
  15 |     // 4. Fill in an IP Address target to trigger auto-detection
  16 |     const searchInput = page.locator("input[placeholder*='Domain, IP, URL']");
  17 |     await searchInput.fill("148.228.16.3");
  18 | 
  19 |     // 5. Assert detection indicator updates immediately in the browser
  20 |     await expect(detector).toContainText("IP Address");
  21 | 
  22 |     // 6. Submit the form
  23 |     await searchInput.press("Enter");
  24 | 
  25 |     // 7. Verify loading state is shown and resolves to success
  26 |     const resultsContainer = page.locator("text=Target Indicator");
  27 |     await expect(resultsContainer).toBeVisible({ timeout: 15000 });
  28 | 
  29 |     // 8. Assert details card matches query
  30 |     await expect(page.locator("h2.font-mono")).toContainText("148.228.16.3");
  31 | 
  32 |     // 9. Assert tabs exist and can be toggled
  33 |     const otxTab = page.locator("button[role='tab'][value='otx']");
  34 |     await expect(otxTab).toBeVisible();
  35 | 
  36 |     const phishstatsTab = page.locator("button[role='tab'][value='phishstats']");
  37 |     await expect(phishstatsTab).toBeVisible();
  38 | 
  39 |     // 10. Click PhishStats tab and verify results table or empty notice is present
  40 |     await phishstatsTab.click();
  41 |     const phishstatsContent = page.locator("[data-slot='tabs-content'][value='phishstats']");
  42 |     await expect(phishstatsContent).toBeVisible();
  43 |   });
  44 | 
  45 |   test("should handle file hash query detection and render details tabs", async ({ page }) => {
  46 |     await page.goto("/security/threat-intel");
  47 | 
  48 |     const searchInput = page.locator("input[placeholder*='Domain, IP, URL']");
  49 |     const detector = page.locator("span:has-text('Input Detection:') + div, span:has-text('Input Detection:') + span");
  50 | 
  51 |     // Input MD5 file hash
  52 |     await searchInput.fill("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  53 |     await expect(detector).toContainText("File Hash");
  54 | 
  55 |     // Submit
  56 |     await searchInput.press("Enter");
  57 | 
  58 |     // Wait for the results to load
  59 |     const resultsContainer = page.locator("text=Target Indicator");
  60 |     await expect(resultsContainer).toBeVisible({ timeout: 15000 });
  61 | 
  62 |     // Verify MalwareBazaar tab is present
  63 |     const mbTab = page.locator("button[role='tab'][value='malwarebazaar']");
> 64 |     await expect(mbTab).toBeVisible();
     |                         ^ Error: expect(locator).toBeVisible() failed
  65 |   });
  66 | 
  67 |   test("should check that redirect links on external portal panel exist", async ({ page }) => {
  68 |     await page.goto("/security/threat-intel");
  69 | 
  70 |     const searchInput = page.locator("input[placeholder*='Domain, IP, URL']");
  71 |     await searchInput.fill("google.com");
  72 | 
  73 |     const detector = page.locator("span:has-text('Input Detection:') + div, span:has-text('Input Detection:') + span");
  74 |     await expect(detector).toContainText("Domain Name");
  75 | 
  76 |     await searchInput.press("Enter");
  77 | 
  78 |     // Wait for results
  79 |     await expect(page.locator("text=Target Indicator")).toBeVisible({ timeout: 15000 });
  80 | 
  81 |     // Verify redirect panel shows appropriate actions (e.g. VirusTotal Domain, AlienVault OTX)
  82 |     const portalButton = page.locator("button:has-text('VirusTotal Domain')");
  83 |     await expect(portalButton).toBeVisible();
  84 |   });
  85 | });
  86 | 
```
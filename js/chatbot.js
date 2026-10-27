(() => {
  "use strict";

  const root = document.getElementById("chatbot");
  if (!root) return;

  const panel = document.getElementById("chatPanel");
  const launcher = document.getElementById("chatLauncher");
  const closeBtn = document.getElementById("chatClose");
  const clearBtn = document.getElementById("chatClear");
  const log = document.getElementById("chatLog");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSend");
  const suggestions = document.getElementById("chatSuggestions");
  const statusEl = document.getElementById("chatStatus");

  if (!panel || !launcher || !log || !form || !input || !sendBtn) return;

  const MODEL = (root.dataset.model || "qwen2.5:1.5b").trim();
  const CUSTOM_ENDPOINT = (root.dataset.endpoint || "").trim();
  const MAX_HISTORY = 12;
  const WELCOME_HTML = log.innerHTML;

  const SYSTEM_PROMPT = `You are the AI assistant embedded in Rohit Dhiman's interactive resume website. You help visitors learn about Rohit's professional background. Speak about Rohit in the third person. Be concise, warm and professional. Keep most answers under 120 words unless the visitor asks for detail. Use short paragraphs or brief bullet lists. Do not use emojis.

FACTS (use only these; never invent details):
Name: Rohit Dhiman
Location: Chandigarh, India
Phone: +91 90232 66021
Email: er.rohit.dhiman91@gmail.com
Languages: English, Hindi, Punjabi

CURRENT ROLE: Senior Engineer – Datacenter Operations at L&T Technology Services Limited, Chandigarh, July 2024 – present.

SUMMARY: Senior Engineer with 10+ years of experience in enterprise infrastructure, data center operations, virtualization, server administration, networking, disaster recovery, backup solutions and Azure cloud. Proven track record of managing mission-critical environments, reducing operational costs and ensuring high availability, reliability and SLA compliance across global operations. Currently expanding into AI data center infrastructure, offline AI deployment and application integration.

SKILLS:
- Data Center & Infrastructure: data center operations and monitoring; enterprise data center setup; server, storage, networking and firewall; DR strategy, RTO/RPO planning, DR drills and mock failover; racking, staging and structured cabling.
- Virtualization & Cloud: VMware vSphere, ESXi and Horizon VDI; Microsoft Hyper-V; Azure Cloud (compute, networking, IAM and monitoring); on-premises and cloud migration; cloud cost optimization.
- Server Administration: Windows Server (AD, DNS, DHCP, IIS, WSUS, SSL and GPO); Linux (Apache, LVM, YUM, NTP, SSH and patch management); P2V and V2P migration; firmware upgrades and health checks.
- Monitoring & ITSM: Site24x7, Zabbix and LogicMonitor; ServiceDesk Plus; ManageEngine Endpoint Central.
- Backup & Disaster Recovery: Dell EMC NetWorker, Veeam, Commvault and Druva; synchronous and asynchronous replication; DR site setup and failover testing.
- Security & Compliance: PAM (OpenText IDAM and CyberArk); ISO/IEC 27001; PCI DSS; vulnerability assessments; audit and compliance support.
- Leadership & Management: team leadership (10+ engineers); vendor and license management; SLA, RCA, SOP and documentation; stakeholder and client coordination.

EXPERIENCE:
1. Senior Engineer – Datacenter Operations, L&T Technology Services Limited, Chandigarh, July 2024 – present. Led end-to-end implementation of a new data center for the UNMS project (hardware and software installation, acceptance testing). Managed DCOPS, NOC and SOC operations with high availability and SLA compliance. Designed and operated DR environments with defined RTO/RPO. Ran DR drills and mock failover testing. Owned acceptance testing, asset management and site documentation. Deployed and administered Windows and Linux servers. Migrated physical servers to virtual environments and vice versa. Led production support, incident management, patching, firmware upgrades and health checks. Implemented enterprise backup and restore strategies. Coordinated vendors, license renewals and SSL certificate updates. Supported CAPEX execution and go-live readiness.
2. Senior Server Administrator – Cloud, Vaibhav Global Limited, July 2023 – May 2024. Provided 24x7 international data center and server support for production environments in the UK, USA, Germany and India. Administered VMware environments including ESXi hosts and VMs. Managed backups, disaster recovery and production support. Supported PCI DSS compliance and vulnerability assessments. Delivered SLA-driven support using ITSM tools and collaborated with global stakeholders. Participated in cloud migration and optimization.
3. Senior Executive Engineer, Access Infotech Pvt. Ltd, June 2017 – May 2023. Delivered L2/L3 data center operations support for servers and virtualization. Led NOC operations and supported enterprise monitoring tools. Managed backup operations using Commvault and Druva. Coordinated with customers and internal teams. Supported audit, compliance and DR initiatives. Provided application support for eOffice and other applications.
4. Senior Associate Engineer, HCL Infosystems Ltd, October 2016 – May 2017. Supported enterprise data center environments for servers, virtualization and monitoring. Handled incident resolution, change management and customer escalations.
5. Facility Management Engineer, Access Infotech Pvt. Ltd (offrole Wipro Ltd), May 2015 – May 2016. Managed 2,000+ IT assets including servers, desktops and printers for State Bank of India.

KEY PROJECTS:
- NOC, SOC & DCOPS VDI: implemented thin-client VDI solutions.
- ISO/IEC 27001 certification: led certification for data center operations.
- Site24x7 monitoring rollout: achieved 40% cost savings.
- PCI DSS compliance: supported certification for a US-based e-commerce platform.
- Azure disaster recovery: designed and implemented DR solutions in Azure Cloud.
- ManageEngine Endpoint Central deployment: saved 40% in operational costs.
- ServiceDesk Plus ITSM: deployed for ITSM operations.
- Privileged Access Management: supported PAM implementation using CyberArk and OpenText IDAM.
- On-premises to Azure migration: led migration improving security and performance.

LEARNING & DEVELOPMENT: deploying offline AI environments using Ollama, NemoClaw and Opencode and integrating local models with applications; building interactive reports and dashboards; front-end and back-end web development; currently learning AI data center infrastructure (compute, networking, storage and operations for AI workloads).

EDUCATION: Bachelor of Technology (Computer Science), Punjab Technical University, Jalandhar, 2013, 78%. Diploma in Computer Engineering, Punjab State Board of Technical Education, 2010, 68%.

RULES:
- If information is not in these facts (for example salary expectations, notice period, visa status, references, exact availability date, personal details), say it is not listed on the site and suggest contacting Rohit directly.
- If asked something unrelated to Rohit or his career, politely explain that you can only answer questions about Rohit.
- Never claim skills, certifications, employers or achievements that are not listed above.
- For hiring or contact questions, share the email and phone number above.
- On availability, say Rohit is open to conversations about data center operations, cloud infrastructure, AI infrastructure, disaster recovery and infrastructure leadership, as stated on the site.
- Reply in the visitor's language when practical (English or Hindi).`;

  let messages = [{ role: "system", content: SYSTEM_PROMPT }];
  let streaming = false;
  let controller = null;
  let generation = 0;
  let backendChecked = false;
  let backendOnline = false;
  let hasReplied = false;

  function unique(list) {
    return list.filter((item, index) => list.indexOf(item) === index);
  }

  function chatEndpoints() {
    if (CUSTOM_ENDPOINT) return [CUSTOM_ENDPOINT];

    const list = [];
    if (location.protocol === "http:" || location.protocol === "https:") {
      list.push(`${location.origin}/api/chat`);
    }
    list.push("http://127.0.0.1:11434/api/chat", "http://localhost:11434/api/chat");
    return unique(list);
  }

  function tagsEndpoints() {
    return chatEndpoints().map((url) => url.replace(/\/api\/chat\/?$/, "/api/tags"));
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatInline(value) {
    return value
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  }

  function renderMarkdown(text) {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    let html = "";
    let paragraph = [];
    let list = null;
    let fence = null;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      html += `<p>${paragraph.map(formatInline).join("<br>")}</p>`;
      paragraph = [];
    };

    const flushList = () => {
      if (!list) return;
      html += `<ul>${list.map((item) => `<li>${formatInline(item)}</li>`).join("")}</ul>`;
      list = null;
    };

    for (const rawLine of lines) {
      const line = escapeHtml(rawLine).trim();

      if (/^```/.test(line)) {
        if (fence === null) {
          flushParagraph();
          flushList();
          fence = [];
        } else {
          html += `<p><code>${fence.join("<br>")}</code></p>`;
          fence = null;
        }
        continue;
      }

      if (fence !== null) {
        fence.push(line);
        continue;
      }

      if (!line) {
        flushParagraph();
        flushList();
        continue;
      }

      if (/^[-*•]\s+/.test(line)) {
        flushParagraph();
        if (!list) list = [];
        list.push(line.replace(/^[-*•]\s+/, ""));
        continue;
      }

      if (/^\d+[.)]\s+/.test(line)) {
        flushParagraph();
        if (!list) list = [];
        list.push(line.replace(/^\d+[.)]\s+/, ""));
        continue;
      }

      if (/^#{1,4}\s+/.test(line)) {
        flushParagraph();
        flushList();
        html += `<p class="chat-heading">${formatInline(line.replace(/^#+\s+/, ""))}</p>`;
        continue;
      }

      flushList();
      paragraph.push(line);
    }

    if (fence !== null) html += `<p><code>${fence.join("<br>")}</code></p>`;
    flushParagraph();
    flushList();

    return html || "<p></p>";
  }

  function scrollToBottom(force) {
    const distance = log.scrollHeight - log.scrollTop - log.clientHeight;
    if (force || distance < 90) log.scrollTop = log.scrollHeight;
  }

  function createMessage(role, isError) {
    const wrapper = document.createElement("div");
    wrapper.className = `chat-msg chat-msg-${role}${isError ? " chat-msg-error" : ""}`;
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    wrapper.appendChild(bubble);
    log.appendChild(wrapper);
    scrollToBottom(true);
    return bubble;
  }

  function appendMessage(role, text, isError) {
    const bubble = createMessage(role, isError);
    bubble.innerHTML = renderMarkdown(text);
    scrollToBottom(true);
    return bubble;
  }

  function createTyping() {
    const bubble = createMessage("assistant", false);
    bubble.innerHTML =
      '<span class="chat-typing" aria-label="Assistant is typing"><span></span><span></span><span></span></span>';
    return bubble;
  }

  function setStatus(text, state) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle("is-online", state === "online");
    statusEl.classList.toggle("is-offline", state === "offline");
  }

  function setStreaming(value) {
    streaming = value;
    sendBtn.classList.toggle("is-stop", value);
    sendBtn.setAttribute("aria-label", value ? "Stop response" : "Send message");
    input.disabled = value;
    if (!value) {
      if (window.matchMedia("(min-width: 621px)").matches) input.focus();
    }
  }

  function hideSuggestions() {
    if (suggestions) suggestions.classList.add("is-hidden");
  }

  function showSuggestions() {
    if (suggestions) suggestions.classList.remove("is-hidden");
  }

  function autoGrow() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
  }

  function fetchWithTimeout(url, timeout) {
    const localController = new AbortController();
    const timer = window.setTimeout(() => localController.abort(), timeout);
    return fetch(url, { signal: localController.signal }).finally(() => window.clearTimeout(timer));
  }

  async function checkBackend() {
    if (backendChecked) return backendOnline;
    backendChecked = true;
    setStatus("Checking local model…");

    for (const url of tagsEndpoints()) {
      try {
        const response = await fetchWithTimeout(url, 3000);
        if (!response.ok) continue;

        const type = (response.headers.get("content-type") || "").toLowerCase();
        if (type.includes("text/html")) continue;

        const data = await response.json();
        const models = Array.isArray(data.models) ? data.models : [];
        if (!models.length) continue;

        const names = models.map((model) => model.name || model.model || "");
        const found = names.some((name) => name === MODEL || name.startsWith(`${MODEL}:`));
        if (found) {
          backendOnline = true;
          setStatus(`Online · ${MODEL}`, "online");
        } else if (hasReplied) {
          backendOnline = true;
        } else {
          backendOnline = false;
          setStatus(`Model missing · ollama pull ${MODEL}`, "offline");
        }
        return backendOnline;
      } catch (error) {
        continue;
      }
    }

    backendOnline = false;
    if (!hasReplied) setStatus("Offline · start Ollama", "offline");
    return false;
  }

  async function readStream(response, onToken) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const handleLine = (line) => {
      if (!line) return false;
      let data;
      try {
        data = JSON.parse(line);
      } catch (error) {
        return false;
      }
      if (data.error) throw new Error(data.error);
      const token = (data.message && data.message.content) || data.response || "";
      if (token) onToken(token);
      return Boolean(data.done);
    };

    while (true) {
      const result = await reader.read();
      if (result.done) break;

      buffer += decoder.decode(result.value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (handleLine(line)) return;
        newline = buffer.indexOf("\n");
      }
    }

    const tail = buffer.trim();
    if (tail) handleLine(tail);
  }

  function failureMessage() {
    return [
      "I can't reach the local AI right now. A few things to check:",
      "",
      "- Make sure Ollama is running: `ollama serve`",
      "- Run this site through the included proxy: `python3 server.py`, then open `http://localhost:8080`",
      `- Confirm the model is installed: \`ollama pull ${MODEL}\``,
      "",
      "Opening the HTML file directly can be blocked by browser security, so the proxy is the recommended way.",
    ].join("\n");
  }

  async function sendMessage(rawText) {
    if (streaming) return;

    const text = rawText.trim();
    if (!text) return;

    hideSuggestions();
    appendMessage("user", text);
    messages.push({ role: "user", content: text });
    if (messages.length > MAX_HISTORY + 1) {
      messages = [messages[0]].concat(messages.slice(-MAX_HISTORY));
    }

    const requestGeneration = generation;
    const payload = {
      model: MODEL,
      messages,
      stream: true,
      keep_alive: "30m",
      options: { temperature: 0.3, top_p: 0.9, num_predict: 200 },
    };

    setStreaming(true);
    const bubble = createTyping();
    let fullText = "";
    let started = false;
    let stopped = false;
    let lastError = "";

    for (const url of chatEndpoints()) {
      controller = new AbortController();
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          lastError = `HTTP ${response.status}`;
          continue;
        }

        const type = (response.headers.get("content-type") || "").toLowerCase();
        if (type.includes("text/html")) {
          lastError = "HTML response";
          continue;
        }

        if (!started) {
          bubble.innerHTML = "";
          bubble.classList.add("is-streaming");
          started = true;
        }

        await readStream(response, (token) => {
          fullText += token;
          bubble.textContent = fullText;
          scrollToBottom(false);
        });
        break;
      } catch (error) {
        if (error.name === "AbortError") {
          stopped = true;
          break;
        }
        lastError = error.message || "Connection failed";
      } finally {
        controller = null;
      }
    }

    bubble.classList.remove("is-streaming");

    if (requestGeneration !== generation) {
      setStreaming(false);
      return;
    }

    if (started && fullText.trim()) {
      bubble.innerHTML = renderMarkdown(fullText.trim());
      messages.push({ role: "assistant", content: fullText.trim() });
      scrollToBottom(true);
      backendOnline = true;
      backendChecked = true;
      hasReplied = true;
      setStatus(`Online · ${MODEL}`, "online");
    } else {
      bubble.parentElement.remove();
      if (!stopped) {
        appendMessage("assistant", failureMessage(), true);
        lastError = lastError || "Connection failed";
        backendChecked = false;
        await checkBackend();
      }
    }

    setStreaming(false);
  }

  function openChat() {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    launcher.setAttribute("aria-label", "Close AI assistant");
    scrollToBottom(true);
    checkBackend();
    if (window.matchMedia("(min-width: 621px)").matches) input.focus();
  }

  function closeChat() {
    const hadFocus = panel.contains(document.activeElement);
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-label", "Open AI assistant");
    if (hadFocus) launcher.focus();
  }

  function resetChat() {
    generation += 1;
    if (controller) controller.abort();
    messages = [{ role: "system", content: SYSTEM_PROMPT }];
    log.innerHTML = WELCOME_HTML;
    showSuggestions();
    input.value = "";
    autoGrow();
    scrollToBottom(true);
    if (!panel.hidden) input.focus();
  }

  setStatus(`Local AI · ${MODEL}`, "");

  launcher.addEventListener("click", () => {
    if (panel.hidden) {
      openChat();
    } else {
      closeChat();
    }
  });

  if (closeBtn) closeBtn.addEventListener("click", closeChat);
  if (clearBtn) clearBtn.addEventListener("click", resetChat);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) closeChat();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (streaming) {
      if (controller) controller.abort();
      return;
    }
    const text = input.value;
    input.value = "";
    autoGrow();
    sendMessage(text);
  });

  input.addEventListener("input", autoGrow);

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  if (suggestions) {
    suggestions.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-prompt]");
      if (!button || streaming) return;
      sendMessage(button.dataset.prompt || "");
    });
  }
})();

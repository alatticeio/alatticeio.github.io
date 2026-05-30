import{_ as a,o as n,c as t,a0 as i}from"./chunks/framework.DoRPXVp_.js";const g=JSON.parse('{"title":"Sandbox Agent 架构参考","description":"","frontmatter":{},"headers":[],"relativePath":"archive/sandbox-specs/2026-05-18-sandbox-agent-architecture.md","filePath":"archive/sandbox-specs/2026-05-18-sandbox-agent-architecture.md"}'),e={name:"archive/sandbox-specs/2026-05-18-sandbox-agent-architecture.md"};function p(l,s,d,r,o,h){return n(),t("div",null,[...s[0]||(s[0]=[i(`<h1 id="sandbox-agent-架构参考" tabindex="-1">Sandbox Agent 架构参考 <a class="header-anchor" href="#sandbox-agent-架构参考" aria-label="Permalink to &quot;Sandbox Agent 架构参考&quot;">​</a></h1><blockquote><p>生成日期: 2026-05-21（基于 <code>cmd/lattice/cmd/sandbox/</code>、<code>internal/agent/gvisor/</code>、<code>internal/agent/runsc/</code>） 更新日期: 2026-05-26（新增 <code>sandbox run</code> 命令设计）</p></blockquote><h2 id="概述" tabindex="-1">概述 <a class="header-anchor" href="#概述" aria-label="Permalink to &quot;概述&quot;">​</a></h2><p>Lattice Sandbox 为 AI Agent 提供隔离的网络身份，让 Agent 进程以普通用户权限运行，同时获得完整的 Lattice 网络（NATS 注册 + ICE/LRP 打洞 + LRP relay 回退）。</p><p><strong>主要用户命令</strong>（PRO 版可用）：</p><table tabindex="0"><thead><tr><th>命令</th><th>定位</th><th>描述</th></tr></thead><tbody><tr><td><code>lattice sandbox run</code></td><td><strong>主命令（用户首选）</strong></td><td>一键启动沙箱 + 注入代理 + 执行 AI Agent</td></tr><tr><td><code>lattice sandbox start</code></td><td>底层命令（进阶调试）</td><td>仅启动沙箱守护进程，不执行 Agent</td></tr></tbody></table><p><strong>隔离模式</strong>：</p><table tabindex="0"><thead><tr><th>模式</th><th>隔离层级</th><th>网络架构</th><th>适用场景</th></tr></thead><tbody><tr><td><strong>pod 模式</strong>（<code>--mode pod</code>，默认）</td><td>网络层（gVisor 用户态网络栈）</td><td>gVisor <code>pkg/tcpip</code> + TUNAdapter + wireguard-go（用户态）</td><td>零特权环境，通过 SOCKS5 代理接入</td></tr><tr><td><strong>gvisor 模式</strong>（<code>--mode gvisor</code>）</td><td>syscall 级（runsc 容器）</td><td>两阶段：pod 内核 WireGuard + gVisor <code>--network=host</code></td><td>不受信任代码，syscall 强制拦截</td></tr></tbody></table><hr><h2 id="lattice-sandbox-run-主用户命令" tabindex="-1"><code>lattice sandbox run</code>（主用户命令） <a class="header-anchor" href="#lattice-sandbox-run-主用户命令" aria-label="Permalink to &quot;\`lattice sandbox run\`（主用户命令）&quot;">​</a></h2><h3 id="设计目标" tabindex="-1">设计目标 <a class="header-anchor" href="#设计目标" aria-label="Permalink to &quot;设计目标&quot;">​</a></h3><p>将&quot;启动沙箱 + 配置代理 + 运行 Agent&quot;三个步骤合并为<strong>一条命令</strong>。用户不需要了解 SOCKS5 端口、代理配置、进程管理等细节。</p><h3 id="使用示例" tabindex="-1">使用示例 <a class="header-anchor" href="#使用示例" aria-label="Permalink to &quot;使用示例&quot;">​</a></h3><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 最简用法</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">lattice</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> sandbox</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> run</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --name</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> my-agent</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --server-url</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> http://latticed:8080</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --token</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> lt-xxx</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> python</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> agent.py</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --task</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;analyze data&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 指定代理端口（默认随机）</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">lattice</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> sandbox</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> run</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --name</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> my-agent</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --server-url</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> http://latticed:8080</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --token</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> lt-xxx</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --proxy-addr</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> 127.0.0.1:1080</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> claude</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> --model</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> claude-opus-4-6</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 指定出站策略</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">lattice</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> sandbox</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> run</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --name</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> my-agent</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --server-url</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> http://latticed:8080</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --token</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> lt-xxx</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --egress-allow</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> 10.0.0.0/8</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> \\</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  --</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> python</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> agent.py</span></span></code></pre></div><h3 id="执行流程" tabindex="-1">执行流程 <a class="header-anchor" href="#执行流程" aria-label="Permalink to &quot;执行流程&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>lattice sandbox run -- &lt;ai-agent&gt; [args...]</span></span>
<span class="line"><span>         │</span></span>
<span class="line"><span>         ▼</span></span>
<span class="line"><span>1. 启动 Sandbox（pod 模式）</span></span>
<span class="line"><span>   ├── 注册/恢复凭证</span></span>
<span class="line"><span>   ├── 初始化 gVisor netstack</span></span>
<span class="line"><span>   └── 等待 WireGuard 就绪（≤ 3s）</span></span>
<span class="line"><span>         │</span></span>
<span class="line"><span>         ▼</span></span>
<span class="line"><span>2. 启动 SOCKS5 代理</span></span>
<span class="line"><span>   ├── 监听 127.0.0.1:&lt;随机端口&gt;（默认 :0，OS 分配）</span></span>
<span class="line"><span>   └── 获取实际绑定的端口号</span></span>
<span class="line"><span>         │</span></span>
<span class="line"><span>         ▼</span></span>
<span class="line"><span>3. 构造子进程环境</span></span>
<span class="line"><span>   ├── 继承当前进程的所有环境变量</span></span>
<span class="line"><span>   ├── 注入 ALL_PROXY=socks5://127.0.0.1:&lt;port&gt;</span></span>
<span class="line"><span>   ├── 注入 all_proxy=socks5://127.0.0.1:&lt;port&gt;（小写兼容）</span></span>
<span class="line"><span>   └── 注入 LATTICE_SANDBOX_NAME=&lt;name&gt;（可选元数据）</span></span>
<span class="line"><span>         │</span></span>
<span class="line"><span>         ▼</span></span>
<span class="line"><span>4. exec AI Agent 子进程</span></span>
<span class="line"><span>   └── os/exec.Cmd{Env: injectedEnv, Stdout: os.Stdout, Stderr: os.Stderr}</span></span>
<span class="line"><span>         │</span></span>
<span class="line"><span>         ▼</span></span>
<span class="line"><span>5. 等待子进程退出</span></span>
<span class="line"><span>   └── 子进程退出（无论成功/失败）→ sandbox 自动清理 → 进程退出</span></span></code></pre></div><h3 id="代理注入-近零入侵原则" tabindex="-1">代理注入：近零入侵原则 <a class="header-anchor" href="#代理注入-近零入侵原则" aria-label="Permalink to &quot;代理注入：近零入侵原则&quot;">​</a></h3><p><code>ALL_PROXY</code> / <code>all_proxy</code> 是业界标准环境变量，被以下工具自动识别：</p><table tabindex="0"><thead><tr><th>AI Agent / 工具</th><th>识别 SOCKS5 代理</th></tr></thead><tbody><tr><td>curl、wget</td><td>✅ <code>ALL_PROXY</code></td></tr><tr><td>Python <code>requests</code></td><td>✅（通过 urllib3）</td></tr><tr><td>Python <code>httpx</code></td><td>✅</td></tr><tr><td>Node.js（undici/fetch）</td><td>✅ <code>ALL_PROXY</code></td></tr><tr><td>Go 标准库 <code>net/http</code></td><td>✅ <code>ALL_PROXY</code></td></tr><tr><td>Claude CLI</td><td>✅</td></tr><tr><td>OpenAI SDK（Python/Node）</td><td>✅</td></tr></tbody></table><p><strong>AI Agent 无需修改任何代码</strong>，只需通过标准 HTTP/HTTPS 客户端发起请求，流量自动路由到 Lattice overlay 网络。</p><h3 id="生命周期绑定" tabindex="-1">生命周期绑定 <a class="header-anchor" href="#生命周期绑定" aria-label="Permalink to &quot;生命周期绑定&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>AI Agent 进程  ──退出──▶  sandbox run 检测退出</span></span>
<span class="line"><span>                               │</span></span>
<span class="line"><span>                               ▼</span></span>
<span class="line"><span>                         sandbox.Stop()</span></span>
<span class="line"><span>                         node.Stop()</span></span>
<span class="line"><span>                         SOCKS5 服务关闭</span></span>
<span class="line"><span>                         进程退出（透传 exit code）</span></span></code></pre></div><ul><li>AI Agent 是主体：Agent 退出，Sandbox 跟随退出</li><li>反向也成立：Sandbox 内部错误（如 NATS 连接中断）→ SIGTERM 子进程 → 等待 5s 后 SIGKILL</li></ul><h3 id="flag-设计" tabindex="-1">Flag 设计 <a class="header-anchor" href="#flag-设计" aria-label="Permalink to &quot;Flag 设计&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>lattice sandbox run [flags] -- &lt;command&gt; [args...]</span></span>
<span class="line"><span></span></span>
<span class="line"><span>必填:</span></span>
<span class="line"><span>  --name            string   Sandbox 标识符</span></span>
<span class="line"><span>  --server-url      string   Lattice 控制面 URL</span></span>
<span class="line"><span>  --token           string   Enrollment token</span></span>
<span class="line"><span></span></span>
<span class="line"><span>可选:</span></span>
<span class="line"><span>  --mode            string   隔离模式：pod（默认）| gvisor（PRO）</span></span>
<span class="line"><span>  --proxy-addr      string   SOCKS5 代理监听地址（默认 127.0.0.1:0，随机端口）</span></span>
<span class="line"><span>  --egress-allow    string   允许出站的 CIDR 列表（逗号分隔）</span></span>
<span class="line"><span>  --egress-default-deny      启用出站白名单模式</span></span>
<span class="line"><span>  --forward         strings  入站转发规则（格式: overlayPort:targetAddr）</span></span>
<span class="line"><span>  --ready-timeout   duration WireGuard 就绪超时（默认 10s）</span></span></code></pre></div><p><code>--</code> 之后的所有内容作为子命令传递，<code>sandbox run</code> 本身不解析。</p><h3 id="与-sandbox-start-的区别" tabindex="-1">与 <code>sandbox start</code> 的区别 <a class="header-anchor" href="#与-sandbox-start-的区别" aria-label="Permalink to &quot;与 \`sandbox start\` 的区别&quot;">​</a></h3><table tabindex="0"><thead><tr><th>维度</th><th><code>sandbox run</code></th><th><code>sandbox start</code></th></tr></thead><tbody><tr><td>定位</td><td>主用户命令</td><td>底层命令（进阶/调试）</td></tr><tr><td>Agent 执行</td><td>✅ 自动 exec AI Agent</td><td>❌ 仅启动沙箱守护进程</td></tr><tr><td>代理注入</td><td>✅ 自动注入 ALL_PROXY</td><td>❌ 需手动设置</td></tr><tr><td>生命周期</td><td>Agent 进程控制</td><td>需手动 SIGTERM</td></tr><tr><td>典型使用者</td><td>最终用户 / CI/CD</td><td>调试、sidecar 场景</td></tr></tbody></table><hr><h2 id="gvisor-runsc-模式-两阶段架构" tabindex="-1">gVisor runsc 模式：两阶段架构 <a class="header-anchor" href="#gvisor-runsc-模式-两阶段架构" aria-label="Permalink to &quot;gVisor runsc 模式：两阶段架构&quot;">​</a></h2><p>gVisor 的 <code>--network=host</code> 和 <code>--network=sandbox</code> 互斥——一个有 K8s 网络但无法创建 TUN，一个能创建 TUN 但无 eth0。解决方案是将工作拆成两个阶段：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Phase 1（pod 内核）:                Phase 2（runsc --network=host）:</span></span>
<span class="line"><span>┌──────────────────────────┐        ┌─────────────────────────────┐</span></span>
<span class="line"><span>│  bootstrapAgent()        │        │  runsc container             │</span></span>
<span class="line"><span>│                          │        │                             │</span></span>
<span class="line"><span>│  ① NATS 注册             │        │  PID 1: AI agent 二进制     │</span></span>
<span class="line"><span>│  ② wireguard-go → wg0    │        │  （直接 exec，无 shim）     │</span></span>
<span class="line"><span>│     (真实 /dev/net/tun)  │        │                             │</span></span>
<span class="line"><span>│  ③ 路由 + iptables       │        │  AI agent connect(peer)     │</span></span>
<span class="line"><span>│                          │        │    → gVisor sentry 拦截      │</span></span>
<span class="line"><span>│  node 持续存活 ──────────┼────────▶   → host kernel passthrough  │</span></span>
<span class="line"><span>│                          │        │    → pod 路由 → wg0 → overlay │</span></span>
<span class="line"><span>└──────────────────────────┘        └─────────────────────────────┘</span></span></code></pre></div><p><strong>关键属性</strong>：WireGuard 运行在真实内核上，不在 gVisor 内部。AI agent 通过 <code>--network=host</code> 继承 pod 的网络命名空间，其流量经 pod 路由进入 wg0 和 overlay。gVisor sentry 拦截所有 syscall 提供安全隔离，但网络不再依赖 gVisor 内部 netstack。</p><h3 id="安全边界-gvisor-模式" tabindex="-1">安全边界（gvisor 模式） <a class="header-anchor" href="#安全边界-gvisor-模式" aria-label="Permalink to &quot;安全边界（gvisor 模式）&quot;">​</a></h3><table tabindex="0"><thead><tr><th>层级</th><th>机制</th></tr></thead><tbody><tr><td>Syscall 隔离</td><td>gVisor sentry（所有 syscall 被拦截）</td></tr><tr><td>网络访问</td><td>Pod iptables/eBPF 规则作用在 wg0</td></tr><tr><td>WireGuard 密钥</td><td>存在于 pod 内核，不在 gVisor 内</td></tr><tr><td>CAP_NET_ADMIN</td><td>不授予 gVisor 容器</td></tr><tr><td>TUN 设备</td><td>gVisor 内部不可用</td></tr></tbody></table><hr><h2 id="pod-模式-gvisor-用户态网络栈" tabindex="-1">pod 模式：gVisor 用户态网络栈 <a class="header-anchor" href="#pod-模式-gvisor-用户态网络栈" aria-label="Permalink to &quot;pod 模式：gVisor 用户态网络栈&quot;">​</a></h2><p>pod 模式是目前最成熟的模式，在进程内嵌入 gVisor 用户态网络栈：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>                    ┌─────────────────────────────┐</span></span>
<span class="line"><span>                    │       gVisor Sandbox         │</span></span>
<span class="line"><span>                    │                              │</span></span>
<span class="line"><span>  Agent 进程  ──▶   │  gVisor netstack (pkg/tcpip) │</span></span>
<span class="line"><span>  (ALL_PROXY)       │        │                    │</span></span>
<span class="line"><span>  SOCKS5 Client     │  [PRO] EgressFilter          │</span></span>
<span class="line"><span>                    │        │                    │</span></span>
<span class="line"><span>                    │  TUNAdapter (channel bridge) │</span></span>
<span class="line"><span>                    │        │                    │</span></span>
<span class="line"><span>                    │  wireguard-go Device         │</span></span>
<span class="line"><span>                    └──────────┬──────────────────┘</span></span>
<span class="line"><span>                               │ UDP :51820</span></span>
<span class="line"><span>                    ┌──────────▼──────────────────┐</span></span>
<span class="line"><span>                    │   FilteringUDPMux            │</span></span>
<span class="line"><span>                    │   STUN ──▶ ICE agent        │</span></span>
<span class="line"><span>                    │   non-STUN ──▶ WG DefaultBind│</span></span>
<span class="line"><span>                    └──────────┬──────────────────┘</span></span>
<span class="line"><span>                               │</span></span>
<span class="line"><span>              ┌────────────────┴──────────────┐</span></span>
<span class="line"><span>              │  ICE 打洞成功                  │  ICE 失败</span></span>
<span class="line"><span>              ▼                               ▼</span></span>
<span class="line"><span>        Direct P2P                    LRP relay (QUIC/TCP)</span></span></code></pre></div><p>Sandbox 走的是与普通节点<strong>完全相同</strong>的信令路径：<code>NATS → ProbeFactory → ICE/LRP</code>。gVisor 只负责替换内核 TUN 设备，上层逻辑无感知。</p><hr><h2 id="三种模式对比" tabindex="-1">三种模式对比 <a class="header-anchor" href="#三种模式对比" aria-label="Permalink to &quot;三种模式对比&quot;">​</a></h2><table tabindex="0"><thead><tr><th>维度</th><th>普通节点（<code>lattice up</code>）</th><th>pod 模式</th><th>gvisor 模式</th></tr></thead><tbody><tr><td>隔离方式</td><td>无（宿主机进程）</td><td>gVisor netstack (in-process)</td><td>runsc 容器（syscall 拦截）</td></tr><tr><td>特权需求</td><td>root / <code>CAP_NET_ADMIN</code></td><td><strong>零特权</strong>（普通用户）</td><td>privileged（runsc 需要）</td></tr><tr><td>网络栈</td><td>内核 TUN（<code>wf0</code>）</td><td>gVisor <code>pkg/tcpip</code> + TUNAdapter</td><td>真实内核 TUN（pod kernel wg0）</td></tr><tr><td>WireGuard</td><td>内核 <code>wgctrl</code></td><td>wireguard-go（用户态）</td><td>wireguard-go（pod 内核）</td></tr><tr><td>Provisioner</td><td><code>KernelProvisioner</code></td><td><code>SandboxProvisioner</code></td><td><code>KernelProvisioner</code>（pod iptables/eBPF）</td></tr><tr><td>注册方式</td><td>HTTP 或 NATS</td><td><strong>NATS only</strong></td><td><strong>NATS only</strong></td></tr><tr><td>凭证持久化</td><td>无</td><td>JSON 文件</td><td>JSON 文件</td></tr><tr><td>出站策略</td><td>eBPF TC / iptables</td><td><code>EgressFilter</code>（PRO）</td><td>Pod iptables/eBPF</td></tr><tr><td>SOCKS5 代理</td><td>无</td><td>✅（<code>sandbox run</code> 自动注入）</td><td>无（直接路由）</td></tr><tr><td>入站转发</td><td>无</td><td><code>ForwardListener</code>（PRO）</td><td>无</td></tr><tr><td>ICE / LRP</td><td>✅</td><td>✅</td><td>✅</td></tr></tbody></table><hr><h2 id="代码文件结构" tabindex="-1">代码文件结构 <a class="header-anchor" href="#代码文件结构" aria-label="Permalink to &quot;代码文件结构&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>cmd/lattice/cmd/sandbox/</span></span>
<span class="line"><span>├── sandbox.go              # 命令注册（start + run 子命令）</span></span>
<span class="line"><span>├── sandbox_run.go          # \`sandbox run\` 实现：exec AI Agent + ALL_PROXY 注入</span></span>
<span class="line"><span>├── sandbox_shared.go       # 共享工具（凭证读写、fileAuditWriter）</span></span>
<span class="line"><span>├── sandbox_community.go    # //go:build !pro — 社区版（pod 模式）</span></span>
<span class="line"><span>├── sandbox_pro.go          # //go:build pro  — PRO 入口 + 参数校验</span></span>
<span class="line"><span>├── sandbox_agent.go        # //go:build pro  — \`lattice sandbox agent\` 子命令（手动调试）</span></span>
<span class="line"><span>├── driver.go               # DriverConfig + IsolationDriver 接口</span></span>
<span class="line"><span>├── driver_pod.go           # //go:build pro  — PodDriver（进程内 gVisor netstack）</span></span>
<span class="line"><span>├── driver_runsc.go         # //go:build pro  — RunscDriver（两阶段 bootstrap + runsc）</span></span>
<span class="line"><span>└── sandbox_agent_register*.go  # agent 子命令注册</span></span>
<span class="line"><span></span></span>
<span class="line"><span>internal/agent/</span></span>
<span class="line"><span>├── gvisor/                 # 进程内 gVisor netstack（pod 模式）</span></span>
<span class="line"><span>│   ├── sandbox.go          # gvisor.New() 入口</span></span>
<span class="line"><span>│   ├── tun_adapter.go      # TUNAdapter：gVisor ↔ wireguard-go 桥接</span></span>
<span class="line"><span>│   └── provisioner.go      # SandboxProvisioner（无 iptables）</span></span>
<span class="line"><span>├── runsc/                  # runsc OCI 容器生命周期（gvisor 模式）</span></span>
<span class="line"><span>│   └── runsc.go            # Manager：OCI spec 生成 + 容器 start/stop</span></span>
<span class="line"><span>└── config/</span></span>
<span class="line"><span>    └── config.go           # SignalingURL, StunUrl, Port, WgPort 等字段</span></span></code></pre></div><h3 id="社区版-vs-pro-编译标签" tabindex="-1">社区版 vs PRO 编译标签 <a class="header-anchor" href="#社区版-vs-pro-编译标签" aria-label="Permalink to &quot;社区版 vs PRO 编译标签&quot;">​</a></h3><div class="language-go vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">go</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// sandbox_community.go</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">//go:build !pro</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// sandbox_pro.go, sandbox_agent.go, driver_pod.go, driver_runsc.go</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">//go:build pro</span></span></code></pre></div><p>社区版仅支持 pod 模式（不含 EgressFilter/ForwardListener/HTTP proxy）；gVisor runsc 模式为 PRO 独占。构建：<code>make EDITION=pro build</code>。</p><hr><h2 id="启动流程" tabindex="-1">启动流程 <a class="header-anchor" href="#启动流程" aria-label="Permalink to &quot;启动流程&quot;">​</a></h2><h3 id="pod-模式-sandbox-pro-go-→-poddriver-start" tabindex="-1">pod 模式（<code>sandbox_pro.go</code> → <code>PodDriver.Start()</code>） <a class="header-anchor" href="#pod-模式-sandbox-pro-go-→-poddriver-start" aria-label="Permalink to &quot;pod 模式（\`sandbox_pro.go\` → \`PodDriver.Start()\`）&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>1. 解析 egress 策略（CIDR allowlist/denylist）</span></span>
<span class="line"><span>2. 加载凭证 /etc/lattice/sandbox-credentials.json</span></span>
<span class="line"><span>   ├── 存在 → ResumeSandboxViaNATS(jwt, privKey)</span></span>
<span class="line"><span>   └── 不存在 → 走新注册</span></span>
<span class="line"><span>3. 新注册：wgtypes.GeneratePrivateKey() → RegisterSandboxViaNATS(...)</span></span>
<span class="line"><span>4. gvisor.New(Config{ID, LocalIP, AuditWriter, PolicyChecker})</span></span>
<span class="line"><span>5. gvisor.NewTUNAdapter(sb.Channel(), InjectIntoChannel)</span></span>
<span class="line"><span>6. agent.NewNode(ctx, NodeConfig{CustomTUN, CurrentPeer, ProvisionerFactory})</span></span>
<span class="line"><span>7. node.Start(ctx) + go node.StartHeartbeat(ctx)</span></span>
<span class="line"><span>8. 可选：Socks5Server + ForwardListener</span></span>
<span class="line"><span>9. 阻塞等待 SIGINT/SIGTERM → node.Stop()</span></span></code></pre></div><h3 id="gvisor-模式-sandbox-pro-go-→-runscdriver-start" tabindex="-1">gvisor 模式（<code>sandbox_pro.go</code> → <code>RunscDriver.Start()</code>） <a class="header-anchor" href="#gvisor-模式-sandbox-pro-go-→-runscdriver-start" aria-label="Permalink to &quot;gvisor 模式（\`sandbox_pro.go\` → \`RunscDriver.Start()\`）&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Phase 1 — bootstrapAgent(ctx) 在 pod 内核:</span></span>
<span class="line"><span>  与 pod 模式步骤 2-7 相同，但无需 CustomTUN 和 ProvisionerFactory</span></span>
<span class="line"><span>  （使用真实 /dev/net/tun，创建真实的 kernel wg0）</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Phase 2 — runsc 容器:</span></span>
<span class="line"><span>  1. runsc.NewManager(Config{SandboxID, RootFS, AgentBinary, AgentArgs})</span></span>
<span class="line"><span>  2. mgr.Create()  → 写 OCI config.json（PID 1 = AgentBinary）</span></span>
<span class="line"><span>  3. mgr.Start(ctx) → runsc --network=host run &lt;sandbox-id&gt;</span></span>
<span class="line"><span>  4. 阻塞 select { ctx.Done() / mgr.Done() }</span></span>
<span class="line"><span>  5. defer node.Stop()（Phase 1 清理）</span></span></code></pre></div><h3 id="sandbox-run-流程-sandbox-run-go" tabindex="-1"><code>sandbox run</code> 流程（<code>sandbox_run.go</code>） <a class="header-anchor" href="#sandbox-run-流程-sandbox-run-go" aria-label="Permalink to &quot;\`sandbox run\` 流程（\`sandbox_run.go\`）&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>1. 解析 -- 之后的命令行作为子进程命令</span></span>
<span class="line"><span>2. 调用 driver.Start(ctx)（与 sandbox start 相同的沙箱启动逻辑）</span></span>
<span class="line"><span>3. 等待 WireGuard 就绪信号（driver.Ready() channel，超时 --ready-timeout）</span></span>
<span class="line"><span>4. 获取 SOCKS5 实际监听地址（driver.ProxyAddr()）</span></span>
<span class="line"><span>5. 构造注入环境：</span></span>
<span class="line"><span>   env = os.Environ()</span></span>
<span class="line"><span>   env = append(env, &quot;ALL_PROXY=socks5://&quot;+proxyAddr)</span></span>
<span class="line"><span>   env = append(env, &quot;all_proxy=socks5://&quot;+proxyAddr)</span></span>
<span class="line"><span>   env = append(env, &quot;LATTICE_SANDBOX_NAME=&quot;+name)</span></span>
<span class="line"><span>6. cmd = exec.CommandContext(ctx, args[0], args[1:]...)</span></span>
<span class="line"><span>   cmd.Env = env</span></span>
<span class="line"><span>   cmd.Stdin/Stdout/Stderr = os.Stdin/Stdout/Stderr</span></span>
<span class="line"><span>7. cmd.Start()</span></span>
<span class="line"><span>8. go 监听 cmd.Wait() → exitCode</span></span>
<span class="line"><span>9. select:</span></span>
<span class="line"><span>   - cmd.Wait() 完成 → driver.Stop() → os.Exit(exitCode)</span></span>
<span class="line"><span>   - ctx.Done() → cmd.Process.Signal(SIGTERM) → 5s → SIGKILL → driver.Stop()</span></span></code></pre></div><hr><h2 id="凭证持久化" tabindex="-1">凭证持久化 <a class="header-anchor" href="#凭证持久化" aria-label="Permalink to &quot;凭证持久化&quot;">​</a></h2><div class="language-go vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">go</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// sandbox_shared.go</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">type</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> sandboxCredentials</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> struct</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    PrivateKey </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">string</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> \`json:&quot;privateKey&quot;\`</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   // base64-encoded WireGuard private key</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    JWT        </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">string</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> \`json:&quot;jwt&quot;\`</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">          // Agent JWT</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 路径：$LATTICE_CONFIG_DIR/sandbox-credentials.json</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 默认：/etc/lattice/sandbox-credentials.json</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 权限：0600</span></span></code></pre></div><p>两种模式共享同一套凭证持久化机制。在 gVisor 模式下，凭证仅存在于 pod 内核（Phase 1），不会暴露给 gVisor 容器。</p><hr><h2 id="审计日志" tabindex="-1">审计日志 <a class="header-anchor" href="#审计日志" aria-label="Permalink to &quot;审计日志&quot;">​</a></h2><h3 id="当前-本地文件" tabindex="-1">当前（本地文件） <a class="header-anchor" href="#当前-本地文件" aria-label="Permalink to &quot;当前（本地文件）&quot;">​</a></h3><div class="language-go vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">go</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">type</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> fileAuditWriter</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> struct</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{ f </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">*</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">os</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">File</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> }</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">func</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">w </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">*</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">fileAuditWriter</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Write</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">event</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> shimfwd</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">AuditEvent</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">error</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    line, _ </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> json.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Marshal</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(event)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    _, err </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> fmt.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Fprintf</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(w.f, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">%s\\n</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, line)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> err</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><p>输出路径（pod 模式）：<code>/tmp/lattice-audit-&lt;name&gt;.jsonl</code></p><h3 id="未规划" tabindex="-1">未规划 <a class="header-anchor" href="#未规划" aria-label="Permalink to &quot;未规划&quot;">​</a></h3><ul><li>sandbox 侧 <code>natsAuditWriter</code>（将审计事件发布到 NATS <code>lattice.audit.flow</code>）。服务端 <code>AuditConsumer</code> 已就绪，但 sandbox 侧尚未实现。</li><li>gVisor 模式审计（需设计如何在 gVisor sentry 与 pod 内核间传递审计事件）。</li></ul><hr><h2 id="未规划-未来方向" tabindex="-1">未规划（未来方向） <a class="header-anchor" href="#未规划-未来方向" aria-label="Permalink to &quot;未规划（未来方向）&quot;">​</a></h2><p>以下设计在讨论文档中提出，但<strong>当前代码中未实现</strong>：</p><ul><li><strong>eBPF cgroup_sock_addr 透明代理</strong>：通过 <code>BPF_PROG_TYPE_CGROUP_SOCK_ADDR</code> 在内核层将 AI Agent 的所有出站连接重定向到 SOCKS5 代理，无需 Agent 感知 <code>ALL_PROXY</code>。适用于 Agent 不识别 <code>ALL_PROXY</code> 的场景（如自定义网络库）。需要 root 权限 + Linux 5.7+。</li><li><strong>eBPF sockops</strong>（<code>BPF_PROG_TYPE_CGROUP_SOCK_ADDR</code>）——通过 cgroup eBPF 在内核层强制所有 Agent 流量走 gVisor netstack，消除&quot;Agent 不设代理即可绕过&quot;的漏洞</li><li><strong>eBPF TC filter on wf0</strong> —— 将 eBPF 策略附加到 wf0 TUN 接口，在内核层过滤</li><li><strong>seccomp notify</strong> —— 通过 seccomp 用户态通知机制精确控制 Agent 的 socket 调用</li><li><strong>Sidecar 劫持</strong> —— 在 K8s Pod 内通过 iptables 劫持所有 Agent 出站流量</li></ul><p>参见 <code>docs/faq/ebpf-sandbox.md</code> 和 <code>docs/superpowers/adr/0001-gvisor-library-vs-runsc.md</code>。</p><hr><h2 id="命令行参考" tabindex="-1">命令行参考 <a class="header-anchor" href="#命令行参考" aria-label="Permalink to &quot;命令行参考&quot;">​</a></h2><h3 id="lattice-sandbox-run-推荐" tabindex="-1"><code>lattice sandbox run</code>（推荐） <a class="header-anchor" href="#lattice-sandbox-run-推荐" aria-label="Permalink to &quot;\`lattice sandbox run\`（推荐）&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>lattice sandbox run [flags] -- &lt;command&gt; [args...]</span></span>
<span class="line"><span></span></span>
<span class="line"><span>必填:</span></span>
<span class="line"><span>  --name            string   Sandbox 标识符</span></span>
<span class="line"><span>  --server-url      string   Lattice 控制面 URL</span></span>
<span class="line"><span>  --token           string   Enrollment token</span></span>
<span class="line"><span></span></span>
<span class="line"><span>可选:</span></span>
<span class="line"><span>  --mode            string   隔离模式：pod（默认）| gvisor（PRO）</span></span>
<span class="line"><span>  --proxy-addr      string   SOCKS5 代理监听地址（默认 127.0.0.1:0，随机端口）</span></span>
<span class="line"><span>  --egress-allow    string   允许出站的 CIDR 列表（逗号分隔）</span></span>
<span class="line"><span>  --egress-default-deny      启用出站白名单模式</span></span>
<span class="line"><span>  --forward         strings  入站转发规则（格式: overlayPort:targetAddr）</span></span>
<span class="line"><span>  --ready-timeout   duration WireGuard 就绪超时（默认 10s）</span></span>
<span class="line"><span></span></span>
<span class="line"><span>注: -- 后的所有内容作为 AI Agent 子命令执行</span></span></code></pre></div><h3 id="lattice-sandbox-start-底层" tabindex="-1"><code>lattice sandbox start</code>（底层） <a class="header-anchor" href="#lattice-sandbox-start-底层" aria-label="Permalink to &quot;\`lattice sandbox start\`（底层）&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>lattice sandbox start [flags]</span></span>
<span class="line"><span></span></span>
<span class="line"><span>必填:</span></span>
<span class="line"><span>  --name            string   Sandbox 标识符</span></span>
<span class="line"><span>  --server-url      string   Lattice 控制面 URL</span></span>
<span class="line"><span>  --token           string   Enrollment token</span></span>
<span class="line"><span></span></span>
<span class="line"><span>可选:</span></span>
<span class="line"><span>  --mode            string   隔离模式：pod（默认）| gvisor（PRO）</span></span>
<span class="line"><span>  --ready-wait      duration WireGuard 就绪等待（agent 子命令，默认 3s）</span></span>
<span class="line"><span></span></span>
<span class="line"><span>pod 模式（PRO）:</span></span>
<span class="line"><span>  --proxy-addr      string   SOCKS5 代理监听地址（如 127.0.0.1:1080）</span></span>
<span class="line"><span>  --forward         strings  入站转发规则（格式: overlayPort:targetAddr）</span></span>
<span class="line"><span>  --egress-allow    string   允许出站的 CIDR 列表（逗号分隔）</span></span>
<span class="line"><span>  --egress-default-deny      启用出站白名单模式</span></span>
<span class="line"><span></span></span>
<span class="line"><span>gvisor 模式（PRO）:</span></span>
<span class="line"><span>  --agent-rootfs    string   容器根文件系统路径</span></span>
<span class="line"><span>  --agent-binary    string   AI agent 入口二进制</span></span>
<span class="line"><span>  --agent-args      strings  AI agent 启动参数</span></span></code></pre></div>`,79)])])}const k=a(e,[["render",p]]);export{g as __pageData,k as default};

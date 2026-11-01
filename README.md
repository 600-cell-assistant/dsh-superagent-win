# dsh-superagent-win

> **非官方 · Unofficial.** 这是 [deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype) 的 **Windows 移植参考实现**：把它改到能在 Windows 的 DeepSeek Harness 里加载运行，并把智能体身份从"整个 DSH 进程"缩小到"每一次命令"。不是 DeepSeek 官方发布物，也未获官方背书。
> A Windows port of DeepSeek Harness's research prototype `dsh-superagent`, with the agent identity scoped to each worker command instead of the whole DSH process.

---

## 这是什么

`dsh-superagent` 是一个"主动式编码智能体"：监听 GitHub（可选飞书），把「某人请求做某件事」变成工单，在独立 DSH 会话里干活，干完回到原处交付（评论 / 分支 / PR），并带一个面板。

它以 **DSH bundle（插件包）** 形式工作：`dsh plugin --profile <profile> add <本包>`，加载后 DSH 侧栏多一个 **Superagent** 入口。

本仓库 = 上游源码 + 两类改动：

1. **Windows 兼容补丁** —— 上游原本只能在 POSIX 上启动；
2. **按命令下发身份** —— 把上游"改写整个进程环境"改为"只改写每次命令的环境"。

逐条差异见 [UPSTREAM.md](UPSTREAM.md)。上游设计文档仍保留在 [`docs/`](docs/)；`SETUP.md` 描述的是上游流程，Windows 上的实际步骤见下方"安装"。

---

## 与上游的行为差异

上游 `applyEnvironment()` 改写 **DSH 进程**的 `PATH` 与 `GIT_CONFIG_GLOBAL`，因此要求跑在**专用 profile**（上游文档原话：*keep it separate from the profile you work in*）。

本移植把同样这些变量改为随**每次命令**下发（DSH 的 `ShellExecSpec.env` → `SubprocessSpawnSpec.env`）：

| | 上游 | 本移植 |
| --- | --- | --- |
| worker 的 `PATH` / git 配置 | agent 的 | agent 的（等价） |
| 同 profile 里**你自己**的会话 | `PATH` / git 配置被接管 | 不受影响 |
| 是否可并入日常 profile | 不建议 | 可以（`isolateEnvironment: true`） |

`isolateEnvironment` 是本移植新增的插件配置：`true`（默认）= 按命令下发；`false` = 完全不下发，worker 用宿主账号。

---

## 安装（Windows）

前置：DeepSeek Harness（`dsh` 0.2.1-rc 系列）、Node.js 22.19+/24+、pnpm、Git for Windows、GitHub CLI（`gh`，已 `auth login`）。

```powershell
# 1) 取源码并构建
git clone https://github.com/buyou-claw/dsh-superagent-win.git
cd dsh-superagent-win
pnpm install
pnpm build

# 2) 装进一个 profile（示例：新建 superagent profile）
dsh superagent --from-default-profile web --dump-config > $null
dsh plugin --profile superagent add "link:$PWD"
```

3) 写 `$DSH_HOME\profiles\superagent\cordis.patch.yml`：

```yaml
- id: webserver
  config:
    host: 127.0.0.1
    port: 3082
- id: dsh-superagent
  config:
    stateDir: C:\Users\<you>\.dsh\state\superagent   # 必填，绝对路径
    isolateEnvironment: true                        # 默认值；false = 不下发 agent 身份
```

4) 启动 `dsh --profile superagent`，打开日志里带 token 的 URL，侧栏选 **Superagent**：在「设置 → 来源」填仓库（`owner/name`）与 `gh` 路径，在「设置 → 策略」加允许派活的账号。

> 也可以并入**日常使用**的 profile：`dsh plugin --profile <你的profile> add "link:$PWD"`，并在该 profile 的 patch 里加同一段 `dsh-superagent` 配置。`isolateEnvironment: true` 不影响你其他会话。

---

## Windows 上的注意点

| 事项 | 说明 |
| --- | --- |
| `gh` / `lark-cli` 的 PATH shim | **不生成**。Windows 无法用无扩展名脚本遮蔽同名程序，worker 直接用 PATH 上的 `gh`；`blockedCommands` 仍生效（`.cmd` 存根）。 |
| `prepare` 命令 | 用 **PowerShell 语法**（`$env:DSH_SUPERAGENT_DIR` 等），不是 `sh`。 |
| worker 提交身份 | 隔离开启时 worker 的 git 带 `useConfigOnly = true`，提交必须显式给作者；提示词的 Delivery 段落已带 `DSH_SUPERAGENT_GITHUB_COMMIT_EMAIL`。 |
| 面板端口 | 与其它 DSH profile 分开（示例 3082）。 |

---

## 已知限制

- 上游是研究原型；本移植只做"能在 Windows 跑 + 身份范围更小"，不改变其设计取舍。
- 仓库里的单元测试是 POSIX 形态（依赖 `sh`、`sleep`、`/tmp`），在 Windows 上会失败；交叉验证请在 WSL/Linux 里 `pnpm vitest run`。
- 移动端、多用户、远程部署未验证。

---

## 与上游同步

[UPSTREAM.md](UPSTREAM.md) 列出全部改动的位置与理由，便于上游更新后逐条 rebase，也便于把补丁提回上游。

## 许可

MIT，见 [LICENSE](LICENSE)。版权归上游作者所有；本仓库的修改同样以 MIT 发布。

## 相关

- 上游原型：<https://github.com/deepseek-ai/dsh-superagent-prototype>
- DeepSeek Harness：<https://www.deepseek.com/en/harness/>

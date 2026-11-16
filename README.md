# PPT Studio

PPT Studio 是本地视觉工作台。这一支有两条入口：

- **SVG 演示**仍是默认入口。它用本地逻辑替换第 2 页标题，不连接 Codex，不调用 PPT-Master，不导出 PPTX。
- **原生 PPTX 回合**导入一份 `.pptx`，按页码和形状编号替换一个文本框，采纳后再用 PPT-Master 导出仍可编辑的 `.pptx`。候选本身是确定性文字替换，没有模型调用，也不做整页重生成、全局关系图、PPTist 或 ONLYOFFICE。

## 运行

这一轮实际使用的运行时是 Node.js v22.23.4、npm 10.9.9。

```bash
npm ci
npm run dev
```

开发服务器默认监听 [http://localhost:5173](http://localhost:5173)。只看 SVG 演示时，这样就能打开。

```bash
npm run build
npm test
```

`npm run build` 会先做 TypeScript 检查，再打包。`npm test` 覆盖 SVG 标题替换、版本状态，以及按形状编号替换文本。

## SVG 演示

样例文稿是虚构的「星河零售 2026 Q3 业务回顾」，共 3 页。第 2 页原稿标题是「会员与即时达拉动增长」。顶栏点「SVG 演示」可以回到这条入口。工作流状态固定为「模拟 / 未知」。

1. 打开画板。按页序看到 3 张真实 SVG 缩略图，每张带有 SVG 来源标记和证据摘要。第 3 页摘要为「未知」。
2. 点击第 2 页，进入幻灯片工作区。点「返回画板」可以回到画板。顶栏的「画板 / 工作区」也在同一画布内切换，不新开窗口。
3. 再次进入第 2 页。点击 SVG 标题。标题出现选中框，侧栏写明当前页，并显示「选中元素 · 标题」。用页码切换页面时，侧栏跟着当前页变化。
4. 打开「依据」。第 2 页可以打开「经营会文稿 · 增长段」。切到第 3 页，打开「会后行动清单」或「十二城扩张名单」，来源和正文都是「未知」。
5. 回到第 2 页，打开「对话」。工作区始终能看到「模拟执行」和「SVG 编辑预览」。「PPTX 交付预览 · 不可用」不是通过。「整页重生成」和「先提方案」是禁用的，标明「今晚未实现 · 后续迭代」。
6. 选中标题，输入「会员复购撑起这一季」，点「局部修改」。画布默认并排对照。左侧当前版本仍是原稿标题。点「退回」。第 2 页当前版本和画板缩略图仍是「会员与即时达拉动增长」。
7. 再次选中标题，输入「即时达改写了增长结构」，点「局部修改」。确认左侧仍是旧标题后，点「采纳」。
8. 第 2 页只有标题变成新文字。正文、数字卡和柱状图仍在。回到画板，第 2 页缩略图已更新，第 1 页和第 3 页与原稿一致。
9. 打开「版本」，打开「v1 · 原稿」，可以看到采纳前的旧标题。当前版本不会被这次回看替换。

对照截图见 `docs/verify-side-by-side.png`。

## 原生 PPTX 回合

这条路径复用同一块画板、工作区、侧栏（对话 / 依据 / 版本）和并排对照。导入、导出走 PPT-Master 的 Edit Native PPTX round-trip。中间那一步只替换选中文本框里的一段文字，按页码和形状编号定位，不按可见文字查找。

### 上游

- 仓库：<https://github.com/hugohe3/ppt-master>
- 提交：`3af3e8ef774c4d67ee57e1306d9256d08c9ee1bf`
- 流程文档：<https://github.com/hugohe3/ppt-master/blob/3af3e8ef774c4d67ee57e1306d9256d08c9ee1bf/skills/ppt-master/workflows/edit-native-pptx.md>

安装（脚本会克隆上面的提交，并安装 `python-pptx` 和 `Pillow`）：

```bash
bash scripts/setup-ppt-master.sh
export PPT_MASTER_ROOT="$HOME/ppt-master"
```

服务也会依次查找 `PPT_MASTER_ROOT`、仓库旁的 `../ppt-master`、`/tmp/ppt-master` 和 `$HOME/ppt-master`。

命令行先走通同一条管道，再接到界面上：

```bash
python3 "$PPT_MASTER_ROOT/skills/ppt-master/scripts/pptx_to_svg.py" \
  samples/xinghe-retail-q3.pptx \
  -o /tmp/xinghe-workspace \
  --inheritance-mode both \
  --roundtrip

# 只改 authoring-svg-flat/slide_02.svg 里
# id="shape-3" 且 data-pptx-source-ref="slide:3" 的那一段文字

python3 "$PPT_MASTER_ROOT/skills/ppt-master/scripts/svg_to_pptx.py" \
  /tmp/xinghe-workspace \
  --roundtrip \
  --primary-language zh-CN \
  -o /tmp/xinghe-exported.pptx
```

仓库里的 `npm run prove-pptx` 用同一组命令和同一段替换函数跑完，并核对 OOXML。

### 启动服务和前端

两个终端都在仓库根目录：

```bash
export PPT_MASTER_ROOT="$HOME/ppt-master"
npm run pptx-service
```

```bash
npm run dev
```

`pptx-service` 监听 `127.0.0.1:8787`。Vite 把 `/api` 代理到这个端口。导入失败或导出失败时，界面会显示服务返回的原文，不会改成一条笼统的成功。

### 样例

`samples/xinghe-retail-q3.pptx` 由 `scripts/build_sample_pptx.py` 生成，共 3 页。第 2 页有两个可见文字同为「会员与即时达拉动增长」的文本框：

| 页 | 形状编号 | 形状名 | 文字 |
| --- | --- | --- | --- |
| 2 | 3 | title-left | 会员与即时达拉动增长 |
| 2 | 4 | title-right | 会员与即时达拉动增长 |

重新生成样例：`npm run sample-pptx`。生成时间会写进包里的核心属性，所以字节不会和已提交的文件相同。

### 复现

1. 按上面启动服务和前端。打开画板，确认仍是 SVG 演示。
2. 点「样例 PPTX」，或用「导入 PPTX」选择 `samples/xinghe-retail-q3.pptx`。画板出现 3 张缩略图。对话里会写明第 2 页两个同文本文本框的形状编号。这一步没有调用模型。
3. 打开第 2 页，点击左侧标题。选中框出现，侧栏写「第 2 页」和「选中元素 · 形状 3 · title-left」。
4. 在「对话」输入「会员复购撑起这一季」，点「局部修改」。左侧当前版本仍是原稿，右侧只有形状 3 变成新文字，形状 4 仍是原句。点「退回」。当前页和画板缩略图都回到原稿，没有导出 PPTX。
5. 再次点选形状 3，输入「即时达改写了增长结构」，点「局部修改」。确认左侧未改后，点「采纳」。服务这时才运行 `svg_to_pptx.py --roundtrip`。
6. 采纳后点「下载 PPTX」。第 2 页缩略图只更新被选中的文本框，第 1 页和第 3 页不变。打开「版本」里的「v1 · 原稿」，可以看到采纳前的旧文字，也可以下载原稿 PPTX。

并排对照截图：`docs/native-pptx-side-by-side.png`。浏览器采纳后下载的文件：`docs/xinghe-retail-q3-shape3.pptx`。

导入的 PPTX 没有附带依据，依据页会直接写明，不补来源。

### 这一轮核对过的结果

命令行和浏览器都跑过。导出包相对样例：

- `ppt/slides/slide1.xml`、`ppt/slides/slide3.xml` 以及三页的 slide rels 字节相同。
- `ppt/slides/slide2.xml` 里，除形状 3 以外的 `p:sp` 规范化后相同。形状 4 的文字仍是「会员与即时达拉动增长」。
- 形状 3 保留 `id="3"`、名称 `title-left`、位置 `457200,365760`、尺寸 `5486400×640080`、字号 28pt、加粗和 Microsoft YaHei。文字换成「即时达改写了增长结构」。
- PPT-Master 会按 SVG 重建这个被改过的文本框：`cNvSpPr` 不再带 `txBox="1"`，`bodyPr` 从 `wrap="square"` 变成 `wrap="none"` 并带上边距。文字仍在 `a:t` 里，python-pptx 能读成文本框段落。
- `[Content_Types].xml` 只有 XML 声明和属性之间的空格不同，部件清单没有增减。

验证工具是 OOXML 解包比对和 python-pptx 1.0.2。本机没有 PowerPoint，也没有 LibreOffice。**PowerPoint 打开与编辑待人工验收。** LibreOffice 未安装，未验证。

`npm ci`、`npm run build`、`npm test` 都在 Node.js v22.23.4、npm 10.9.9 上跑过。`npm test` 为 14 项通过。`npm run prove-pptx` 的导出摘要是 `output_pages=3 passthrough=2 cloned_passthrough=0 patched=0 rebuilt=1`。

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

导入和预览仍走 PPT-Master。写回不走 `svg_to_pptx.py`：导出时按页码和形状编号找到源 PPTX 里对应形状的那一个 `<a:t>`，只改这段文字。

```bash
python3 "$PPT_MASTER_ROOT/skills/ppt-master/scripts/pptx_to_svg.py" \
  samples/xinghe-retail-q3.pptx \
  -o /tmp/xinghe-workspace \
  --inheritance-mode both \
  --roundtrip
```

`npm run prove-pptx` 会先跑上面的导入，再对样例做 OOXML 文本补丁：第 2 页形状 3 的 `<a:t>` 换成新文字，然后把这段文字改回原句，整页 slide XML 必须与源文件相同。找不到唯一形状，或多段文字，会失败并且不改当前文件。连续两次补丁会叠在上一份成功结果上。

### 启动服务和前端

两个终端都在仓库根目录：

```bash
export PPT_MASTER_ROOT="$HOME/ppt-master"
npm run pptx-service
```

```bash
npm run dev
```

`pptx-service` 只监听 `127.0.0.1:8787`，不绑 `0.0.0.0`，也不发跨域头。浏览器通过 Vite 的 `/api` 代理访问。导入失败或导出失败时，界面会显示服务返回的原文，不会改成一条笼统的成功。

从 PPTX 导入的 SVG 在画板缩略图、工作区、候选对照和版本回看里都会先过白名单，再画到页面上。这只影响显示副本。写回用的是原包里的 OOXML，不是这段净化后的 SVG。

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
5. 再次点选形状 3，输入「即时达改写了增长结构」，点「局部修改」。确认左侧未改后，点「采纳」。服务这时才把形状 3 的 `<a:t>` 写进上一份 PPTX。
6. 采纳后点「下载 PPTX」。第 2 页缩略图只更新被选中的文本框，第 1 页和第 3 页不变。打开「版本」里的「v1 · 原稿」，可以看到采纳前的旧文字，也可以下载原稿 PPTX。再采纳形状 4 的另一段文字时，下载文件里两次修改都在。

并排对照截图：`docs/native-pptx-side-by-side.png`。浏览器采纳后下载的文件：`docs/xinghe-retail-q3-shape3.pptx`。

导入的 PPTX 没有附带依据，依据页会直接写明，不补来源。

### 这一轮核对过的结果

写回只改 `<a:t>` 的字符数据。把第 2 页形状 3 的文字改回「会员与即时达拉动增长」之后，整页 `ppt/slides/slide2.xml` 与源文件字节相同，因此 `txBox="1"`、`bodyPr wrap="square"`、自动调整、字体、字号、位置和尺寸都还在。形状 4 在只改形状 3 时不变。第 1 页、第 3 页的 slide XML 和三页的 slide rels，以及 `[Content_Types].xml`，与源包字节相同。

连续采纳会基于上一份成功导出的 PPTX。先改形状 3，再改形状 4，下载文件里两处新文字都在。找不到形状，或多段文字，会报错并且不改当前文件。

验证工具是 OOXML 解包比对。本机没有 PowerPoint，也没有 LibreOffice。**PowerPoint 打开与编辑待人工验收。** LibreOffice 未安装，未验证。

`npm ci`、`npm run build`、`npm test`、`npm run prove-pptx` 都在 Node.js v22.23.4、npm 10.9.9 上跑过。

import { currentVersion, slideById } from "../lib/deckState";
import { readTitleText } from "../lib/rewriteTitle";
import { useStudio } from "../studio";
import type { EvidenceRecord, TabId } from "../types";

const TABS: { id: TabId; label: string }[] = [
  { id: "chat", label: "对话" },
  { id: "evidence", label: "依据" },
  { id: "versions", label: "版本" },
];

export function Sidebar() {
  const studio = useStudio();
  const page = slideById(studio.deck, studio.pageId);
  const version = currentVersion(page);
  const title = readTitleText(version.svg) ?? page.fallbackTitle;
  const candidate = studio.deck.candidate?.pageId === page.id ? studio.deck.candidate : null;
  const sameTitle = titleDraftEquals(studio.titleDraft, title);
  const canEdit =
    studio.selected === "title" &&
    studio.titleDraft.trim().length > 0 &&
    !sameTitle &&
    !studio.inspectVersionId;

  return (
    <aside className="sidebar" data-testid="sidebar">
      <div className="side-context" data-testid="side-context">
        <p className="eyebrow">当前</p>
        <p data-testid="context-page">第 {page.page} 页 · {page.kicker}</p>
        <p className="context-title" data-testid="context-title">
          {title}
        </p>
        <p data-testid="context-selection">
          {studio.selected === "title" ? "选中元素 · 标题" : "选中元素 · 未选中"}
        </p>
      </div>
      <div className="side-tabs" role="tablist" aria-label="侧栏">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={studio.tab === item.id}
            aria-controls={`panel-${item.id}`}
            data-testid={`tab-${item.id}`}
            className={studio.tab === item.id ? "is-active" : ""}
            onClick={() => studio.setTab(item.id)}
          >
            {item.label}
            {item.id === "versions" && studio.deck.candidate ? <i className="tab-dot" /> : null}
          </button>
        ))}
      </div>
      <div className="side-body" role="tabpanel" id={`panel-${studio.tab}`} aria-labelledby={`tab-${studio.tab}`}>
        {studio.tab === "chat" ? (
          <div className="chat-panel">
            <div className="chat-log" data-testid="chat-log">
              {studio.chat.map((message) => (
                <p key={message.id} className={message.role === "user" ? "chat-user" : "chat-note"}>
                  {message.text}
                </p>
              ))}
            </div>
            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                studio.localEdit();
              }}
            >
              <label htmlFor="title-draft">新标题</label>
              <input
                id="title-draft"
                data-testid="title-input"
                value={studio.titleDraft}
                maxLength={28}
                placeholder="输入替换后的标题"
                onChange={(event) => studio.setTitleDraft(event.target.value)}
              />
              <button type="submit" className="btn-primary" data-testid="local-edit" disabled={!canEdit}>
                局部修改
              </button>
              <button type="button" className="path-btn" disabled>
                整页重生成
                <small>今晚未实现 · 后续迭代</small>
              </button>
              <button type="button" className="path-btn" disabled>
                先提方案
                <small>今晚未实现 · 后续迭代</small>
              </button>
            </form>
          </div>
        ) : null}

        {studio.tab === "evidence" ? (
          <div className="evidence-panel" data-testid="evidence-panel">
            <p className="panel-lead">只列出这一页的样本记录。没有来源的条目写明未知，不补一条假出处。</p>
            <ul className="record-list">
              {page.evidence.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    className={studio.openEvidenceId === record.id ? "is-open" : ""}
                    data-testid={`evidence-${record.id}`}
                    onClick={() =>
                      studio.setOpenEvidenceId(studio.openEvidenceId === record.id ? null : record.id)
                    }
                  >
                    <Grade grade={record.grade} />
                    <span>
                      <strong>{record.title}</strong>
                      <small>{record.kind}</small>
                    </span>
                  </button>
                  {studio.openEvidenceId === record.id ? <EvidenceBody record={record} /> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {studio.tab === "versions" ? (
          <div className="version-panel" data-testid="version-panel">
            {candidate ? (
              <section className="pending-card">
                <p className="eyebrow">待确认</p>
                <p>
                  标题将改为「{candidate.title}」。当前版本仍是「{title}」。
                </p>
                <div className="decision">
                  <button type="button" className="btn-ghost" onClick={studio.reject}>
                    退回
                  </button>
                  <button type="button" className="btn-primary" onClick={studio.accept}>
                    采纳
                  </button>
                </div>
              </section>
            ) : (
              <p className="panel-lead">这一页没有待确认候选。</p>
            )}
            <h2>本页版本</h2>
            <ul className="record-list">
              {[...page.versions].reverse().map((item) => {
                const active = item.id === version.id;
                const inspecting = item.id === studio.inspectVersionId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      data-testid={`version-${item.id}`}
                      className={inspecting || (active && !studio.inspectVersionId) ? "is-open" : ""}
                      onClick={() => studio.openVersion(item.id)}
                    >
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.note}</small>
                      </span>
                      <em>{active ? "当前" : inspecting ? "回看中" : "打开"}</em>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function titleDraftEquals(draft: string, title: string): boolean {
  return draft.replace(/\s+/g, " ").trim() === title;
}

function Grade({ grade }: { grade: EvidenceRecord["grade"] }) {
  const tone =
    grade === "已验证" ? "verified" : grade === "Agent 自述" ? "claimed" : grade === "推断" ? "inferred" : "unknown";
  return <span className={`grade grade-${tone}`}>{grade}</span>;
}

function EvidenceBody({ record }: { record: EvidenceRecord }) {
  const missing = record.excerpt === null;
  return (
    <div className="evidence-body" data-testid={`evidence-body-${record.id}`}>
      <p>
        来源：<strong data-testid={`evidence-source-${record.id}`}>{missing ? "未知" : "演示样本，非项目文件"}</strong>
      </p>
      {missing ? (
        <p className="unknown-mark" data-testid={`evidence-unknown-${record.id}`}>
          未知
        </p>
      ) : (
        <blockquote>{record.excerpt}</blockquote>
      )}
      {record.note ? <p className="evidence-note">{record.note}</p> : null}
      {missing ? <p className="evidence-note">没有可打开的文稿摘录或素材记录。</p> : null}
    </div>
  );
}

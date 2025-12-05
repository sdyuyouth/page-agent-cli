# 🗺️ PageAgent Roadmap

The development progress and future plans for PageAgent.

## 🚀 Current Works

- [x] **MVP** 
  - Core functionality implemented.
- [x] **SPA interaction** 
- [x] **Reasoning and (short) memory**
- [x] **Multi model provider integration and testing**
- [x] **UI with HITL** 
  - Human-in-the-loop user interface. Agent can ask user questions.
- [x] **Landing and doc pages**
- [x] **Remove `ai-sdk`** 
  - Only one function of AI-ADK is being used.
  - Our agent memory and thinking mechanism does not suite ai-sdk.
- [x] **Robust LLM output**
  - Auto-fix incomplete output format of DeepSeek and QWen.
- [x] **Working homepage with live LLM API**
- [x] **~~free~~ CDN**
- [x] **Free evaluation plan**
- [x] **Custom actions and HITL**
- [ ] **Hooks and Events**
  - [x] **lifecycle hooks**
  - [ ] **lifecycle events**
- [ ] **User takeover** 
- [ ] **❗Hijack `page_open/page_change/page_unload` behavior**
- [ ] **Custom knowledge base and instructions**
- [ ] **Black/white-list safeguard**
- [ ] **Data-masking**
- [ ] **Improve Memory**
  - Current phrasing can cause logic-loop for some models.
  - Test adding `Action` to memory.
- [ ] **Optimize for popular UI frameworks**
- [x] **i18n of the website**
  - [x] Chinese version
  - [x] English version
- [x] **Refactor: Separate `Agent` and `PageController`** 
- [ ] **Chrome-ext wrapper**

♻️ Following browser-use's update and contribute back.

## 📋 Pending Features

- [ ] **Tools for more complex tasks**
  - todo list
  - file sys
- [ ] **Support custom llm fetch**
- [ ] **Testing suits**
- [ ] **Same-origin multi-page-app rally**
- [ ] **Local MCP proxy**

## 🤔 To Be Decided

- [ ] **Cross-origin multi-page?** 
  - Tricky
  - Need some kind of "memory rally"

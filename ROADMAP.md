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
  - [#64](https://github.com/alibaba/page-agent/issues/64)
- [ ] **❗Hijack `page_open/page_change/page_unload` behavior**
- [ ] **Custom knowledge base and instructions**
  - [#45](https://github.com/alibaba/page-agent/issues/45)
- [ ] **Black/white-list safeguard**
- [ ] **Data-masking**
  - [#44](https://github.com/alibaba/page-agent/issues/44)
- [ ] **Improve Memory**
  - [#66](https://github.com/alibaba/page-agent/issues/66)
  - [#65](https://github.com/alibaba/page-agent/issues/65)
- [ ] **Optimize for popular UI frameworks**
- [x] **i18n of the website**
  - [x] Chinese version
  - [x] English version
- [x] **Refactor: Separate `Agent` and `PageController`** 
- [ ] **Chrome-ext wrapper for multi-page tasks**

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

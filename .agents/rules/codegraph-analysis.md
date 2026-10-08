# CodeGraph-First Code Analysis & Token Saving Rule

为了在日常代码分析和修改中节省大量 Token（降低 80%~95% 消耗），遵循以下规则：

## 1. 优先使用 CodeGraph 提取骨架，禁止盲目通读大文件
- **禁止行为**：在未定位具体函数前，不要直接使用 `view_file` 读取几十 KB 的大文件（例如 55KB 的 `App.tsx` 一次就会消耗超 1.5 万 Token）。
- **标准流程**：
  1. **影响面排查**：分析某个组件或函数时，先执行 `node scripts/codegraph.mjs impact <SymbolName>` 获取上游调用链和接口定义。
  2. **模块子图获取**：查看某个模块结构时，先执行 `node scripts/codegraph.mjs subgraph <FileName>` 获取依赖与导出声明。
  3. **架构大纲**：需要了解全仓模块分布时，先执行 `node scripts/codegraph.mjs overview`。
  4. **局部精准读取**：通过图谱锁定具体目标函数或行号后，仅对目标片段使用带 `StartLine` 和 `EndLine` 的 `view_file` 精准读取几十行代码。

## 2. 输出要求
- 只输出修改的 Diff 或核心定位结论，禁止将未经修改的数百行组件代码全量回显给用户。

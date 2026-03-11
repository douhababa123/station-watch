# 测试错误记录日志

每次执行计划时发现的错误、原因及修复方式均追加到此文件。

---

## Error #1 — Index.tsx 双组件定义导致语法错误

**发现时间:** 2026-03-11 Task 9 执行中  
**文件:** `src/pages/Index.tsx`  
**错误信息:**
```
ERROR: Expected ")" but found "const"
File: src/pages/Index.tsx:137:0
```
**根本原因:**  
Task 8 改造 Index.tsx 时，旧组件定义未被完整替换，导致新旧两个 `const Index = () => {` 定义并存于同一文件，且新组件缺少 `);` `};` `export default Index;` 结束语句。

**修复方式:**  
1. 第一次替换：在新组件 JSX 末尾 `</div>` 后补加 `);`, `};`, `export default Index;`，同时删除旧组件定义的前半段（`const Index = () => {` + 旧 state 声明）。  
2. 第二次替换：删除残余的旧组件尾段代码（`notifications` state 起到旧 `export default Index;` 止）。

---

## Error #2 — DashboardHeader.tsx 双组件/双 interface 定义

**发现时间:** 2026-03-11 Task 9 执行中（Index.tsx 修复后）  
**文件:** `src/components/dashboard/DashboardHeader.tsx`  
**错误信息:**
```
ERROR: Multiple exports with the same name "DashboardHeader"
ERROR: The symbol "DashboardHeader" has already been declared
File: src/components/dashboard/DashboardHeader.tsx:155:13
```
**根本原因:**  
Task 7 改造 DashboardHeader 时，旧版 interface + 旧版组件未完整删除，新旧两份 `DashboardHeaderProps` interface 和 `export const DashboardHeader` 同时存在。

**修复方式:**  
找到新组件结束后的旧 `interface DashboardHeaderProps {` 起始位置，整段替换为空（只保留新组件的最后一个 `};`）。

**最终结果:** `npm run build` ✅ 0 errors，构建产物 388KB

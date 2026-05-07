# 项目启动操作说明

本项目使用 Vite + React + TypeScript，默认通过 npm 脚本启动。

## 1. 环境要求

启动前请先确认本机已安装：

- Node.js 18 及以上
- npm 9 及以上

可用下面的命令检查版本：

```bash
node -v
npm -v
```

## 2. 首次启动

在项目根目录执行：

```bash
npm install
npm run dev
```

启动成功后，终端会输出本地访问地址。当前项目默认地址通常为：

```text
http://localhost:8080/
```

如果终端显示了其他端口，请以终端输出为准。

## 3. 详细启动步骤

### 步骤 1：进入项目目录

```bash
cd 20260310_TestStation
```

如果你已经在项目根目录，可以跳过这一步。

### 步骤 2：安装依赖

```bash
npm install
```

首次启动必须先安装依赖；后续依赖未变化时通常不需要重复执行。

### 步骤 3：启动开发服务器

```bash
npm run dev
```

说明：

- 该命令会启动 Vite 开发服务器。
- 修改源码后页面会自动热更新。
- 终端中出现 `Local:` 地址表示启动成功。

### 步骤 4：在浏览器中打开项目

优先访问终端输出中的本地地址，例如：

```text
http://localhost:8080/
```

### 步骤 5：停止服务

在启动终端中按：

```text
Ctrl + C
```

## 4. 生产构建与本地预览

### 构建生产包

```bash
npm run build
```

构建产物会输出到 `dist/` 目录。

### 本地预览生产包

```bash
npm run preview
```

该命令用于本地查看生产构建结果，适合在交付前做最终检查。

## 5. 常用命令

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

对应说明：

- `npm run dev`：启动开发环境
- `npm run build`：构建生产包
- `npm run preview`：本地预览构建结果
- `npm run lint`：检查代码规范问题

## 6. 常见问题

### 依赖安装失败

可先确认 Node.js 与 npm 版本是否过低，然后删除 `node_modules` 和锁文件后重新安装。

```bash
rm -rf node_modules
npm install
```

Windows PowerShell 可使用：

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

### 端口被占用

如果 `8080` 被占用，Vite 可能会自动切换到其他端口。启动后请直接使用终端输出的 `Local:` 地址。

### 页面打不开

可按下面顺序排查：

1. 确认终端没有报错。
2. 确认依赖已经安装完成。
3. 确认访问的是终端输出的实际地址，而不是手工猜测的端口。

## 7. 文档关系

- 如果你只想快速跑起来，看 [README](../README.md) 里的简版启动说明。
- 如果你需要完整步骤和排错说明，看本文件。
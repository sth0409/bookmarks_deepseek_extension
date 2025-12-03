# 书签智能整理助手

一个使用 DeepSeek AI 对 Chrome 书签进行智能分类整理，并检测不可访问书签的浏览器扩展。

## 功能特性

- 🤖 **AI 智能分类**：使用 DeepSeek API 对书签按照网址、用途等进行自动分类
- 🔍 **无效书签检测**：自动检测并筛选出不可访问的书签
- 📚 **批量处理**：支持处理大量书签，分批进行 AI 分类
- 🎨 **现代化界面**：美观的用户界面，操作简单直观

## 安装步骤

1. **下载或克隆项目**
   ```bash
   git clone <repository-url>
   cd bookmarks_deepseek_extension
   ```

2. **在 Chrome 中加载扩展**
   - 打开 Chrome 浏览器
   - 访问 `chrome://extensions/`
   - 开启"开发者模式"（右上角）
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹

3. **配置 API 密钥**
   - 点击扩展图标，然后点击设置按钮（⚙️）
   - 或右键扩展图标选择"选项"
   - 输入您的 DeepSeek API 密钥
   - 如果没有密钥，请访问 [DeepSeek 平台](https://platform.deepseek.com) 获取

## 使用方法

### 分类整理

1. 点击扩展图标打开弹窗
2. 点击"📖 加载书签"按钮加载所有书签
3. 点击"🤖 AI分类整理"按钮开始分类
4. 等待分类完成，查看分类结果

### 检测无效书签

1. 切换到"检测无效"标签页
2. 点击"🔍 检测书签可访问性"按钮
3. 等待检测完成
4. 查看不可访问的书签列表

## 文件结构

```
bookmarks_deepseek_extension/
├── manifest.json          # 扩展配置文件
├── popup.html             # 主界面 HTML
├── popup.css              # 主界面样式
├── popup.js               # 主界面逻辑
├── background.js          # 后台服务脚本
├── options.html           # 设置页面 HTML
├── options.css            # 设置页面样式
├── options.js             # 设置页面逻辑
├── icons/                 # 扩展图标（需要自行添加）
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # 说明文档
```

## 注意事项

1. **API 密钥安全**：API 密钥存储在 Chrome 的同步存储中，请妥善保管
2. **网络连接**：需要网络连接才能使用 AI 分类功能
3. **检测速度**：书签可访问性检测可能需要一些时间，请耐心等待
4. **图标文件**：需要自行添加图标文件到 `icons/` 目录，或修改 `manifest.json` 移除图标引用

## 技术栈

- Chrome Extension Manifest V3
- DeepSeek API
- 原生 JavaScript
- Chrome Bookmarks API
- Chrome Storage API

## 开发说明

### 修改 API 端点

如果需要修改 DeepSeek API 端点，请编辑 `popup.js` 中的 `classifyBookmarks` 函数。

### 自定义分类提示词

可以修改 `popup.js` 中 `classifyBookmarks` 函数里的 `prompt` 变量来自定义分类逻辑。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！


# NodeShot

简洁高效的Chrome扩展，精确截取网页DOM元素。

## 功能特点

- **精确截图**：截取网页上的任意DOM元素
- **一键保存**：自动保存为PNG格式图片
- **简单操作**：点击插件图标，选择元素即可截图
- **高质量输出**：支持调整图片质量

## 安装使用

1. 在Chrome浏览器中安装扩展
2. 点击工具栏中的NodeShot图标激活
3. 鼠标悬停在页面元素上，元素会被高亮显示
4. 点击选中的元素进行截图
5. 图片将自动保存到下载文件夹

## 设置选项

在扩展选项中可以调整：

- 图片质量（10-100）
- 文件名前缀

## 项目结构

```
NodeShot/
├── manifest.json          # 插件配置文件
├── background.js          # 后台脚本
├── content.js            # 内容脚本
├── content.css           # 内容样式
├── popup.html            # 弹出页面
├── popup.js              # 弹出页面脚本
├── options.html          # 设置页面
├── options.js            # 设置页面脚本
├── icons/                # 图标文件夹
│   ├── icon16.png        # 16x16 图标
│   ├── icon32.png        # 32x32 图标
│   ├── icon48.png        # 48x48 图标
│   └── icon128.png       # 128x128 图标
└── README.md             # 说明文档
```

## 许可证

MIT License
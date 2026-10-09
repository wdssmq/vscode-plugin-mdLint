# vscode-plugin-mdLint
使用 @lint-md/core 为 Markdown 文件提供格式规则检查。

Git：[https://github.com/wdssmq/vscode-plugin-mdLint](https://github.com/wdssmq/vscode-plugin-mdLint "wdssmq/vscode-plugin-mdLint: 使用 @lint-md/core 为 Markdown 文件提供格式规则检查。")

商店：[https://marketplace.visualstudio.com/items?itemName=wdssmq.mdlint](https://marketplace.visualstudio.com/items?itemName=wdssmq.mdlint "mdLint - Visual Studio Marketplace")

## 配置

在工作区根目录创建 `mdlint.json`，通过 `rules` 配置检查规则。例如：

```json
{
  "rules": {
    "no-long-code": [1, { "length": 137, "exclude": [] }]
  }
}
```

规则配置格式为 `[级别, 规则选项]`：级别 `0` 表示关闭，`1` 表示警告，`2` 表示错误。上例将超过 137 个字符的行标记为警告；省略的规则使用默认配置。

完整规则列表及各规则选项请参阅 [lint-md 文档](https://github.com/lint-md/lint-md#-%E4%B9%A6%E5%86%99%E8%A7%84%E5%88%99%E5%88%97%E8%A1%A8)。

## 开发

使用 pnpm 管理根目录、`client` 和 `server` 的依赖。在项目根目录运行 `pnpm install` 安装依赖，再运行 `pnpm run compile` 编译。

## 引用

vscode-extension-samples/lsp-sample at main · microsoft/vscode-extension-samples：

[https://github.com/microsoft/vscode-extension-samples/tree/main/lsp-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/lsp-sample "vscode-extension-samples/lsp-sample at main · microsoft/vscode-extension-samples")

lint-md/vscode-plugin: Configurable VSCode 💻markdown plugin：

[https://github.com/lint-md/vscode-plugin](https://github.com/lint-md/vscode-plugin "lint-md/vscode-plugin: Configurable VSCode 💻markdown plugin")

## 支持

<table border="1">
  <tr>
    <td>
      <img
        src="https://cdn.jsdelivr.net/gh/wdssmq/wdssmq@main/doc/qr-ali.png"
        alt="qr-ali"
        title="qr-ali"
      />
    </td>
    <td>
      <img
        src="https://cdn.jsdelivr.net/gh/wdssmq/wdssmq@main/doc/qr-wx.png"
        alt="qr-wx"
        title="qr-wx"
      />
    </td>
    <td>
      <img
        src="https://cdn.jsdelivr.net/gh/wdssmq/wdssmq@main/doc/qr-qq.png"
        alt="qr-qq"
        title="qr-qq"
      />
    </td>
  </tr>
  <tr>
    <td align="center" colspan="3">
      <a
        target="_blank"
        href="https://afdian.com/a/wdssmq"
        title="沉冰浮水正在创作和 z-blog 相关或无关的各种有用或没用的代码 | 爱发电"
        ><img
          src="https://cdn.jsdelivr.net/gh/wdssmq/wdssmq@main/doc/afdian.png"
          alt="爱发电"
      /></a>
    </td>
  </tr>
</table>

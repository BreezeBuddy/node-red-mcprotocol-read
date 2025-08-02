# Node-RED MC Protocol Read

这是一个`Node-Red`组件，为使用`MC Protocol`并通过以太网进行通信的`PLC`而开发。单个节点支持一次性读取`PLC`中多个地址的数据。

[![npm version](https://badge.fury.io/js/@yihengnp%2Fnode-red-mcprotocol-read.svg)](https://badge.fury.io/js/@yihengnp%2Fnode-red-mcprotocol-read) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 功能特性

- **多种通信模式**: TCP协议，Binary/ASCII模式，1E/3E/4E帧格式
- **多地址读取**: 同时读取多个PLC地址
- **高性能**: 内置队列机制防止并发读取冲突
- **灵活输出**: JSON对象或数组格式输出
- **实时状态**: 可视化连接状态指示器
- **多语言支持**: 支持中文和英文界面

## 系统要求

### 软件要求

该程序运行于`Node-Red`中。因此，需要安装`Node-Red`及其运行环境`Node.js`。

### 支持的PLC型号

使用了`plcpeople/mcprotocol`库进行通信。该库支持的 PLC 可用。受限于手上的设备，目前仅在`AMX-FX3U-M26MR`系列型号的 PLC 中进行了测试。

## 安装

### 使用Node-RED管理面板

1. 在浏览器中打开Node-RED
2. 进入菜单 (≡) 并选择 "Manage palette"
3. 点击 "Install" 标签
4. 搜索 `@yihengnp/node-red-mcprotocol-read`
5. 点击 "Install"

### 使用npm命令

```bash
cd ~/.node-red
npm install @yihengnp/node-red-mcprotocol-read
```

安装后重启Node-RED。

## 示例流程

示例流程在节点仓库下的`examples`文件夹中。

## 输出格式

### JSON格式

```json
{
  "timestamp": 1640995200000,
  "topic": "mc-read",
  "payload": {
    "D8470.0,8":[false,false,false,true,false,true,false,true],
    "D8470.8,8":[false,false,false,false,false,false,true,true]
  }
}
```

### 数组格式

```json
{
  "timestamp": 1640995200000,
  "topic": "mc-read",
  "payload": [
    {"D8470.0,8":[false,false,false,true,false,true,false,true]},
    {"D8470.8,8":[false,false,false,false,false,false,true,true]}
  ]
}
```

## 错误处理

### 错误处理模式

1. **抛出异常**: 错误抛出到Node-RED的调试面板
2. **消息模式**: 错误包含在输出消息中

### 错误消息格式

```json
{
  "timestamp": 1640995200000,
  "topic": "mc-read",
  "error": "An error occurred while reading values from plc: Connection timeout",
  "payload": null
}
```

## 贡献

欢迎贡献代码，提交针对漏洞或者新功能的Pull Request。

## 许可证

此项目基于MIT许可证 - 详情请查看 [LICENSE](LICENSE) 文件。

## 相关项目

- [mcprotocol](https://github.com/plcpeople/mcprotocol) - 此组件使用了该库以实现与 PLC 的通信

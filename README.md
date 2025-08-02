# Node-RED MC Protocol Read

[中文文档](./docs/README_zh-CN.md) | English

This is a `Node-RED` component designed for PLCs that communicate over Ethernet using the `MC Protocol`. A single node supports reading data from multiple PLC addresses at once.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Multiple Communication Modes**: TCP protocol, Binary/ASCII mode, 1E/3E/4E frame formats
- **Multi-address Reading**: Read data from multiple PLC addresses simultaneously
- **High Performance**: Built-in queue mechanism to prevent concurrent read conflicts
- **Flexible Output**: JSON object or array format output
- **Real-time Status**: Visual connection status indicator
- **Multi-language Support**: Chinese and English interface support

## System Requirements

### Software Requirements

This program runs within `Node-RED`. Therefore, `Node-RED` and its runtime environment `Node.js` must be installed.

### Supported PLC Models

This component uses the `plcpeople/mcprotocol` library for communication. PLCs supported by this library can be used. Due to equipment limitations, testing has only been conducted on `AMX-FX3U-M26MR` series PLCs.

## Installation

### Using Node-RED Palette Manager

1. Open Node-RED in your browser
2. Go to the menu (≡) and select "Manage palette"
3. Click the "Install" tab
4. Search for `@yihengnp/node-red-mcprotocol-read`
5. Click "Install"

### Using npm Command

```bash
cd ~/.node-red
npm install @yihengnp/node-red-mcprotocol-read
```

Restart Node-RED after installation.

## Example Flows

Example flows can be found in the `examples` folder of the node repository.

## Output Format

### JSON Format

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

### Array Format

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

## Error Handling

### Error Handling Modes

1. **Throw Exception**: Errors are thrown to Node-RED's debug panel
2. **Message Mode**: Errors are included in the output message

### Error Message Format

```json
{
  "timestamp": 1640995200000,
  "topic": "mc-read",
  "error": "An error occurred while reading values from plc: Connection timeout",
  "payload": null
}
```

## Contributing

**All contributions are welcome!**
Whether it’s a bug fix, new feature, or documentation improvement, feel free to open a pull request or issue.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Related Projects

- [mcprotocol](https://github.com/plcpeople/mcprotocol) - This component uses this library to communicate with PLCs

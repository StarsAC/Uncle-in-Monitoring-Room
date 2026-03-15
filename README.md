# 监控室大爷

**Uncle-in-Monitoring-Room** 是一个纯前端的多路视频流查看页。

你把一份 JSON 配置交给大爷，大爷就会：

- 按层级把房间整理到左侧
- 在右侧四宫格同时播放一个房间下的多路视频流
- 把最近一次配置记在浏览器里，下次打开自动恢复

## 功能

- 上传符合示例结构的 JSON 配置
- 左侧按 JSON 层级展示分类树
- 点击最里层节点后同时播放多路视频流
- 四宫格展示画面
- 自动保存到 `localStorage`
- 支持 `m3u8`，优先原生 HLS，必要时回退到 `hls.js`

## 使用

1. 打开 `index.html`
2. 点击“请大爷上岗”上传 JSON
3. 在左侧点选房间
4. 在右侧查看四路画面

## JSON 结构

最外层是分组，中间层是房间，最里层是视频流名称和地址。

```json
{
  "groupName1": {
    "roomName1": {
      "live1": "http://example.com/live1.m3u8",
      "live2": "http://example.com/live2.m3u8",
      "live3": "http://example.com/live3.m3u8",
      "live4": "http://example.com/live4.m3u8"
    }
  }
}
```

## 文件结构

- `index.html`：页面结构
- `assets/css/styles.css`：样式
- `assets/js/app.js`：上传、树渲染、播放器和本地存储逻辑
- `example.json`：配置示例

## 提醒

本项目纯前端实现，能否顺利播放还取决于流地址可访问性、跨域配置和浏览器自动播放策略。

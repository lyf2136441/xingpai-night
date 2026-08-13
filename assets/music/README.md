# 背景音乐目录

把你拥有授权的 `.mp3`、`.ogg` 或 `.wav` 文件放在本目录，并在 `manifest.json` 的 `tracks` 数组中登记。例如：

```json
{
  "tracks": [
    { "src": "./assets/music/night-01.mp3", "title": "Night 01" },
    { "src": "./assets/music/night-02.ogg", "title": "Night 02" }
  ]
}
```

游戏会在用户第一次点击或触摸后随机播放曲目，播放结束自动切换；音乐音量默认较低，并可在右侧菜单关闭。请只放入你有权使用的音乐文件，不要直接打包商业歌曲。

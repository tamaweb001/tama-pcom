# Tama P-COM Catalog v2

- `index.html` : Web Serial + Windows版完全移植v15系送信処理 + アイテムカタログ
- `catalog.json` : カタログ項目
- `bin/` : BINファイル
- `images/` : 表示画像

## カタログを増やす方法

1. `bin/` に新しい `.bin` を追加
2. `images/` に同じ名前の `.png` を追加
3. `catalog.json` に1項目追加

例:
```json
{
  "name": "プリンセスハウス",
  "bin": "bin/プリンセスハウス.bin",
  "image": "images/プリンセスハウス.png"
}
```

GitHub Pagesでは `index.html` と `catalog.json` が同じフォルダにある状態で公開してください。

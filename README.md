# Tama P-COM Web

Tamagotchi Paradise 用のブラウザ版 P-COM ツールです。

## 🌸 Tama P-COM Web

**[Tama P-COM Web を開く](https://tamaweb001.github.io/tama-pcom/)**

GitHub Pages 上で Chrome / Edge から利用できます。

## 接続方式

現在は2種類の接続方法に対応しています。

### UART接続
USB-UART変換器を使って、たまごっちと直接接続します。

- Web Serial
- 460800 / 8N1
- フロー制御なし

### P-COM / Phone-COM
自作 Phone-COM を使って接続します。

- WebUSB
- Desktop / Android Chrome・Edge
- Phone-COM 経由でたまごっちと通信

## 送信プロトコル

Windows版 `TamaParadise BIN Sender` の送信方式をベースにしたプロトコルを使用しています。

- ECHO REQ → ECHO REP
- PKT → ACK
- 最大 4096 byte の chunk 転送
- session ID: 0
- type: 3
- CRC16
- chunk ごとの nonce
- SHA-256 ベースの暗号化
- ACK / NAK / ENQ / CAN 対応

UART と Phone-COM では接続経路だけが異なり、たまごっちへ送るプロトコルは共通です。

## 📖 カタログ

カタログからコンテンツを選択して送信できます。

### 🛠️ カスタム

カスタムタブには TamaCatalog のデータを収録しています。

各データの **「このデータを送信」** を押すと、接続済みの UART / Phone-COM へ直接送信します。

中央の「③ たまごっちへ送信」を押す必要はありません。

## 対応環境

- Google Chrome
- Microsoft Edge
- HTTPS / GitHub Pages
- UART接続: Web Serial 対応環境
- Phone-COM: WebUSB 対応環境

## GitHub Pages

このリポジトリの `index.html` が GitHub Pages の公開ページとして使用されています。

**公開ページ:**  
https://tamaweb001.github.io/tama-pcom/

## 注意

USB接続では、使用するブラウザが Web Serial / WebUSB に対応している必要があります。

Phone-COM は WebUSB を使用するため、iPhone / iPad の Safari では利用できません。

## TamaPCOM (.pcom)

Windows版 Tama P-COM Package Editor v2 で作成した `.pcom` を「カスタム」タブから読み込めます。

```text
item.pcom
├─ manifest.json
├─ preview.png
└─ data.bin
```

`manifest.json` の `id` / `name` / `tags` をカタログに使用します。
対応タグ: ごはん / おやつ / Sゆうぐ / Mゆうぐ / きせかえ

複数タグにも対応しています。

## NTAG

Android Chrome + HTTPSで「📱 NTAGを読み込んで送信」を使用できます。
NDEFテキストに `TAMA-PCOM:001` または `001` のようにカタログ番号を保存しておくと、該当するカタログデータをUART / Phone-COMへ直接送信します。

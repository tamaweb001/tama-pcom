# Tama P-COM Web

前回の Windows版 `TamaParadiseBinSender_v1` をブラウザへ移植した試作です。

## 重要：これは「WebUSB」ではなく「Web Serial」版

元のWindowsソフトは `System.IO.Ports.SerialPort` で 460800 8N1 のUART通信をしています。
そのため、ブラウザ側では同等の `navigator.serial` を使うのが自然です。
Chrome 148ではAndroidのWeb Serial APIがUSBシリアルにも対応しています。

## 実装済み

- 460800 baud / 8N1 / no flow control
- `ECHO REQ` → `ECHO REP`
- `PKT <length>` → `ACK`
- 4096-byte chunk
- session_id = 0
- message type = 3
- TCPヘッダー生成
- CRC16
- nonce + SHA-256(secret) ベースのストリーム暗号
- ACK / NAK / ENQ / CAN
- BIN / ARC2ファイル選択
- 進捗表示・ログ
- 正方形中央UI
- Service WorkerによるUIオフラインキャッシュ
- PWA manifest（fullscreen）

## GitHub Pages

このフォルダをGitHub Pagesの公開リポジトリへそのまま配置できます。
HTTPS上で開いて、Connectをユーザー操作で押してください。

## 注意

ブラウザ版の通信実機互換性は、実機で必ず確認してください。
特にXIAOのUSBインターフェースがAndroid ChromeからWeb Serialとして列挙されることが前提です。

元のWindows版に含まれていた共有秘密鍵をクライアントJSへ移植しています。これはWebアプリでは秘匿情報にはなりません。

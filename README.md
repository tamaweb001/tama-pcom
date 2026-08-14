# P-COM UART Diagnostic

Use this page in Chrome to test the raw serial path to the XIAO/P-COM.

It deliberately does NOT implement the P-COM protocol.

Test sequence:
1. Connect.
2. Confirm VID/PID.
3. Default is 460800 / 8N1 / no flow control.
4. Default DTR/RTS are OFF.
5. Press `送信（CRLF）` with `ECHO REQ`.
6. Watch RX bytes.

If Windows receives `ECHO REP` but this page receives nothing, the logs will
help isolate whether the difference is DTR/RTS, timing, baud rate, or the
Chrome Web Serial transport.

The page is static and suitable for GitHub Pages.

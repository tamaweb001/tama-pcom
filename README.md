# Tama P-COM Web v2

Chrome Web Serial version of the Windows Tama P-COM sender.

## v2 connection diagnostics

The initial Windows program uses:

- 460800 baud
- 8 data bits
- 1 stop bit
- no parity
- no hardware flow control
- `ECHO REQ\r\n` -> `ECHO REP`
- DTR/RTS off (matching .NET SerialPort defaults)

v2 explicitly matches those settings and:

1. waits 1.2 seconds after opening the port
2. starts the RX reader before transmitting
3. logs USB VID/PID
4. explicitly sets DTR/RTS off when supported
5. logs every command TX/RX
6. retries only the ECHO handshake up to 3 times
7. does not send binary data until ECHO succeeds

This is intended to diagnose the difference between Chrome Web Serial and
the known-working Windows SerialPort implementation.
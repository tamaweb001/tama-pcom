'use strict';

let port=null, reader=null, readLoop=null;
let txCount=0, rxCount=0;

const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function log(s){
  $('log').textContent += `[${new Date().toLocaleTimeString()}] ${s}\n`;
  $('log').scrollTop=$('log').scrollHeight;
}
function setStatus(s,ok=false){
  $('status').innerHTML=`<span id="dot" style="background:${ok?'#58bf7d':'#aaa'}"></span> ${s}`;
}
function setButtons(on){
  $('disconnect').disabled=!on;
  $('sendAscii').disabled=!on;
  $('sendRawAscii').disabled=!on;
  $('sendHex').disabled=!on;
  $('connect').disabled=on;
}
function bytesToHex(a){
  return [...a].map(x=>x.toString(16).padStart(2,'0').toUpperCase()).join(' ');
}
function parseHex(s){
  const clean=s.replace(/0x/gi,'').replace(/[^0-9a-fA-F]/g,'');
  if(clean.length%2) throw new Error('HEXの桁数が奇数です');
  const out=new Uint8Array(clean.length/2);
  for(let i=0;i<out.length;i++) out[i]=parseInt(clean.slice(i*2,i*2+2),16);
  return out;
}
async function applySignals(){
  if(!port?.setSignals)return;
  const dtr=$('dtr').value==='on', rts=$('rts').value==='on';
  try{
    await port.setSignals({dataTerminalReady:dtr,requestToSend:rts});
    log(`SIGNALS DTR=${dtr?'ON':'OFF'} RTS=${rts?'ON':'OFF'}`);
  }catch(e){log('SIGNALS ERROR: '+e.message)}
}
async function connect(){
  if(!('serial' in navigator)){
    alert('このChromeはWeb Serial APIに対応していません。');
    return;
  }
  try{
    log('requestPort()');
    port=await navigator.serial.requestPort();
    const info=port.getInfo ? port.getInfo() : {};
    $('device').textContent=`Device: VID=${info.usbVendorId?'0x'+info.usbVendorId.toString(16).padStart(4,'0').toUpperCase():'—'} PID=${info.usbProductId?'0x'+info.usbProductId.toString(16).padStart(4,'0').toUpperCase():'—'}`;
    log($('device').textContent);

    await port.open({
      baudRate:Number($('baud').value),
      dataBits:8, stopBits:1, parity:'none',
      bufferSize:8192, flowControl:'none'
    });
    log(`OPEN ${$('baud').value} 8N1 / no flow control`);
    await applySignals();
    await sleep(1000);
    startReader();
    await sleep(50);
    setStatus('接続済み',true);
    setButtons(true);
    log('READY');
  }catch(e){
    log('CONNECT ERROR: '+e.message);
    try{if(port)await port.close()}catch{}
    port=null;
    setButtons(false);
  }
}
function startReader(){
  if(!port?.readable||readLoop)return;
  readLoop=(async()=>{
    reader=port.readable.getReader();
    try{
      while(true){
        const {value,done}=await reader.read();
        if(done)break;
        if(value){
          rxCount+=value.length;$('rxCount').textContent=rxCount;
          log(`RX ${value.length} bytes: ${bytesToHex(value)}`);
          const printable=new TextDecoder().decode(value).replace(/[^\x20-\x7E\r\n]/g,'.');
          if(printable)log(`RX ASCII: ${JSON.stringify(printable)}`);
        }
      }
    }catch(e){if(port)log('READ ERROR: '+e.message)}
    finally{try{reader.releaseLock()}catch{}reader=null;readLoop=null}
  })();
}
async function sendBytes(bytes,label){
  if(!port?.writable){log('TX ERROR: port not writable');return}
  const writer=port.writable.getWriter();
  try{
    await writer.write(bytes);
    txCount+=bytes.length;$('txCount').textContent=txCount;
    log(`TX ${bytes.length} bytes (${label}): ${bytesToHex(bytes)}`);
  }catch(e){log('TX ERROR: '+e.message)}
  finally{writer.releaseLock()}
}
$('connect').onclick=connect;
$('disconnect').onclick=async()=>{
  try{if(reader)await reader.cancel()}catch{}
  reader=null;readLoop=null;
  try{if(port)await port.close()}catch{}
  port=null;setButtons(false);setStatus('未接続');log('DISCONNECTED');
};
$('dtr').onchange=applySignals;
$('rts').onchange=applySignals;
$('sendAscii').onclick=()=>sendBytes(new TextEncoder().encode($('ascii').value+'\r\n'),'ASCII+CRLF');
$('sendRawAscii').onclick=()=>sendBytes(new TextEncoder().encode($('ascii').value),'ASCII raw');
$('sendHex').onclick=()=>{
  try{sendBytes(parseHex($('hex').value),'HEX')}catch(e){alert(e.message)}
};
if(!('serial' in navigator))log('Web Serial API unavailable');
if('serial' in navigator)navigator.serial.addEventListener('disconnect',()=>log('SERIAL DISCONNECTED'));

'use strict';

const BAUD = 460800;
const CHUNK_SIZE = 4096;
const SECRET = new TextEncoder().encode('SPqREQqtuhvgJuRexqMfG8FzstAgmnf7');

let port = null;
let reader = null;
let readLoopPromise = null;
let lineBuffer = '';
let pendingLines = [];
let selectedFile = null;
let busy = false;

const $ = id => document.getElementById(id);
const log = msg => { $('log').textContent += `[${new Date().toLocaleTimeString()}] ${msg}\n`; $('log').scrollTop = $('log').scrollHeight; };
const setStatus = (text, ok=false) => { $('status').textContent=text; $('dot').style.background=ok?'#58bf7d':'#aaa'; };

function hex(n){return n.toString(16).padStart(2,'0').toUpperCase()}

async function connect(){
  if (!('serial' in navigator)) {
    alert('このChromeではWeb Serial APIが利用できません。Chromeを最新版にしてください。');
    return;
  }
  try {
    port = await navigator.serial.requestPort();
    await port.open({baudRate: BAUD, dataBits:8, stopBits:1, parity:'none', bufferSize:8192, flowControl:'none'});
    startReader();
    setStatus('接続済み', true);
    $('connect').disabled=true; $('disconnect').disabled=false;
    log('OPEN 460800 8N1 / no flow control');
    await command('ECHO REQ');
    const echo = await waitLine(1000);
    if (echo !== 'ECHO REP') throw new Error(`ECHO応答が不正: [${echo}]`);
    log('ECHO REP OK');
    $('send').disabled = !selectedFile;
  } catch(e){
    log('ERROR: '+e.message);
    setStatus('接続失敗');
    await disconnect(false);
  }
}

async function disconnect(update=true){
  try{ if(reader) await reader.cancel(); }catch{}
  reader=null;
  if(port){ try{await port.close();}catch{} }
  port=null;
  if(update){setStatus('未接続');$('connect').disabled=false;$('disconnect').disabled=true;$('send').disabled=true;}
}

function startReader(){
  if(!port?.readable) return;
  readLoopPromise=(async()=>{
    reader=port.readable.getReader();
    const decoder=new TextDecoder();
    try{
      while(true){
        const {value,done}=await reader.read();
        if(done) break;
        if(value){
          lineBuffer += decoder.decode(value,{stream:true});
          let idx;
          while((idx=lineBuffer.indexOf('\n'))>=0){
            let line=lineBuffer.slice(0,idx).replace(/\r$/,'').trim();
            lineBuffer=lineBuffer.slice(idx+1);
            if(line) pendingLines.push(line);
          }
        }
      }
    }catch(e){ if(port) log('READ: '+e.message); }
    finally{ try{reader.releaseLock()}catch{} reader=null; }
  })();
}

async function command(text){
  const writer=port.writable.getWriter();
  try{await writer.write(new TextEncoder().encode(text+'\r\n'));}
  finally{writer.releaseLock()}
}

async function waitLine(timeout=5000){
  const start=performance.now();
  while(performance.now()-start<timeout){
    if(pendingLines.length) return pendingLines.shift();
    await new Promise(r=>setTimeout(r,10));
  }
  throw new Error('応答タイムアウト');
}

async function sha256(bytes){return new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))}
function concat(...arrays){let n=arrays.reduce((a,b)=>a+b.length,0),out=new Uint8Array(n),o=0;for(const a of arrays){out.set(a,o);o+=a.length}return out}
function u32le(n){const a=new Uint8Array(4);new DataView(a.buffer).setUint32(0,n>>>0,true);return a}
function u16le(n){const a=new Uint8Array(2);new DataView(a.buffer).setUint16(0,n&0xffff,true);return a}
function crc16(data){let crc=0;for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc&1)?((crc>>>1)^0xA001):(crc>>>1)}return crc&0xffff}

async function makeEncryptedChunk(sessionId,messageType,chunkIndex,payload){
  const plain=new Uint8Array(12+payload.length);
  plain.set(u32le(sessionId),0);
  plain.set(new TextEncoder().encode('TCP'),4);
  plain[7]=messageType;
  plain[8]=chunkIndex&0xff;
  plain[9]=(255-chunkIndex)&0xff;
  plain.set(u16le(crc16(payload)),10);
  plain.set(payload,12);
  const nonce=crypto.getRandomValues(new Uint8Array(4));
  const key=await sha256(concat(nonce,SECRET));
  const encrypted=new Uint8Array(plain.length);
  const stream=new Uint8Array(key);
  for(let i=0;i<plain.length;i++){
    const k=i%stream.length;
    encrypted[i]=plain[i]^stream[k];
    stream[k]=(stream[k]*2+1)&0xff;
  }
  return concat(nonce,encrypted);
}

async function writeBytes(bytes){
  const writer=port.writable.getWriter();
  try{await writer.write(bytes)}finally{writer.releaseLock()}
}

async function sendFile(){
  if(!port||!selectedFile||busy)return;
  busy=true; $('send').disabled=true;$('connect').disabled=true;$('disconnect').disabled=true;
  try{
    const data=new Uint8Array(await selectedFile.arrayBuffer());
    if(!data.length||data.length>0x100000)throw new Error('データサイズは1MB以下にしてください。');
    const ascii=new TextDecoder().decode(data.slice(0,4));
    if(ascii!=='ARC2') log('警告: 先頭4バイトはARC2ではありません。送信は続行します。');
    if(data.length>0x4000)log('警告: 0x4000 bytesを超えています。');
    $('progress').max=data.length;$('progress').value=0;
    await command(`PKT ${data.length}`);
    const ack=await waitLine(3000);
    if(ack!=='ACK')throw new Error(`PKT ACK待ち失敗: [${ack}]`);
    log(`PKT ${data.length} -> ACK`);
    const total=Math.ceil(data.length/CHUNK_SIZE);
    let index=0;
    while(index<total){
      const offset=index*CHUNK_SIZE;
      const payload=data.slice(offset,Math.min(offset+CHUNK_SIZE,data.length));
      const wire=await makeEncryptedChunk(0,3,index,payload);
      await writeBytes(wire);
      log(`chunk ${index+1}/${total}: payload=${payload.length}, wire=${wire.length}`);
      const response=await waitLine(6000);
      if(response==='ACK'){
        index++;
        $('progress').value=Math.min(data.length,offset+payload.length);
      }else if(response==='NAK'){
        log(`NAK: chunk ${index} を再送`);
      }else if(response.startsWith('ENQ ')){
        const requested=Number(response.slice(4));
        if(!Number.isInteger(requested)||requested<0||requested>=total)throw new Error(`不正なENQ: ${response}`);
        log(`ENQ ${requested}: そこから再送`); index=requested;
      }else if(response==='CAN') throw new Error('Tamagotchi側からCANを受信しました。');
      else throw new Error(`未知の応答: [${response}]`);
    }
    $('progress').value=data.length; setStatus('送信完了',true);log('=== 送信完了 ===');
  }catch(e){setStatus('送信エラー');log('ERROR: '+e.message);alert(e.message)}
  finally{busy=false;$('disconnect').disabled=false;$('connect').disabled=!!port;$('send').disabled=!port||!selectedFile}
}

$('connect').addEventListener('click',connect);
$('disconnect').addEventListener('click',()=>disconnect(true));
$('file').addEventListener('change',e=>{selectedFile=e.target.files[0]||null;$('fileName').textContent=selectedFile?`${selectedFile.name} (${selectedFile.size.toLocaleString()} bytes)`:'BIN / ARC2 を選択';$('send').disabled=!port||!selectedFile});

if('serial' in navigator){
  navigator.serial.addEventListener('disconnect',()=>{log('USB/Serial disconnected');disconnect(true)});
}else log('Web Serial API unavailable');
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(()=>{});

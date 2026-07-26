import { readFileSync } from "fs";

// Read the WASM binary and directly decompile key functions
const wasmBytes = readFileSync("C:\\Users\\PC\\AppData\\Local\\Temp\\sha3_wasm_bg.wasm");

// Write a simple WASM bytecode parser
function readLEB128(bytes: Uint8Array, offset: number) {
  let result = 0;
  let shift = 0;
  let pos = offset;
  while (pos < bytes.length) {
    const byte = bytes[pos++];
    result |= (byte & 0x7f) << shift;
    shift += 7;
    if ((byte & 0x80) === 0) break;
  }
  return { value: result, bytesRead: pos - offset };
}

function parseWASM(bytes: Uint8Array) {
  let pos = 8;
  const sections: any[] = [];
  while (pos < bytes.length) {
    const id = bytes[pos++];
    const len = readLEB128(bytes, pos);
    pos += len.bytesRead;
    sections.push({ id, offset: pos, length: len.value });
    pos += len.value;
  }
  return sections;
}

const sections = parseWASM(wasmBytes);
console.log("Sections:", sections.map(s => ({ id: s.id, length: s.length })));

// Find code section (id=10)
const codeSection = sections.find(s => s.id === 10);
// Find function section (id=3) - maps body indices to type indices
const funcSection = sections.find(s => s.id === 3);
// Find type section (id=1) 
const typeSection = sections.find(s => s.id === 1);

if (!codeSection) { console.log("No code section"); process.exit(1); }

function readTypes(offset: number): any[] {
  let pos = offset;
  const count = readLEB128(wasmBytes, pos);
  pos += count.bytesRead;
  const types: any[] = [];
  for (let i = 0; i < count.value; i++) {
    // functype = 0x60 + params + results
    if (wasmBytes[pos] !== 0x60) { pos++; continue; }
    pos++; // skip 0x60
    const paramCount = readLEB128(wasmBytes, pos);
    pos += paramCount.bytesRead;
    const params = [];
    for (let j = 0; j < paramCount.value; j++) {
      params.push(wasmBytes[pos++]);
    }
    const resultCount = readLEB128(wasmBytes, pos);
    pos += resultCount.bytesRead;
    const results = [];
    for (let j = 0; j < resultCount.value; j++) {
      results.push(wasmBytes[pos++]);
    }
    types.push({ params, results });
  }
  return types;
}

function readFuncBodies(offset: number, count: number) {
  let pos = offset;
  const bodies: any[] = [];
  for (let i = 0; i < count; i++) {
    const bodySize = readLEB128(wasmBytes, pos);
    pos += bodySize.bytesRead;
    const bodyStart = pos;
    // Read locals
    const localCount = readLEB128(wasmBytes, pos);
    pos += localCount.bytesRead;
    const locals: { count: number, type: number }[] = [];
    for (let j = 0; j < localCount.value; j++) {
      const cnt = readLEB128(wasmBytes, pos);
      pos += cnt.bytesRead;
      locals.push({ count: cnt.value, type: wasmBytes[pos++] });
    }
    const bodyEnd = bodyStart + bodySize.value;
    const code = wasmBytes.slice(pos, bodyEnd);
    bodies.push({ locals, code, offset: pos });
    pos = bodyEnd;
  }
  return bodies;
}

// Read type section
const types = typeSection ? readTypes(typeSection.offset) : [];

// Read function section (maps body index to type index)
let funcTypeIndices: number[] = [];
if (funcSection) {
  let pos = funcSection.offset;
  const count = readLEB128(wasmBytes, pos);
  pos += count.bytesRead;
  for (let i = 0; i < count.value; i++) {
    const typeIdx = readLEB128(wasmBytes, pos);
    pos += typeIdx.bytesRead;
    funcTypeIndices.push(typeIdx.value);
  }
}

// Read code section bodies
const bodyCount = readLEB128(wasmBytes, codeSection.offset);
const bodies = readFuncBodies(codeSection.offset + bodyCount.bytesRead, bodyCount.value);

console.log(`\nFunction types: ${types.length}`);
console.log(`Func type indices: ${JSON.stringify(funcTypeIndices)}`);
console.log(`Function bodies: ${bodies.length}`);

// wasm_solve = index 1, wasm_deepseek_hash_v1 = index 6
// wasm_solve type is funcTypeIndices[1], wasm_deepseek_hash_v1 type is funcTypeIndices[6]

console.log(`\nwasm_solve (index 1) type:`, types[funcTypeIndices[1]]);
console.log(`wasm_deepseek_hash_v1 (index 6) type:`, types[funcTypeIndices[6]]);
console.log(`__wbindgen_export_0 (index 30) type:`, types[funcTypeIndices[30]]);

function opcodeName(byte: number): string {
  const names: Record<number, string> = {
    0x00: 'unreachable', 0x01: 'nop', 0x02: 'block', 0x03: 'loop', 0x04: 'if', 0x05: 'else',
    0x0b: 'end', 0x0c: 'br', 0x0d: 'br_if', 0x0e: 'br_table', 0x0f: 'return',
    0x10: 'call', 0x11: 'call_indirect',
    0x1a: 'drop', 0x1b: 'select',
    0x20: 'local.get', 0x21: 'local.set', 0x22: 'local.tee',
    0x23: 'global.get', 0x24: 'global.set',
    0x28: 'i32.load', 0x29: 'i64.load', 0x2c: 'f32.load', 0x2d: 'f64.load',
    0x2e: 'i32.load8_s', 0x2f: 'i32.load8_u', 0x30: 'i32.load16_s', 0x31: 'i32.load16_u',
    0x32: 'i64.load8_s', 0x33: 'i64.load8_u', 0x34: 'i64.load16_s', 0x35: 'i64.load16_u',
    0x36: 'i64.load32_s', 0x37: 'i64.load32_u',
    0x3a: 'i32.store', 0x3b: 'i64.store', 0x3c: 'f32.store', 0x3d: 'f64.store',
    0x3e: 'i32.store8', 0x3f: 'i32.store16', 0x40: 'i64.store8', 0x41: 'i64.store16', 0x42: 'i64.store32',
    0x41: 'i64.store16',
    0x45: 'i32.eqz', 0x46: 'i32.eq', 0x47: 'i32.ne', 0x48: 'i32.lt_s', 0x49: 'i32.lt_u',
    0x4a: 'i32.gt_s', 0x4b: 'i32.gt_u', 0x4c: 'i32.le_s', 0x4d: 'i32.le_u', 0x4e: 'i32.ge_s', 0x4f: 'i32.ge_u',
    0x50: 'i64.eqz', 0x51: 'i64.eq', 0x52: 'i64.ne', 0x53: 'i64.lt_s', 0x54: 'i64.lt_u',
    0x55: 'i64.gt_s', 0x56: 'i64.gt_u', 0x57: 'i64.le_s', 0x58: 'i64.le_u', 0x59: 'i64.ge_s', 0x5a: 'i64.ge_u',
    0x5b: 'f32.eq', 0x5c: 'f32.ne', 0x5d: 'f32.lt', 0x5e: 'f32.gt', 0x5f: 'f32.le', 0x60: 'f32.ge',
    0x61: 'f64.eq', 0x62: 'f64.ne', 0x63: 'f64.lt', 0x64: 'f64.gt', 0x65: 'f64.le', 0x66: 'f64.ge',
    0x67: 'i32.clz', 0x68: 'i32.ctz', 0x69: 'i32.popcnt',
    0x6a: 'i32.add', 0x6b: 'i32.sub', 0x6c: 'i32.mul', 0x6d: 'i32.div_s', 0x6e: 'i32.div_u', 0x6f: 'i32.rem_s',
    0x70: 'i32.rem_u', 0x71: 'i32.and', 0x72: 'i32.or', 0x73: 'i32.xor', 0x74: 'i32.shl', 0x75: 'i32.shr_s',
    0x76: 'i32.shr_u', 0x77: 'i32.rotl', 0x78: 'i32.rotr',
    0x79: 'i64.clz', 0x7a: 'i64.ctz', 0x7b: 'i64.popcnt',
    0x7c: 'i64.add', 0x7d: 'i64.sub', 0x7e: 'i64.mul', 0x7f: 'i64.div_s', 0x80: 'i64.div_u', 0x81: 'i64.rem_s',
    0x82: 'i64.rem_u', 0x83: 'i64.and', 0x84: 'i64.or', 0x85: 'i64.xor', 0x86: 'i64.shl', 0x87: 'i64.shr_s',
    0x88: 'i64.shr_u', 0x89: 'i64.rotl', 0x8a: 'i64.rotr',
    0x8b: 'f32.abs', 0x8c: 'f32.neg', 0x8d: 'f32.ceil', 0x8e: 'f32.floor', 0x8f: 'f32.trunc',
    0x90: 'f32.nearest', 0x91: 'f32.sqrt',
    0x92: 'f32.add', 0x93: 'f32.sub', 0x94: 'f32.mul', 0x95: 'f32.div', 0x96: 'f32.min', 0x97: 'f32.max',
    0x98: 'f32.copysign',
    0x99: 'f64.abs', 0x9a: 'f64.neg', 0x9b: 'f64.ceil', 0x9c: 'f64.floor', 0x9d: 'f64.trunc',
    0x9e: 'f64.nearest', 0x9f: 'f64.sqrt',
    0xa0: 'f64.add', 0xa1: 'f64.sub', 0xa2: 'f64.mul', 0xa3: 'f64.div', 0xa4: 'f64.min', 0xa5: 'f64.max',
    0xa6: 'f64.copysign',
    0xa7: 'i32.wrap_i64', 0xa8: 'i32.trunc_f32_s', 0xa9: 'i32.trunc_f32_u', 0xaa: 'i32.trunc_f64_s', 0xab: 'i32.trunc_f64_u',
    0xac: 'i64.extend_i32_s', 0xad: 'i64.extend_i32_u',
    0xae: 'i64.trunc_f32_s', 0xaf: 'i64.trunc_f32_u', 0xb0: 'i64.trunc_f64_s', 0xb1: 'i64.trunc_f64_u',
    0xb2: 'f32.convert_i32_s', 0xb3: 'f32.convert_i32_u', 0xb4: 'f32.convert_i64_s', 0xb5: 'f32.convert_i64_u',
    0xb6: 'f64.convert_i32_s', 0xb7: 'f64.convert_i32_u', 0xb8: 'f64.convert_i64_s', 0xb9: 'f64.convert_i64_u',
    0xba: 'f32.demote_f64', 0xbb: 'f64.promote_f32',
    0xbc: 'i32.reinterpret_f32', 0xbd: 'i64.reinterpret_f64', 0xbe: 'f32.reinterpret_i32', 0xbf: 'f64.reinterpret_i64',
    0xc0: 'i32.extend8_s', 0xc1: 'i32.extend16_s', 0xc2: 'i64.extend8_s', 0xc3: 'i64.extend16_s', 0xc4: 'i64.extend32_s',
    0xd0: 'ref.null', 0xd1: 'ref.is_null', 0xd2: 'ref.func',
    0xfb: 'misc', 0xfc: 'simd',
    0xfe: 'thread',
  };
  return names[byte] || `0x${byte.toString(16).padStart(2, '0')}`;
}

function readInstruction(bytes: Uint8Array, offset: number) {
  const opcode = bytes[offset];
  let pos = offset + 1;
  let extra = '';

  switch (opcode) {
    case 0x02: case 0x03: { // block, loop
      const bt = bytes[pos++];
      extra = `type=${bt}`;
      break;
    }
    case 0x04: { // if
      const bt = bytes[pos++];
      extra = `type=${bt}`;
      break;
    }
    case 0x0c: case 0x0d: { // br, br_if
      const idx = readLEB128(bytes, pos);
      pos += idx.bytesRead;
      extra = `label=${idx.value}`;
      break;
    }
    case 0x0e: { // br_table
      const count = readLEB128(bytes, pos);
      pos += count.bytesRead;
      for (let i = 0; i <= count.value; i++) {
        const idx = readLEB128(bytes, pos);
        pos += idx.bytesRead;
        if (i === count.value) extra += ` default=${idx.value}`;
        else extra += ` target${i}=${idx.value}`;
      }
      break;
    }
    case 0x10: { // call
      const idx = readLEB128(bytes, pos);
      pos += idx.bytesRead;
      extra = `func=${idx.value}`;
      break;
    }
    case 0x11: { // call_indirect
      const typeIdx = readLEB128(bytes, pos);
      pos += typeIdx.bytesRead;
      const tableIdx = readLEB128(bytes, pos);
      pos += tableIdx.bytesRead;
      extra = `type=${typeIdx.value} table=${tableIdx.value}`;
      break;
    }
    case 0x20: case 0x21: case 0x22: { // local.get/set/tee
      const idx = readLEB128(bytes, pos);
      pos += idx.bytesRead;
      extra = `local=${idx.value}`;
      break;
    }
    case 0x23: case 0x24: { // global.get/set
      const idx = readLEB128(bytes, pos);
      pos += idx.bytesRead;
      extra = `global=${idx.value}`;
      break;
    }
    case 0x28: case 0x29: case 0x2c: case 0x2d: case 0x2e: case 0x2f:
    case 0x30: case 0x31: case 0x32: case 0x33: case 0x34: case 0x35:
    case 0x36: case 0x37:
    case 0x3a: case 0x3b: case 0x3c: case 0x3d: case 0x3e: case 0x3f:
    case 0x40: case 0x41: case 0x42: { // load/store with alignment
      const align = readLEB128(bytes, pos);
      pos += align.bytesRead;
      const off = readLEB128(bytes, pos);
      pos += off.bytesRead;
      extra = `align=${align.value} offset=${off.value}`;
      break;
    }
    case 0x41: case 0x42: { // i64.store16/32 (same opcode as above)
      break;
    }
    case 0xd0: { // ref.null
      const ht = bytes[pos++];
      extra = `heaptype=${ht}`;
      break;
    }
    case 0xd2: { // ref.func
      const idx = readLEB128(bytes, pos);
      pos += idx.bytesRead;
      extra = `func=${idx.value}`;
      break;
    }
    case 0xfb: { // misc prefix
      const sub = readLEB128(bytes, pos);
      pos += sub.bytesRead;
      extra = `sub=0x${sub.value.toString(16)}`;
      break;
    }
    case 0xfc: { // simd prefix
      const sub = readLEB128(bytes, pos);
      pos += sub.bytesRead;
      extra = `sub=0x${sub.value.toString(16)}`;
      break;
    }
  }

  return { opcode, name: opcodeName(opcode), extra, bytesRead: pos - offset };
}

function decompile(code: Uint8Array, locals: { count: number, type: number }[], indent = '') {
  let pos = 0;
  const lines: string[] = [];
  let stack: number[] = [];

  while (pos < code.length) {
    const instr = readInstruction(code, pos);
    const line = `${indent}${instr.name}${instr.extra ? ' ' + instr.extra : ''}`;
    lines.push(line);

    switch (instr.opcode) {
      case 0x0b: // end
        break;
      case 0x0f: // return
        break;
      case 0x10: { // call
        const funcIdx = parseInt(instr.extra.split('=')[1]);
        const sig = types[funcTypeIndices[funcIdx]];
        if (sig) {
          // Pop params, push results
          for (let i = 0; i < (sig.params?.length || 0); i++) stack.pop();
          for (let i = 0; i < (sig.results?.length || 0); i++) stack.push(1);
        }
        break;
      }
      default: {
        if ([0x1a].includes(instr.opcode)) stack.pop(); // drop
        else if ([0x45,0x48,0x49,0x4a,0x4b,0x6a,0x6b,0x6c,0x6d,0x6e,0x71,0x72,0x73,0x74,0x46,0x47].includes(instr.opcode)) {
          stack.pop(); stack.pop(); stack.push(1); // binary op
        }
        else if ([0x67,0x68,0x69].includes(instr.opcode)) { stack.pop(); stack.push(1); } // unary op
      }
    }
    pos += instr.bytesRead;
  }

  return lines;
}

// Decompile wasm_deepseek_hash_v1 (index 6)
const hashBody = bodies[6];
console.log(`\n===== wasm_deepseek_hash_v1 (index 6) =====`);
console.log(`Locals:`, JSON.stringify(hashBody.locals));
console.log(`Code size: ${hashBody.code.length} bytes`);
const hashLines = decompile(hashBody.code, hashBody.locals);
console.log(hashLines.slice(0, 50).join('\n'));
if (hashLines.length > 50) console.log(`... (${hashLines.length - 50} more lines)`);

// Decompile wasm_solve (index 1)
const solveBody = bodies[1];
console.log(`\n===== wasm_solve (index 1) =====`);
console.log(`Locals:`, JSON.stringify(solveBody.locals));
console.log(`Code size: ${solveBody.code.length} bytes`);
const solveLines = decompile(solveBody.code, solveBody.locals);
console.log(solveLines.slice(0, 80).join('\n'));
if (solveLines.length > 80) console.log(`... (${solveLines.length - 80} more lines)`);

/**
 * Bitcoin Transaction Implementation
 * Based on bitcoinjs-lib transaction module
 */

export interface Output {
  script: Buffer;
  value: number;
}

export interface Input {
  hash: Buffer;
  index: number;
  script: Buffer;
  sequence: number;
  witness: Buffer[];
}

/**
 * Represents a Bitcoin transaction.
 */
export class Transaction {
  static readonly DEFAULT_SEQUENCE = 0xffffffff;
  static readonly SIGHASH_DEFAULT = 0x00;
  static readonly SIGHASH_ALL = 0x01;
  static readonly SIGHASH_NONE = 0x02;
  static readonly SIGHASH_SINGLE = 0x03;
  static readonly SIGHASH_ANYONECANPAY = 0x80;
  static readonly SIGHASH_OUTPUT_MASK = 0x03;
  static readonly SIGHASH_INPUT_MASK = 0x80;
  static readonly ADVANCED_TRANSACTION_MARKER = 0x00;
  static readonly ADVANCED_TRANSACTION_FLAG = 0x01;

  public version: number = 1;
  public locktime: number = 0;
  public ins: Input[] = [];
  public outs: Output[] = [];

  constructor() {
    this.version = 1;
    this.locktime = 0;
    this.ins = [];
    this.outs = [];
  }

  /**
   * Create a Transaction from a Buffer
   */
  static fromBuffer(buffer: Buffer, _NO_STRICT?: boolean): Transaction {
    const tx = new Transaction();
    let offset = 0;

    // Read version (4 bytes, little endian)
    tx.version = buffer.readUInt32LE(offset);
    offset += 4;

    // Check for witness flag
    let hasWitnesses = false;
    if (buffer[offset] === 0x00 && buffer[offset + 1] === 0x01) {
      hasWitnesses = true;
      offset += 2; // Skip marker and flag
    }

    // Read input count
    const inputCount = this.readVarInt(buffer, offset);
    offset = inputCount.offset;

    // Read inputs
    for (let i = 0; i < inputCount.value; i++) {
      const input: Input = {
        hash: buffer.subarray(offset, offset + 32),
        index: buffer.readUInt32LE(offset + 32),
        script: Buffer.alloc(0),
        sequence: 0,
        witness: []
      };
      offset += 36;

      // Read script length and script
      const scriptLength = this.readVarInt(buffer, offset);
      offset = scriptLength.offset;
      input.script = buffer.subarray(offset, offset + scriptLength.value);
      offset += scriptLength.value;

      // Read sequence
      input.sequence = buffer.readUInt32LE(offset);
      offset += 4;

      tx.ins.push(input);
    }

    // Read output count
    const outputCount = this.readVarInt(buffer, offset);
    offset = outputCount.offset;

    // Read outputs
    for (let i = 0; i < outputCount.value; i++) {
      const output: Output = {
        value: this.readUInt64LE(buffer, offset),
        script: Buffer.alloc(0)
      };
      offset += 8;

      // Read script length and script
      const scriptLength = this.readVarInt(buffer, offset);
      offset = scriptLength.offset;
      output.script = buffer.subarray(offset, offset + scriptLength.value);
      offset += scriptLength.value;

      tx.outs.push(output);
    }

    // Read witness data if present
    if (hasWitnesses) {
      for (let i = 0; i < tx.ins.length; i++) {
        const witnessItemCount = this.readVarInt(buffer, offset);
        offset = witnessItemCount.offset;

        for (let j = 0; j < witnessItemCount.value; j++) {
          const itemLength = this.readVarInt(buffer, offset);
          offset = itemLength.offset;
          const witnessItem = buffer.subarray(offset, offset + itemLength.value);
          offset += itemLength.value;
          tx.ins[i].witness.push(witnessItem);
        }
      }
    }

    // Read locktime
    tx.locktime = buffer.readUInt32LE(offset);

    return tx;
  }

  /**
   * Create a Transaction from a hex string
   */
  static fromHex(hex: string): Transaction {
    return this.fromBuffer(Buffer.from(hex, 'hex'));
  }

  /**
   * Check if a buffer represents a coinbase transaction hash
   */
  static isCoinbaseHash(buffer: Buffer): boolean {
    if (buffer.length !== 32) return false;
    for (let i = 0; i < 32; i++) {
      if (buffer[i] !== 0) return false;
    }
    return true;
  }

  /**
   * Check if this is a coinbase transaction
   */
  isCoinbase(): boolean {
    return this.ins.length === 1 && 
           Transaction.isCoinbaseHash(this.ins[0].hash) && 
           this.ins[0].index === 0xffffffff;
  }

  /**
   * Add an input to the transaction
   */
  addInput(hash: Buffer, index: number, sequence?: number, scriptSig?: Buffer): number {
    const input: Input = {
      hash,
      index,
      script: scriptSig || Buffer.alloc(0),
      sequence: sequence !== undefined ? sequence : Transaction.DEFAULT_SEQUENCE,
      witness: []
    };
    return this.ins.push(input) - 1;
  }

  /**
   * Add an output to the transaction
   */
  addOutput(scriptPubKey: Buffer, value: number): number {
    const output: Output = {
      script: scriptPubKey,
      value
    };
    return this.outs.push(output) - 1;
  }

  /**
   * Check if the transaction has witness data
   */
  hasWitnesses(): boolean {
    return this.ins.some(input => input.witness.length > 0);
  }

  /**
   * Remove all witness data from the transaction
   */
  stripWitnesses(): void {
    this.ins.forEach(input => {
      input.witness = [];
    });
  }

  /**
   * Calculate the transaction weight (BIP 141)
   */
  weight(): number {
    const base = this.byteLength(false);
    const total = this.byteLength(true);
    return base * 3 + total;
  }

  /**
   * Calculate virtual size (weight / 4, rounded up)
   */
  virtualSize(): number {
    return Math.ceil(this.weight() / 4);
  }

  /**
   * Calculate the byte length of the transaction
   */
  byteLength(_ALLOW_WITNESS = true): number {
    const hasWitnesses = _ALLOW_WITNESS && this.hasWitnesses();
    
    let length = 8; // version (4) + locktime (4)
    
    // Witness marker and flag
    if (hasWitnesses) {
      length += 2;
    }
    
    // Input count + inputs
    length += this.varIntLength(this.ins.length);
    length += this.ins.reduce((sum, input) => {
      return sum + 40 + this.varIntLength(input.script.length) + input.script.length;
    }, 0);
    
    // Output count + outputs
    length += this.varIntLength(this.outs.length);
    length += this.outs.reduce((sum, output) => {
      return sum + 8 + this.varIntLength(output.script.length) + output.script.length;
    }, 0);
    
    // Witness data
    if (hasWitnesses) {
      length += this.ins.reduce((sum, input) => {
        let witnessLength = this.varIntLength(input.witness.length);
        witnessLength += input.witness.reduce((wSum, witness) => {
          return wSum + this.varIntLength(witness.length) + witness.length;
        }, 0);
        return sum + witnessLength;
      }, 0);
    }
    
    return length;
  }

  /**
   * Clone the transaction
   */
  clone(): Transaction {
    const tx = new Transaction();
    tx.version = this.version;
    tx.locktime = this.locktime;
    tx.ins = this.ins.map(input => ({
      hash: Buffer.from(input.hash),
      index: input.index,
      script: Buffer.from(input.script),
      sequence: input.sequence,
      witness: input.witness.map(w => Buffer.from(w))
    }));
    tx.outs = this.outs.map(output => ({
      script: Buffer.from(output.script),
      value: output.value
    }));
    return tx;
  }

  /**
   * Get the transaction hash
   */
  getHash(_forWitness?: boolean): Buffer {
    // For simplicity, returning a placeholder hash
    // In a real implementation, this would use the actual transaction serialization and double SHA256
    return Buffer.from('0'.repeat(64), 'hex');
  }

  /**
   * Get the transaction ID (reverse of hash)
   */
  getId(): string {
    return this.getHash().reverse().toString('hex');
  }

  /**
   * Serialize the transaction to a Buffer
   */
  toBuffer(buffer?: Buffer, initialOffset?: number): Buffer {
    const length = this.byteLength();
    const targetBuffer = buffer || Buffer.allocUnsafe(length);
    let offset = initialOffset || 0;
    
    // Write version
    targetBuffer.writeUInt32LE(this.version, offset);
    offset += 4;
    
    const hasWitnesses = this.hasWitnesses();
    
    // Write witness marker and flag if needed
    if (hasWitnesses) {
      targetBuffer.writeUInt8(0x00, offset); // marker
      targetBuffer.writeUInt8(0x01, offset + 1); // flag
      offset += 2;
    }
    
    // Write input count
    offset = this.writeVarInt(targetBuffer, this.ins.length, offset);
    
    // Write inputs
    for (const input of this.ins) {
      input.hash.copy(targetBuffer, offset);
      offset += 32;
      targetBuffer.writeUInt32LE(input.index, offset);
      offset += 4;
      offset = this.writeVarInt(targetBuffer, input.script.length, offset);
      input.script.copy(targetBuffer, offset);
      offset += input.script.length;
      targetBuffer.writeUInt32LE(input.sequence, offset);
      offset += 4;
    }
    
    // Write output count
    offset = this.writeVarInt(targetBuffer, this.outs.length, offset);
    
    // Write outputs
    for (const output of this.outs) {
      this.writeUInt64LE(targetBuffer, output.value, offset);
      offset += 8;
      offset = this.writeVarInt(targetBuffer, output.script.length, offset);
      output.script.copy(targetBuffer, offset);
      offset += output.script.length;
    }
    
    // Write witness data
    if (hasWitnesses) {
      for (const input of this.ins) {
        offset = this.writeVarInt(targetBuffer, input.witness.length, offset);
        for (const witness of input.witness) {
          offset = this.writeVarInt(targetBuffer, witness.length, offset);
          witness.copy(targetBuffer, offset);
          offset += witness.length;
        }
      }
    }
    
    // Write locktime
    targetBuffer.writeUInt32LE(this.locktime, offset);
    
    return targetBuffer;
  }

  /**
   * Serialize the transaction to a hex string
   */
  toHex(): string {
    return this.toBuffer().toString('hex');
  }

  /**
   * Set the script for an input
   */
  setInputScript(index: number, scriptSig: Buffer): void {
    if (index >= this.ins.length) {
      throw new Error('Input index out of range');
    }
    this.ins[index].script = scriptSig;
  }

  /**
   * Set the witness data for an input
   */
  setWitness(index: number, witness: Buffer[]): void {
    if (index >= this.ins.length) {
      throw new Error('Input index out of range');
    }
    this.ins[index].witness = witness;
  }

  // Helper methods for reading and writing variable integers
  private static readVarInt(buffer: Buffer, offset: number): { value: number; offset: number } {
    const first = buffer.readUInt8(offset);
    if (first < 0xfd) {
      return { value: first, offset: offset + 1 };
    } else if (first === 0xfd) {
      return { value: buffer.readUInt16LE(offset + 1), offset: offset + 3 };
    } else if (first === 0xfe) {
      return { value: buffer.readUInt32LE(offset + 1), offset: offset + 5 };
    } else {
      // 0xff - 64-bit (not fully supported in JavaScript)
      const low = buffer.readUInt32LE(offset + 1);
      const high = buffer.readUInt32LE(offset + 5);
      return { value: low + (high * 0x100000000), offset: offset + 9 };
    }
  }

  private static readUInt64LE(buffer: Buffer, offset: number): number {
    const low = buffer.readUInt32LE(offset);
    const high = buffer.readUInt32LE(offset + 4);
    return low + (high * 0x100000000);
  }

  private varIntLength(value: number): number {
    if (value < 0xfd) return 1;
    if (value <= 0xffff) return 3;
    if (value <= 0xffffffff) return 5;
    return 9;
  }

  private writeVarInt(buffer: Buffer, value: number, offset: number): number {
    if (value < 0xfd) {
      buffer.writeUInt8(value, offset);
      return offset + 1;
    } else if (value <= 0xffff) {
      buffer.writeUInt8(0xfd, offset);
      buffer.writeUInt16LE(value, offset + 1);
      return offset + 3;
    } else if (value <= 0xffffffff) {
      buffer.writeUInt8(0xfe, offset);
      buffer.writeUInt32LE(value, offset + 1);
      return offset + 5;
    } else {
      buffer.writeUInt8(0xff, offset);
      buffer.writeUInt32LE(value & 0xffffffff, offset + 1);
      buffer.writeUInt32LE(Math.floor(value / 0x100000000), offset + 5);
      return offset + 9;
    }
  }

  private writeUInt64LE(buffer: Buffer, value: number, offset: number): void {
    buffer.writeUInt32LE(value & 0xffffffff, offset);
    buffer.writeUInt32LE(Math.floor(value / 0x100000000), offset + 4);
  }

  // Signature hash methods (simplified implementations)
  hashForSignature(_inIndex: number, _prevOutScript: Buffer, _hashType: number): Buffer {
    // Simplified implementation - in a real scenario this would implement the full BIP143/BIP341 logic
    return Buffer.from('0'.repeat(64), 'hex');
  }

  hashForWitnessV1(_inIndex: number, _prevOutScripts: Buffer[], _values: number[], _hashType: number, _leafHash?: Buffer, _annex?: Buffer): Buffer {
    // Simplified implementation for Taproot (BIP341)
    return Buffer.from('0'.repeat(64), 'hex');
  }

  hashForWitnessV0(_inIndex: number, _prevOutScript: Buffer, _value: number, _hashType: number): Buffer {
    // Simplified implementation for SegWit v0 (BIP143)
    return Buffer.from('0'.repeat(64), 'hex');
  }
}
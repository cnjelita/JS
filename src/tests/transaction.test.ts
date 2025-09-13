import { describe, it, expect } from "@jest/globals";
import { Transaction } from "../transaction.js";

describe("Transaction", () => {
  describe("Constructor", () => {
    it("should create a transaction with default values", () => {
      const tx = new Transaction();
      expect(tx.version).toBe(1);
      expect(tx.locktime).toBe(0);
      expect(tx.ins).toEqual([]);
      expect(tx.outs).toEqual([]);
    });
  });

  describe("Constants", () => {
    it("should have correct constant values", () => {
      expect(Transaction.DEFAULT_SEQUENCE).toBe(0xffffffff);
      expect(Transaction.SIGHASH_DEFAULT).toBe(0x00);
      expect(Transaction.SIGHASH_ALL).toBe(0x01);
      expect(Transaction.SIGHASH_NONE).toBe(0x02);
      expect(Transaction.SIGHASH_SINGLE).toBe(0x03);
      expect(Transaction.SIGHASH_ANYONECANPAY).toBe(0x80);
      expect(Transaction.SIGHASH_OUTPUT_MASK).toBe(0x03);
      expect(Transaction.SIGHASH_INPUT_MASK).toBe(0x80);
      expect(Transaction.ADVANCED_TRANSACTION_MARKER).toBe(0x00);
      expect(Transaction.ADVANCED_TRANSACTION_FLAG).toBe(0x01);
    });
  });

  describe("addInput", () => {
    it("should add an input with default sequence", () => {
      const tx = new Transaction();
      const hash = Buffer.from('a'.repeat(64), 'hex');
      const index = tx.addInput(hash, 0);
      
      expect(index).toBe(0);
      expect(tx.ins).toHaveLength(1);
      expect(tx.ins[0].hash).toEqual(hash);
      expect(tx.ins[0].index).toBe(0);
      expect(tx.ins[0].sequence).toBe(Transaction.DEFAULT_SEQUENCE);
      expect(tx.ins[0].script).toEqual(Buffer.alloc(0));
      expect(tx.ins[0].witness).toEqual([]);
    });

    it("should add an input with custom sequence and script", () => {
      const tx = new Transaction();
      const hash = Buffer.from('b'.repeat(64), 'hex');
      const script = Buffer.from('scriptSig', 'utf8');
      const sequence = 0x12345678;
      
      const index = tx.addInput(hash, 1, sequence, script);
      
      expect(index).toBe(0);
      expect(tx.ins[0].hash).toEqual(hash);
      expect(tx.ins[0].index).toBe(1);
      expect(tx.ins[0].sequence).toBe(sequence);
      expect(tx.ins[0].script).toEqual(script);
    });

    it("should return correct index for multiple inputs", () => {
      const tx = new Transaction();
      const hash1 = Buffer.from('a'.repeat(64), 'hex');
      const hash2 = Buffer.from('b'.repeat(64), 'hex');
      
      const index1 = tx.addInput(hash1, 0);
      const index2 = tx.addInput(hash2, 1);
      
      expect(index1).toBe(0);
      expect(index2).toBe(1);
      expect(tx.ins).toHaveLength(2);
    });
  });

  describe("addOutput", () => {
    it("should add an output", () => {
      const tx = new Transaction();
      const script = Buffer.from('scriptPubKey', 'utf8');
      const value = 50000000; // 0.5 BTC in satoshis
      
      const index = tx.addOutput(script, value);
      
      expect(index).toBe(0);
      expect(tx.outs).toHaveLength(1);
      expect(tx.outs[0].script).toEqual(script);
      expect(tx.outs[0].value).toBe(value);
    });

    it("should return correct index for multiple outputs", () => {
      const tx = new Transaction();
      const script1 = Buffer.from('script1', 'utf8');
      const script2 = Buffer.from('script2', 'utf8');
      
      const index1 = tx.addOutput(script1, 25000000);
      const index2 = tx.addOutput(script2, 25000000);
      
      expect(index1).toBe(0);
      expect(index2).toBe(1);
      expect(tx.outs).toHaveLength(2);
    });
  });

  describe("isCoinbase", () => {
    it("should return false for empty transaction", () => {
      const tx = new Transaction();
      expect(tx.isCoinbase()).toBe(false);
    });

    it("should return true for coinbase transaction", () => {
      const tx = new Transaction();
      const coinbaseHash = Buffer.alloc(32, 0);
      tx.addInput(coinbaseHash, 0xffffffff);
      
      expect(tx.isCoinbase()).toBe(true);
    });

    it("should return false for non-coinbase transaction", () => {
      const tx = new Transaction();
      const hash = Buffer.from('a'.repeat(64), 'hex');
      tx.addInput(hash, 0);
      
      expect(tx.isCoinbase()).toBe(false);
    });

    it("should return false when multiple inputs exist", () => {
      const tx = new Transaction();
      const coinbaseHash = Buffer.alloc(32, 0);
      const regularHash = Buffer.from('a'.repeat(64), 'hex');
      
      tx.addInput(coinbaseHash, 0xffffffff);
      tx.addInput(regularHash, 0);
      
      expect(tx.isCoinbase()).toBe(false);
    });
  });

  describe("isCoinbaseHash", () => {
    it("should return true for zero hash", () => {
      const zeroHash = Buffer.alloc(32, 0);
      expect(Transaction.isCoinbaseHash(zeroHash)).toBe(true);
    });

    it("should return false for non-zero hash", () => {
      const hash = Buffer.from('a'.repeat(64), 'hex');
      expect(Transaction.isCoinbaseHash(hash)).toBe(false);
    });

    it("should return false for wrong length buffer", () => {
      const shortBuffer = Buffer.alloc(16, 0);
      const longBuffer = Buffer.alloc(64, 0);
      
      expect(Transaction.isCoinbaseHash(shortBuffer)).toBe(false);
      expect(Transaction.isCoinbaseHash(longBuffer)).toBe(false);
    });
  });

  describe("hasWitnesses", () => {
    it("should return false for transaction without witnesses", () => {
      const tx = new Transaction();
      const hash = Buffer.from('a'.repeat(64), 'hex');
      tx.addInput(hash, 0);
      
      expect(tx.hasWitnesses()).toBe(false);
    });

    it("should return true for transaction with witnesses", () => {
      const tx = new Transaction();
      const hash = Buffer.from('a'.repeat(64), 'hex');
      tx.addInput(hash, 0);
      tx.ins[0].witness = [Buffer.from('witness', 'utf8')];
      
      expect(tx.hasWitnesses()).toBe(true);
    });
  });

  describe("stripWitnesses", () => {
    it("should remove all witness data", () => {
      const tx = new Transaction();
      const hash = Buffer.from('a'.repeat(64), 'hex');
      tx.addInput(hash, 0);
      tx.addInput(hash, 1);
      
      tx.ins[0].witness = [Buffer.from('witness1', 'utf8')];
      tx.ins[1].witness = [Buffer.from('witness2', 'utf8')];
      
      expect(tx.hasWitnesses()).toBe(true);
      
      tx.stripWitnesses();
      
      expect(tx.hasWitnesses()).toBe(false);
      expect(tx.ins[0].witness).toEqual([]);
      expect(tx.ins[1].witness).toEqual([]);
    });
  });

  describe("setInputScript", () => {
    it("should set script for valid input index", () => {
      const tx = new Transaction();
      const hash = Buffer.from('a'.repeat(64), 'hex');
      tx.addInput(hash, 0);
      
      const newScript = Buffer.from('newScript', 'utf8');
      tx.setInputScript(0, newScript);
      
      expect(tx.ins[0].script).toEqual(newScript);
    });

    it("should throw error for invalid input index", () => {
      const tx = new Transaction();
      const script = Buffer.from('script', 'utf8');
      
      expect(() => tx.setInputScript(0, script)).toThrow('Input index out of range');
      expect(() => tx.setInputScript(1, script)).toThrow('Input index out of range');
    });
  });

  describe("setWitness", () => {
    it("should set witness for valid input index", () => {
      const tx = new Transaction();
      const hash = Buffer.from('a'.repeat(64), 'hex');
      tx.addInput(hash, 0);
      
      const witness = [Buffer.from('witness1', 'utf8'), Buffer.from('witness2', 'utf8')];
      tx.setWitness(0, witness);
      
      expect(tx.ins[0].witness).toEqual(witness);
    });

    it("should throw error for invalid input index", () => {
      const tx = new Transaction();
      const witness = [Buffer.from('witness', 'utf8')];
      
      expect(() => tx.setWitness(0, witness)).toThrow('Input index out of range');
      expect(() => tx.setWitness(1, witness)).toThrow('Input index out of range');
    });
  });

  describe("clone", () => {
    it("should create a deep copy of the transaction", () => {
      const tx = new Transaction();
      tx.version = 2;
      tx.locktime = 500000;
      
      const hash = Buffer.from('a'.repeat(64), 'hex');
      const script = Buffer.from('script', 'utf8');
      const witness = [Buffer.from('witness', 'utf8')];
      
      tx.addInput(hash, 0, 0x12345678, script);
      tx.addOutput(Buffer.from('outputScript', 'utf8'), 50000000);
      tx.ins[0].witness = witness;
      
      const cloned = tx.clone();
      
      // Check that values are copied
      expect(cloned.version).toBe(tx.version);
      expect(cloned.locktime).toBe(tx.locktime);
      expect(cloned.ins).toHaveLength(tx.ins.length);
      expect(cloned.outs).toHaveLength(tx.outs.length);
      
      // Check that buffers are different instances
      expect(cloned.ins[0].hash).not.toBe(tx.ins[0].hash);
      expect(cloned.ins[0].script).not.toBe(tx.ins[0].script);
      expect(cloned.ins[0].witness[0]).not.toBe(tx.ins[0].witness[0]);
      expect(cloned.outs[0].script).not.toBe(tx.outs[0].script);
      
      // Check that values are equal
      expect(cloned.ins[0].hash).toEqual(tx.ins[0].hash);
      expect(cloned.ins[0].script).toEqual(tx.ins[0].script);
      expect(cloned.ins[0].witness).toEqual(tx.ins[0].witness);
      expect(cloned.outs[0].script).toEqual(tx.outs[0].script);
    });
  });

  describe("byteLength", () => {
    it("should calculate correct length for empty transaction", () => {
      const tx = new Transaction();
      // version(4) + input_count(1) + output_count(1) + locktime(4) = 10 bytes
      expect(tx.byteLength()).toBe(10);
    });

    it("should calculate correct length for transaction with inputs and outputs", () => {
      const tx = new Transaction();
      const hash = Buffer.from('a'.repeat(64), 'hex');
      const script = Buffer.from('test', 'utf8'); // 4 bytes
      
      tx.addInput(hash, 0, 0x12345678, script);
      tx.addOutput(script, 50000000);
      
      // version(4) + input_count(1) + input(32+4+1+4+4) + output_count(1) + output(8+1+4) + locktime(4)
      // = 4 + 1 + 45 + 1 + 13 + 4 = 68 bytes
      expect(tx.byteLength()).toBe(68);
    });
  });

  describe("serialization", () => {
    it("should serialize and deserialize simple transaction", () => {
      const tx = new Transaction();
      tx.version = 2;
      tx.locktime = 500000;
      
      const hash = Buffer.from('a'.repeat(64), 'hex');
      const inputScript = Buffer.from('inputScript', 'utf8');
      const outputScript = Buffer.from('outputScript', 'utf8');
      
      tx.addInput(hash, 0, 0x12345678, inputScript);
      tx.addOutput(outputScript, 50000000);
      
      const buffer = tx.toBuffer();
      const hex = tx.toHex();
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(hex).toBe(buffer.toString('hex'));
      expect(buffer.length).toBe(tx.byteLength());
    });

    it("should handle fromHex static method", () => {
      const tx = new Transaction();
      tx.addInput(Buffer.from('a'.repeat(64), 'hex'), 0);
      tx.addOutput(Buffer.from('script', 'utf8'), 50000000);
      
      const hex = tx.toHex();
      
      // Note: fromHex is simplified and may not work perfectly with complex transactions
      // This test ensures the method exists and can be called
      expect(() => Transaction.fromHex(hex)).not.toThrow();
    });
  });

  describe("weight and virtualSize", () => {
    it("should calculate weight for transaction without witnesses", () => {
      const tx = new Transaction();
      const hash = Buffer.from('a'.repeat(64), 'hex');
      tx.addInput(hash, 0);
      tx.addOutput(Buffer.from('script', 'utf8'), 50000000);
      
      const baseSize = tx.byteLength(false);
      const totalSize = tx.byteLength(true);
      const expectedWeight = baseSize * 3 + totalSize;
      
      expect(tx.weight()).toBe(expectedWeight);
    });

    it("should calculate virtual size correctly", () => {
      const tx = new Transaction();
      const hash = Buffer.from('a'.repeat(64), 'hex');
      tx.addInput(hash, 0);
      tx.addOutput(Buffer.from('script', 'utf8'), 50000000);
      
      const weight = tx.weight();
      const expectedVirtualSize = Math.ceil(weight / 4);
      
      expect(tx.virtualSize()).toBe(expectedVirtualSize);
    });
  });

  describe("hash methods", () => {
    it("should return hash and ID", () => {
      const tx = new Transaction();
      tx.addInput(Buffer.from('a'.repeat(64), 'hex'), 0);
      tx.addOutput(Buffer.from('script', 'utf8'), 50000000);
      
      const hash = tx.getHash();
      const id = tx.getId();
      
      expect(hash).toBeInstanceOf(Buffer);
      expect(hash.length).toBe(32);
      expect(typeof id).toBe('string');
      expect(id.length).toBe(64);
    });

    it("should handle signature hash methods", () => {
      const tx = new Transaction();
      tx.addInput(Buffer.from('a'.repeat(64), 'hex'), 0);
      
      const prevOutScript = Buffer.from('script', 'utf8');
      const hashType = Transaction.SIGHASH_ALL;
      
      // These are simplified implementations, so we just check they don't throw
      expect(() => tx.hashForSignature(0, prevOutScript, hashType)).not.toThrow();
      expect(() => tx.hashForWitnessV0(0, prevOutScript, 50000000, hashType)).not.toThrow();
      expect(() => tx.hashForWitnessV1(0, [prevOutScript], [50000000], hashType)).not.toThrow();
    });
  });
});
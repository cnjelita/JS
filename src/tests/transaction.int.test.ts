import { describe, it, expect } from "@jest/globals";
import { Transaction } from "../transaction.js";

describe("Transaction Integration", () => {
  it("should create and manipulate a complete transaction", () => {
    // Create a new transaction
    const tx = new Transaction();
    tx.version = 2;
    tx.locktime = 500000;

    // Add a previous transaction output as input
    const prevTxHash = Buffer.from(
      "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "hex"
    );
    const inputIndex = tx.addInput(prevTxHash, 0, 0xfffffffe);

    // Add an output (P2PKH-like script)
    const outputScript = Buffer.concat([
      Buffer.from([0x76, 0xa9, 0x14]), // OP_DUP OP_HASH160 OP_PUSHDATA(20)
      Buffer.from("1234567890abcdef1234567890abcdef12345678", "hex"), // 20-byte hash
      Buffer.from([0x88, 0xac]) // OP_EQUALVERIFY OP_CHECKSIG
    ]);
    const outputIndex = tx.addOutput(outputScript, 50000000); // 0.5 BTC

    // Verify the transaction structure
    expect(inputIndex).toBe(0);
    expect(outputIndex).toBe(0);
    expect(tx.ins).toHaveLength(1);
    expect(tx.outs).toHaveLength(1);

    // Check input properties
    expect(tx.ins[0].hash).toEqual(prevTxHash);
    expect(tx.ins[0].index).toBe(0);
    expect(tx.ins[0].sequence).toBe(0xfffffffe);

    // Check output properties
    expect(tx.outs[0].script).toEqual(outputScript);
    expect(tx.outs[0].value).toBe(50000000);

    // Test transaction properties
    expect(tx.isCoinbase()).toBe(false);
    expect(tx.hasWitnesses()).toBe(false);

    // Test serialization
    const buffer = tx.toBuffer();
    const hex = tx.toHex();
    
    expect(buffer).toBeInstanceOf(Buffer);
    expect(hex).toBe(buffer.toString('hex'));
    expect(buffer.length).toBe(tx.byteLength());

    // Test weight and virtual size calculations
    const weight = tx.weight();
    const virtualSize = tx.virtualSize();
    
    expect(weight).toBeGreaterThan(0);
    expect(virtualSize).toBe(Math.ceil(weight / 4));
    expect(virtualSize).toBe(tx.byteLength()); // For non-witness transactions

    // Test cloning
    const cloned = tx.clone();
    expect(cloned).not.toBe(tx);
    expect(cloned.version).toBe(tx.version);
    expect(cloned.locktime).toBe(tx.locktime);
    expect(cloned.ins).toEqual(tx.ins);
    expect(cloned.outs).toEqual(tx.outs);

    // Test that cloned buffers are separate instances
    expect(cloned.ins[0].hash).not.toBe(tx.ins[0].hash);
    expect(cloned.outs[0].script).not.toBe(tx.outs[0].script);
  });

  it("should handle witness transactions", () => {
    const tx = new Transaction();
    
    // Add input
    const prevTxHash = Buffer.from("a".repeat(64), "hex");
    tx.addInput(prevTxHash, 0);
    
    // Add witness data
    const witnessData = [
      Buffer.from("signature", "utf8"),
      Buffer.from("publickey", "utf8")
    ];
    tx.setWitness(0, witnessData);
    
    // Add output
    const outputScript = Buffer.from("witnessScript", "utf8");
    tx.addOutput(outputScript, 25000000);
    
    // Verify witness functionality
    expect(tx.hasWitnesses()).toBe(true);
    expect(tx.ins[0].witness).toEqual(witnessData);
    
    // Test weight calculation with witnesses
    const weightWithWitness = tx.weight();
    const baseSize = tx.byteLength(false);
    const totalSize = tx.byteLength(true);
    const expectedWeight = baseSize * 3 + totalSize;
    
    expect(weightWithWitness).toBe(expectedWeight);
    expect(tx.virtualSize()).toBe(Math.ceil(weightWithWitness / 4));
    
    // Strip witnesses and verify
    tx.stripWitnesses();
    expect(tx.hasWitnesses()).toBe(false);
    expect(tx.ins[0].witness).toEqual([]);
  });

  it("should detect coinbase transactions", () => {
    const tx = new Transaction();
    
    // Add coinbase input (all zeros hash + 0xffffffff index)
    const coinbaseHash = Buffer.alloc(32, 0);
    tx.addInput(coinbaseHash, 0xffffffff);
    
    // Add coinbase output
    const coinbaseScript = Buffer.from("coinbaseScript", "utf8");
    tx.addOutput(coinbaseScript, 5000000000); // 50 BTC block reward
    
    expect(tx.isCoinbase()).toBe(true);
    expect(Transaction.isCoinbaseHash(coinbaseHash)).toBe(true);
    
    // Add another input - should no longer be coinbase
    const regularHash = Buffer.from("b".repeat(64), "hex");
    tx.addInput(regularHash, 0);
    
    expect(tx.isCoinbase()).toBe(false);
  });

  it("should handle script and witness modifications", () => {
    const tx = new Transaction();
    const hash = Buffer.from("c".repeat(64), "hex");
    tx.addInput(hash, 0);
    
    // Test setting input script
    const newScript = Buffer.from("newScriptSig", "utf8");
    tx.setInputScript(0, newScript);
    expect(tx.ins[0].script).toEqual(newScript);
    
    // Test setting witness
    const witness = [Buffer.from("wit1", "utf8"), Buffer.from("wit2", "utf8")];
    tx.setWitness(0, witness);
    expect(tx.ins[0].witness).toEqual(witness);
    
    // Test error conditions
    expect(() => tx.setInputScript(1, newScript)).toThrow("Input index out of range");
    expect(() => tx.setWitness(1, witness)).toThrow("Input index out of range");
  });

  it("should demonstrate transaction workflow", () => {
    // Simulate creating a transaction to send Bitcoin
    const tx = new Transaction();
    
    // Add previous unspent output as input
    const utxoHash = Buffer.from(
      "fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
      "hex"
    );
    tx.addInput(utxoHash, 1, Transaction.DEFAULT_SEQUENCE);
    
    // Add recipient output (simplified P2PKH)
    const recipientScript = Buffer.from("recipientPubKeyHash", "utf8");
    tx.addOutput(recipientScript, 45000000); // 0.45 BTC to recipient
    
    // Add change output
    const changeScript = Buffer.from("changePubKeyHash", "utf8");
    tx.addOutput(changeScript, 4950000); // 0.04950000 BTC change (0.0005 BTC fee)
    
    // Verify the transaction
    expect(tx.ins).toHaveLength(1);
    expect(tx.outs).toHaveLength(2);
    expect(tx.outs[0].value + tx.outs[1].value).toBe(49950000); // Total output < input (fee)
    
    // Get transaction details
    const txId = tx.getId();
    const size = tx.byteLength();
    const virtualSize = tx.virtualSize();
    
    expect(txId).toHaveLength(64); // 32 bytes as hex
    expect(size).toBeGreaterThan(0);
    expect(virtualSize).toBeGreaterThan(0);
    
    // eslint-disable-next-line no-console
    console.log("Transaction created successfully:");
    // eslint-disable-next-line no-console
    console.log("- ID:", txId);
    // eslint-disable-next-line no-console
    console.log("- Size:", size, "bytes");
    // eslint-disable-next-line no-console
    console.log("- Virtual Size:", virtualSize, "bytes");
    // eslint-disable-next-line no-console
    console.log("- Inputs:", tx.ins.length);
    // eslint-disable-next-line no-console
    console.log("- Outputs:", tx.outs.length);
  });
});
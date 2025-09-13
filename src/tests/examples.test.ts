import { describe, it, expect } from "@jest/globals";
import { parseLarkGrammar } from "../lark-parser.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Example Grammars", () => {
  it("should parse arithmetic.lark", () => {
    const content = readFileSync(join(__dirname, "../../examples/arithmetic.lark"), "utf-8");
    const grammar = parseLarkGrammar(content);
    
    expect(grammar.rules).toHaveLength(4);
    expect(grammar.terminals).toHaveLength(1);
    expect(grammar.directives).toHaveLength(2);
    
    // Should have start rule
    expect(grammar.rules.some((r) => r.name === "start")).toBe(true);
    
    // Should have NUMBER terminal
    expect(grammar.terminals.some((t) => t.name === "NUMBER")).toBe(true);
  });

  it("should parse json.lark", () => {
    const content = readFileSync(join(__dirname, "../../examples/json.lark"), "utf-8");
    const grammar = parseLarkGrammar(content);
    
    expect(grammar.rules.length).toBeGreaterThan(0);
    expect(grammar.terminals.length).toBeGreaterThan(0);
    
    // Should have key JSON rules
    expect(grammar.rules.some((r) => r.name === "value")).toBe(true);
    expect(grammar.rules.some((r) => r.name === "object")).toBe(true);
    expect(grammar.rules.some((r) => r.name === "array")).toBe(true);
  });

  it("should parse simple_lang.lark", () => {
    const content = readFileSync(join(__dirname, "../../examples/simple_lang.lark"), "utf-8");
    const grammar = parseLarkGrammar(content);
    
    expect(grammar.rules.length).toBeGreaterThan(0);
    expect(grammar.terminals.length).toBeGreaterThan(0);
    
    // Should have programming language constructs
    expect(grammar.rules.some((r) => r.name === "program")).toBe(true);
    expect(grammar.rules.some((r) => r.name === "statement")).toBe(true);
    expect(grammar.rules.some((r) => r.name === "expression")).toBe(true);
  });

  it("should parse config.lark", () => {
    const content = readFileSync(join(__dirname, "../../examples/config.lark"), "utf-8");
    const grammar = parseLarkGrammar(content);
    
    expect(grammar.rules.length).toBeGreaterThan(0);
    expect(grammar.terminals.length).toBeGreaterThan(0);
    
    // Should have config file constructs
    expect(grammar.rules.some((r) => r.name === "config")).toBe(true);
    expect(grammar.rules.some((r) => r.name === "section")).toBe(true);
    expect(grammar.terminals.some((t) => t.name === "SECTION_NAME")).toBe(true);
  });
});
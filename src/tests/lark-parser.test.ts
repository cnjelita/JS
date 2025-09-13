import { describe, it, expect } from "@jest/globals";
import { 
  LarkLexer, 
  parseLarkGrammar,
  TokenType
} from "../lark-parser.js";

describe("LarkLexer", () => {
  it("should tokenize basic rule definition", () => {
    const lexer = new LarkLexer("start: expr");
    const tokens = lexer.tokenize();
    
    expect(tokens).toHaveLength(4); // start, :, expr, EOF
    expect(tokens[0].type).toBe(TokenType.RULE_NAME);
    expect(tokens[0].value).toBe("start");
    expect(tokens[1].type).toBe(TokenType.COLON);
    expect(tokens[2].type).toBe(TokenType.RULE_NAME);
    expect(tokens[2].value).toBe("expr");
    expect(tokens[3].type).toBe(TokenType.EOF);
  });

  it("should tokenize terminal definition", () => {
    const lexer = new LarkLexer('NUMBER: /[0-9]+/');
    const tokens = lexer.tokenize();
    
    expect(tokens).toHaveLength(4); // NUMBER, :, /[0-9]+/, EOF
    expect(tokens[0].type).toBe(TokenType.TERMINAL_NAME);
    expect(tokens[0].value).toBe("NUMBER");
    expect(tokens[1].type).toBe(TokenType.COLON);
    expect(tokens[2].type).toBe(TokenType.REGEX_LITERAL);
    expect(tokens[2].value).toBe("[0-9]+");
  });

  it("should tokenize string literals", () => {
    const lexer = new LarkLexer('"hello" \'world\'');
    const tokens = lexer.tokenize();
    
    expect(tokens).toHaveLength(3); // "hello", 'world', EOF
    expect(tokens[0].type).toBe(TokenType.STRING_LITERAL);
    expect(tokens[0].value).toBe("hello");
    expect(tokens[1].type).toBe(TokenType.STRING_LITERAL);
    expect(tokens[1].value).toBe("world");
  });

  it("should tokenize operators", () => {
    const lexer = new LarkLexer("expr? expr* expr+ (expr | term)");
    const tokens = lexer.tokenize();
    
    const expectedTypes = [
      TokenType.RULE_NAME, TokenType.QUESTION,
      TokenType.RULE_NAME, TokenType.STAR,
      TokenType.RULE_NAME, TokenType.PLUS,
      TokenType.LPAREN, TokenType.RULE_NAME, TokenType.PIPE, TokenType.RULE_NAME, TokenType.RPAREN,
      TokenType.EOF
    ];
    
    expect(tokens.map((t) => t.type)).toEqual(expectedTypes);
  });

  it("should tokenize directives", () => {
    const lexer = new LarkLexer("%import common.WS\n%ignore WS");
    const tokens = lexer.tokenize();
    
    expect(tokens[0].type).toBe(TokenType.DIRECTIVE);
    expect(tokens[0].value).toBe("import");
    expect(tokens[1].type).toBe(TokenType.RULE_NAME);
    expect(tokens[1].value).toBe("common");
  });

  it("should handle comments", () => {
    const lexer = new LarkLexer("start: expr // this is a comment");
    const tokens = lexer.tokenize();
    
    // Comments should be filtered out
    expect(tokens).toHaveLength(4); // start, :, expr, EOF
    expect(tokens.every((t) => t.type !== TokenType.COMMENT)).toBe(true);
  });

  it("should track line and column numbers", () => {
    const lexer = new LarkLexer("start:\n  expr");
    const tokens = lexer.tokenize();
    
    expect(tokens[0].line).toBe(1);
    expect(tokens[0].column).toBe(1);
    expect(tokens[3].line).toBe(2);  // tokens: start, :, \n, expr, EOF
    expect(tokens[3].column).toBe(3);
  });
});

describe("LarkParser", () => {
  it("should parse simple rule", () => {
    const grammar = parseLarkGrammar("start: expr");
    
    expect(grammar.rules).toHaveLength(1);
    expect(grammar.rules[0].name).toBe("start");
    expect(grammar.rules[0].definition.type).toBe("rule_ref");
    if (grammar.rules[0].definition.type === "rule_ref") {
      expect(grammar.rules[0].definition.name).toBe("expr");
    }
  });

  it("should parse rule with choice", () => {
    const grammar = parseLarkGrammar("expr: term | factor");
    
    expect(grammar.rules).toHaveLength(1);
    expect(grammar.rules[0].definition.type).toBe("choice");
    if (grammar.rules[0].definition.type === "choice") {
      expect(grammar.rules[0].definition.alternatives).toHaveLength(2);
    }
  });

  it("should parse rule with sequence", () => {
    const grammar = parseLarkGrammar("expr: term factor");
    
    expect(grammar.rules).toHaveLength(1);
    expect(grammar.rules[0].definition.type).toBe("sequence");
    if (grammar.rules[0].definition.type === "sequence") {
      expect(grammar.rules[0].definition.elements).toHaveLength(2);
    }
  });

  it("should parse optional expressions", () => {
    const grammar = parseLarkGrammar("expr: term?");
    
    expect(grammar.rules[0].definition.type).toBe("optional");
    if (grammar.rules[0].definition.type === "optional") {
      expect(grammar.rules[0].definition.element.type).toBe("rule_ref");
    }
  });

  it("should parse repetition expressions", () => {
    const grammar = parseLarkGrammar("expr: term* | factor+");
    
    expect(grammar.rules[0].definition.type).toBe("choice");
    if (grammar.rules[0].definition.type === "choice") {
      const first = grammar.rules[0].definition.alternatives[0];
      const second = grammar.rules[0].definition.alternatives[1];
      
      expect(first.type).toBe("repeat");
      if (first.type === "repeat") {
        expect(first.min).toBe(0);
      }
      
      expect(second.type).toBe("repeat");
      if (second.type === "repeat") {
        expect(second.min).toBe(1);
      }
    }
  });

  it("should parse string literals", () => {
    const grammar = parseLarkGrammar('expr: "hello" "world"');
    
    expect(grammar.rules[0].definition.type).toBe("sequence");
    if (grammar.rules[0].definition.type === "sequence") {
      const elements = grammar.rules[0].definition.elements;
      expect(elements[0].type).toBe("literal");
      expect(elements[1].type).toBe("literal");
      if (elements[0].type === "literal" && elements[1].type === "literal") {
        expect(elements[0].value).toBe("hello");
        expect(elements[1].value).toBe("world");
      }
    }
  });

  it("should parse parenthesized expressions", () => {
    const grammar = parseLarkGrammar("expr: (term | factor)*");
    
    expect(grammar.rules[0].definition.type).toBe("repeat");
    if (grammar.rules[0].definition.type === "repeat") {
      expect(grammar.rules[0].definition.element.type).toBe("choice");
    }
  });

  it("should parse terminal definitions", () => {
    const grammar = parseLarkGrammar('NUMBER: /[0-9]+/\nWORD: "hello"');
    
    expect(grammar.terminals).toHaveLength(2);
    
    const numberTerminal = grammar.terminals.find((t) => t.name === "NUMBER");
    expect(numberTerminal).toBeDefined();
    expect(numberTerminal!.pattern).toBeInstanceOf(RegExp);
    
    const wordTerminal = grammar.terminals.find((t) => t.name === "WORD");
    expect(wordTerminal).toBeDefined();
    expect(wordTerminal!.pattern).toBe("hello");
  });

  it("should parse directives", () => {
    const grammar = parseLarkGrammar("%import common\n%ignore WS");
    
    expect(grammar.directives).toHaveLength(2);
    
    const importDirective = grammar.directives.find((d) => d.type === "import");
    expect(importDirective).toBeDefined();
    expect(importDirective!.target).toBe("common");
    
    const ignoreDirective = grammar.directives.find((d) => d.type === "ignore");
    expect(ignoreDirective).toBeDefined();
    expect(ignoreDirective!.target).toBe("WS");
  });

  it("should parse complete arithmetic grammar", () => {
    const arithmeticGrammar = `
start: expr

expr: term (("+" | "-") term)*
term: factor (("*" | "/") factor)*  
factor: NUMBER | "(" expr ")"

NUMBER: /[0-9]+/

%import common.WS
%ignore WS
    `.trim();
    
    const grammar = parseLarkGrammar(arithmeticGrammar);
    
    expect(grammar.rules).toHaveLength(4);
    expect(grammar.terminals).toHaveLength(1);
    expect(grammar.directives).toHaveLength(2);
    
    // Check start rule
    const startRule = grammar.rules.find((r) => r.name === "start");
    expect(startRule).toBeDefined();
    
    // Check NUMBER terminal
    const numberTerminal = grammar.terminals.find((t) => t.name === "NUMBER");
    expect(numberTerminal).toBeDefined();
    expect(numberTerminal!.pattern).toBeInstanceOf(RegExp);
    
    // Check directives
    expect(grammar.directives.some((d) => d.type === "import")).toBe(true);
    expect(grammar.directives.some((d) => d.type === "ignore")).toBe(true);
  });

  it("should handle newlines and whitespace correctly", () => {
    const grammar = parseLarkGrammar(`
      start: expr
      
      expr: term
      
      term: NUMBER
      
      NUMBER: /[0-9]+/
    `);
    
    expect(grammar.rules).toHaveLength(3);
    expect(grammar.terminals).toHaveLength(1);
  });

  it("should handle complex expressions with precedence", () => {
    const grammar = parseLarkGrammar(`
      expr: term (("+" | "-") term)*
      term: factor (("*" | "/") factor)*
      factor: NUMBER | "(" expr ")"
    `);
    
    expect(grammar.rules).toHaveLength(3);
    
    // Check that expr rule has sequence with repetition
    const exprRule = grammar.rules.find((r) => r.name === "expr");
    expect(exprRule).toBeDefined();
    expect(exprRule!.definition.type).toBe("sequence");
    
    if (exprRule!.definition.type === "sequence") {
      expect(exprRule!.definition.elements).toHaveLength(2);
      expect(exprRule!.definition.elements[1].type).toBe("repeat");
    }
  });
});

describe("Error Handling", () => {
  it("should throw error for unexpected tokens", () => {
    expect(() => {
      parseLarkGrammar("start @ expr");
    }).toThrow();
  });

  it("should throw error for missing colon", () => {
    expect(() => {
      parseLarkGrammar("start expr");
    }).toThrow();
  });

  it("should throw error for unclosed parentheses", () => {
    expect(() => {
      parseLarkGrammar("start: (expr");
    }).toThrow();
  });

  it("should provide line numbers in error messages", () => {
    try {
      parseLarkGrammar("start: expr\nbad @ token");
      fail("Expected error to be thrown");
    } catch (error) {
      expect((error as Error).message).toContain("line 2");
    }
  });
});

describe("Edge Cases", () => {
  it("should handle empty grammar", () => {
    const grammar = parseLarkGrammar("");
    
    expect(grammar.rules).toHaveLength(0);
    expect(grammar.terminals).toHaveLength(0);
    expect(grammar.directives).toHaveLength(0);
  });

  it("should handle grammar with only whitespace", () => {
    const grammar = parseLarkGrammar("   \n  \n  ");
    
    expect(grammar.rules).toHaveLength(0);
    expect(grammar.terminals).toHaveLength(0);
    expect(grammar.directives).toHaveLength(0);
  });

  it("should handle escaped characters in strings", () => {
    const grammar = parseLarkGrammar('start: "hello\\"world\\""');
    
    expect(grammar.rules[0].definition.type).toBe("literal");
    if (grammar.rules[0].definition.type === "literal") {
      expect(grammar.rules[0].definition.value).toBe('hello"world"');
    }
  });

  it("should handle complex regex patterns", () => {
    const grammar = parseLarkGrammar("COMPLEX: /[a-zA-Z_][a-zA-Z0-9_]*/");
    
    expect(grammar.terminals).toHaveLength(1);
    expect(grammar.terminals[0].pattern).toBeInstanceOf(RegExp);
    if (grammar.terminals[0].pattern instanceof RegExp) {
      expect(grammar.terminals[0].pattern.source).toBe("[a-zA-Z_][a-zA-Z0-9_]*");
    }
  });
});
/**
 * Lark Grammar Parser
 * 
 * This module implements a parser for Lark grammar files (.lark).
 * Lark is a parsing toolkit that uses EBNF-like syntax for grammar definitions.
 * 
 * Example Lark grammar:
 * ```
 * start: expr
 * 
 * expr: term (("+" | "-") term)*
 * term: factor (("*" | "/") factor)*
 * factor: NUMBER | "(" expr ")"
 * 
 * NUMBER: /[0-9]+/
 * 
 * %import common.WS
 * %ignore WS
 * ```
 */

// AST Node types for Lark grammar
export interface LarkRule {
  name: string;
  definition: LarkExpression;
  priority?: number;
}

export interface LarkTerminal {
  name: string;
  pattern: string | RegExp;
  flags?: string[];
}

export interface LarkDirective {
  type: 'import' | 'ignore' | 'declare';
  target: string;
  source?: string;
}

export type LarkExpression = 
  | LarkSequence
  | LarkChoice
  | LarkOptional
  | LarkRepeat
  | LarkTerminalRef
  | LarkRuleRef
  | LarkLiteral;

export interface LarkSequence {
  type: 'sequence';
  elements: LarkExpression[];
}

export interface LarkChoice {
  type: 'choice';
  alternatives: LarkExpression[];
}

export interface LarkOptional {
  type: 'optional';
  element: LarkExpression;
}

export interface LarkRepeat {
  type: 'repeat';
  element: LarkExpression;
  min: number;
  max?: number;
}

export interface LarkTerminalRef {
  type: 'terminal_ref';
  name: string;
}

export interface LarkRuleRef {
  type: 'rule_ref';
  name: string;
}

export interface LarkLiteral {
  type: 'literal';
  value: string;
}

export interface LarkGrammar {
  rules: LarkRule[];
  terminals: LarkTerminal[];
  directives: LarkDirective[];
  start?: string;
}

// Lexer tokens
export enum TokenType {
  RULE_NAME = 'RULE_NAME',
  TERMINAL_NAME = 'TERMINAL_NAME',
  COLON = 'COLON',
  PIPE = 'PIPE',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  QUESTION = 'QUESTION',
  STAR = 'STAR',
  PLUS = 'PLUS',
  DOT = 'DOT',
  STRING_LITERAL = 'STRING_LITERAL',
  REGEX_LITERAL = 'REGEX_LITERAL',
  DIRECTIVE = 'DIRECTIVE',
  NEWLINE = 'NEWLINE',
  WHITESPACE = 'WHITESPACE',
  COMMENT = 'COMMENT',
  EOF = 'EOF'
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export class LarkLexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  private peek(offset: number = 0): string {
    const pos = this.position + offset;
    return pos < this.input.length ? this.input[pos] : '';
  }

  private advance(): string {
    if (this.position >= this.input.length) return '';
    
    const char = this.input[this.position];
    this.position++;
    
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    
    return char;
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && /[ \t]/.test(this.peek())) {
      this.advance();
    }
  }

  private readString(): string {
    const quote = this.advance(); // consume opening quote
    let value = '';
    
    while (this.position < this.input.length) {
      const char = this.peek();
      if (char === quote) {
        this.advance(); // consume closing quote
        break;
      }
      if (char === '\\') {
        this.advance(); // consume backslash
        const escaped = this.advance();
        value += escaped;
      } else {
        value += this.advance();
      }
    }
    
    return value;
  }

  private readRegex(): string {
    this.advance(); // consume opening /
    let value = '';
    
    while (this.position < this.input.length) {
      const char = this.peek();
      if (char === '/') {
        this.advance(); // consume closing /
        break;
      }
      if (char === '\\') {
        value += this.advance();
        value += this.advance();
      } else {
        value += this.advance();
      }
    }
    
    return value;
  }

  private readIdentifier(): string {
    let value = '';
    while (this.position < this.input.length && /[a-zA-Z_][a-zA-Z0-9_]*/.test(this.peek())) {
      value += this.advance();
    }
    return value;
  }

  private readComment(): string {
    let value = '';
    while (this.position < this.input.length && this.peek() !== '\n') {
      value += this.advance();
    }
    return value;
  }

  nextToken(): Token {
    this.skipWhitespace();
    
    const startLine = this.line;
    const startColumn = this.column;
    
    if (this.position >= this.input.length) {
      return { type: TokenType.EOF, value: '', line: startLine, column: startColumn };
    }
    
    const char = this.peek();
    
    // Comments
    if (char === '/' && this.peek(1) === '/') {
      this.advance(); // consume first /
      this.advance(); // consume second /
      const value = this.readComment();
      return { type: TokenType.COMMENT, value, line: startLine, column: startColumn };
    }
    
    // Newlines
    if (char === '\n') {
      this.advance();
      return { type: TokenType.NEWLINE, value: '\n', line: startLine, column: startColumn };
    }
    
    // Directives
    if (char === '%') {
      this.advance();
      const value = this.readIdentifier();
      return { type: TokenType.DIRECTIVE, value, line: startLine, column: startColumn };
    }
    
    // String literals
    if (char === '"' || char === "'") {
      const value = this.readString();
      return { type: TokenType.STRING_LITERAL, value, line: startLine, column: startColumn };
    }
    
    // Regex literals
    if (char === '/') {
      const value = this.readRegex();
      return { type: TokenType.REGEX_LITERAL, value, line: startLine, column: startColumn };
    }
    
    // Single character tokens
    switch (char) {
      case ':':
        this.advance();
        return { type: TokenType.COLON, value: ':', line: startLine, column: startColumn };
      case '|':
        this.advance();
        return { type: TokenType.PIPE, value: '|', line: startLine, column: startColumn };
      case '(':
        this.advance();
        return { type: TokenType.LPAREN, value: '(', line: startLine, column: startColumn };
      case ')':
        this.advance();
        return { type: TokenType.RPAREN, value: ')', line: startLine, column: startColumn };
      case '[':
        this.advance();
        return { type: TokenType.LBRACKET, value: '[', line: startLine, column: startColumn };
      case ']':
        this.advance();
        return { type: TokenType.RBRACKET, value: ']', line: startLine, column: startColumn };
      case '?':
        this.advance();
        return { type: TokenType.QUESTION, value: '?', line: startLine, column: startColumn };
      case '*':
        this.advance();
        return { type: TokenType.STAR, value: '*', line: startLine, column: startColumn };
      case '+':
        this.advance();
        return { type: TokenType.PLUS, value: '+', line: startLine, column: startColumn };
      case '.':
        this.advance();
        return { type: TokenType.DOT, value: '.', line: startLine, column: startColumn };
    }
    
    // Identifiers (rule names and terminal names)
    if (/[a-zA-Z_]/.test(char)) {
      const value = this.readIdentifier();
      
      // Terminal names are uppercase
      const isTerminal = value === value.toUpperCase();
      const type = isTerminal ? TokenType.TERMINAL_NAME : TokenType.RULE_NAME;
      
      return { type, value, line: startLine, column: startColumn };
    }
    
    // Unknown character
    throw new Error(`Unexpected character '${char}' at line ${startLine}, column ${startColumn}`);
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    let token: Token;
    
    do {
      token = this.nextToken();
      if (token.type !== TokenType.WHITESPACE && token.type !== TokenType.COMMENT) {
        tokens.push(token);
      }
    } while (token.type !== TokenType.EOF);
    
    return tokens;
  }
}

export class LarkParser {
  private tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(offset: number = 0): Token {
    const pos = this.position + offset;
    return pos < this.tokens.length ? this.tokens[pos] : this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    const token = this.tokens[this.position];
    if (this.position < this.tokens.length - 1) {
      this.position++;
    }
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type} at line ${token.line}`);
    }
    this.advance();
    return token;
  }

  private consumeNewlines(): void {
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
  }

  parse(): LarkGrammar {
    const rules: LarkRule[] = [];
    const terminals: LarkTerminal[] = [];
    const directives: LarkDirective[] = [];

    this.consumeNewlines();

    while (this.peek().type !== TokenType.EOF) {
      const token = this.peek();

      if (token.type === TokenType.DIRECTIVE) {
        directives.push(this.parseDirective());
      } else if (token.type === TokenType.TERMINAL_NAME) {
        terminals.push(this.parseTerminal());
      } else if (token.type === TokenType.RULE_NAME) {
        rules.push(this.parseRule());
      } else {
        throw new Error(`Unexpected token ${token.type} at line ${token.line}`);
      }

      this.consumeNewlines();
    }

    return { rules, terminals, directives };
  }

  private parseDirective(): LarkDirective {
    const directiveToken = this.expect(TokenType.DIRECTIVE);
    
    switch (directiveToken.value) {
      case 'import': {
        let target = '';
        const firstToken = this.peek();
        
        if (firstToken.type === TokenType.RULE_NAME || firstToken.type === TokenType.TERMINAL_NAME) {
          target = this.advance().value;
          
          // Handle dotted imports like "common.WS"
          while (this.peek().type === TokenType.DOT) {
            this.advance(); // consume dot
            const nextToken = this.peek();
            if (nextToken.type === TokenType.RULE_NAME || nextToken.type === TokenType.TERMINAL_NAME) {
              target += '.' + this.advance().value;
            } else {
              throw new Error(`Expected identifier after '.' in import at line ${nextToken.line}`);
            }
          }
        } else {
          throw new Error(`Expected identifier after import directive at line ${firstToken.line}`);
        }
        
        return { type: 'import', target };
      }
      case 'ignore': {
        const token = this.peek();
        if (token.type === TokenType.TERMINAL_NAME || token.type === TokenType.RULE_NAME) {
          const target = this.advance().value;
          return { type: 'ignore', target };
        } else {
          throw new Error(`Expected identifier after ignore directive at line ${token.line}`);
        }
      }
      default:
        throw new Error(`Unknown directive: ${directiveToken.value}`);
    }
  }

  private parseTerminal(): LarkTerminal {
    const name = this.expect(TokenType.TERMINAL_NAME).value;
    this.expect(TokenType.COLON);
    
    const pattern = this.peek();
    if (pattern.type === TokenType.STRING_LITERAL) {
      this.advance();
      return { name, pattern: pattern.value };
    } else if (pattern.type === TokenType.REGEX_LITERAL) {
      this.advance();
      return { name, pattern: new RegExp(pattern.value) };
    } else {
      throw new Error(`Expected string or regex literal for terminal ${name}`);
    }
  }

  private parseRule(): LarkRule {
    const name = this.expect(TokenType.RULE_NAME).value;
    this.expect(TokenType.COLON);
    
    const definition = this.parseExpression();
    
    return { name, definition };
  }

  private parseExpression(): LarkExpression {
    const alternatives: LarkExpression[] = [];
    alternatives.push(this.parseSequence());
    
    while (this.peek().type === TokenType.PIPE) {
      this.advance(); // consume |
      alternatives.push(this.parseSequence());
    }
    
    if (alternatives.length === 1) {
      return alternatives[0];
    }
    
    return { type: 'choice', alternatives };
  }

  private parseSequence(): LarkExpression {
    const elements: LarkExpression[] = [];
    
    while (this.peek().type !== TokenType.PIPE && 
           this.peek().type !== TokenType.NEWLINE && 
           this.peek().type !== TokenType.EOF &&
           this.peek().type !== TokenType.RPAREN &&
           this.peek().type !== TokenType.RBRACKET) {
      elements.push(this.parseTerm());
    }
    
    if (elements.length === 1) {
      return elements[0];
    }
    
    return { type: 'sequence', elements };
  }

  private parseTerm(): LarkExpression {
    const expr = this.parseAtom();
    
    const token = this.peek();
    if (token.type === TokenType.QUESTION) {
      this.advance();
      return { type: 'optional', element: expr };
    } else if (token.type === TokenType.STAR) {
      this.advance();
      return { type: 'repeat', element: expr, min: 0 };
    } else if (token.type === TokenType.PLUS) {
      this.advance();
      return { type: 'repeat', element: expr, min: 1 };
    }
    
    return expr;
  }

  private parseAtom(): LarkExpression {
    const token = this.peek();
    
    if (token.type === TokenType.STRING_LITERAL) {
      this.advance();
      return { type: 'literal', value: token.value };
    } else if (token.type === TokenType.RULE_NAME) {
      this.advance();
      return { type: 'rule_ref', name: token.value };
    } else if (token.type === TokenType.TERMINAL_NAME) {
      this.advance();
      return { type: 'terminal_ref', name: token.value };
    } else if (token.type === TokenType.LPAREN) {
      this.advance(); // consume (
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN);
      return expr;
    } else if (token.type === TokenType.LBRACKET) {
      this.advance(); // consume [
      const expr = this.parseExpression();
      this.expect(TokenType.RBRACKET);
      return { type: 'optional', element: expr };
    } else {
      throw new Error(`Unexpected token ${token.type} at line ${token.line}`);
    }
  }
}

/**
 * Parse a Lark grammar from a string
 */
export function parseLarkGrammar(input: string): LarkGrammar {
  const lexer = new LarkLexer(input);
  const tokens = lexer.tokenize();
  const parser = new LarkParser(tokens);
  return parser.parse();
}
# Lark Grammar Parser

A TypeScript implementation of a parser for Lark grammar files. Lark is a parsing toolkit that uses EBNF-like syntax for grammar definitions.

## Features

- **Complete Lexer**: Tokenizes Lark grammar files with support for:
  - Rule definitions (lowercase names)
  - Terminal definitions (uppercase names)
  - String literals and regex patterns
  - Operators (`?`, `*`, `+`, `|`, `()`, `[]`)
  - Directives (`%import`, `%ignore`)
  - Comments and whitespace handling

- **Robust Parser**: Builds Abstract Syntax Trees (AST) for:
  - Rules with choice, sequence, optional, and repetition expressions
  - Terminal definitions with string or regex patterns
  - Import and ignore directives
  - Nested expressions with parentheses

- **TypeScript Support**: Fully typed with comprehensive interfaces for all AST nodes

## Installation

```bash
yarn install
```

## Usage

### Basic Example

```typescript
import { parseLarkGrammar } from './lark-parser.js';

const grammar = `
start: expr

expr: term (("+" | "-") term)*
term: factor (("*" | "/") factor)*
factor: NUMBER | "(" expr ")"

NUMBER: /[0-9]+/

%import common.WS
%ignore WS
`;

try {
  const ast = parseLarkGrammar(grammar);
  console.log(`Parsed ${ast.rules.length} rules, ${ast.terminals.length} terminals`);
} catch (error) {
  console.error("Parse error:", error.message);
}
```

### API Reference

#### `parseLarkGrammar(input: string): LarkGrammar`

Parses a Lark grammar string and returns an AST.

**Parameters:**
- `input`: The Lark grammar as a string

**Returns:** `LarkGrammar` object containing:
- `rules`: Array of rule definitions
- `terminals`: Array of terminal definitions  
- `directives`: Array of import/ignore directives

#### Types

```typescript
interface LarkGrammar {
  rules: LarkRule[];
  terminals: LarkTerminal[];
  directives: LarkDirective[];
  start?: string;
}

interface LarkRule {
  name: string;
  definition: LarkExpression;
  priority?: number;
}

interface LarkTerminal {
  name: string;
  pattern: string | RegExp;
  flags?: string[];
}

interface LarkDirective {
  type: 'import' | 'ignore' | 'declare';
  target: string;
  source?: string;
}
```

Expression types include:
- `LarkSequence`: Sequential elements
- `LarkChoice`: Alternative expressions (`|`)
- `LarkOptional`: Optional expressions (`?`)
- `LarkRepeat`: Repetition expressions (`*`, `+`)
- `LarkTerminalRef`: Reference to a terminal
- `LarkRuleRef`: Reference to a rule
- `LarkLiteral`: String literal

## Lark Grammar Syntax

### Rules
Rules are defined with lowercase names:
```
rule_name: expression
```

### Terminals
Terminals are defined with uppercase names:
```
TERMINAL_NAME: "string literal"
TERMINAL_REGEX: /regex pattern/
```

### Expressions

#### Choice (alternatives)
```
expr: term | factor
```

#### Sequence
```
expr: term factor
```

#### Optional
```
expr: term?
```

#### Repetition
```
expr: term*    // zero or more
expr: term+    // one or more
```

#### Grouping
```
expr: (term | factor)*
```

### Directives

#### Import
```
%import common.WS
%import module.RULE
```

#### Ignore
```
%ignore WS
%ignore COMMENT
```

## Example Grammars

See the `examples/` directory for complete Lark grammar examples including:
- Arithmetic expressions
- JSON parser
- Simple programming language
- Configuration file format

## Development

```bash
# Run tests
yarn test

# Build
yarn build

# Lint
yarn lint

# Format
yarn format
```

## Error Handling

The parser provides detailed error messages with line and column information:

```
Expected COLON but got PIPE at line 5
Unexpected character '@' at line 3, column 15
```

## Compatibility

This parser aims to be compatible with the Lark parsing toolkit grammar format. It supports most common Lark features but may not include every advanced feature.

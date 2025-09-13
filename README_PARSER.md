# JavaScript/TypeScript Lark Grammar Parser

This repository provides a comprehensive Lark grammar for parsing JavaScript and TypeScript code, along with a Python parser implementation that generates ESTree-compatible AST structures.

## Features

- **Comprehensive Grammar**: Supports core JavaScript ES6+ syntax including:
  - Variable declarations (`const`, `let`, `var`)
  - Function declarations and expressions
  - Binary and assignment expressions with proper precedence
  - Array and object literals
  - Block statements and control structures
  - Identifier and literal handling with reserved keyword protection

- **ESTree-Compatible AST**: Generates Abstract Syntax Trees compatible with the ESTree specification used by tools like ESLint, Babel, and other JavaScript analysis tools.

- **Python Integration**: Built using the Lark parsing library for Python, providing fast and reliable parsing.

- **Extensible Design**: Grammar is designed to be easily extended for additional JavaScript/TypeScript features.

## Installation

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **The parser requires Python 3.7+ and the Lark library**.

## Usage

### Command Line Interface

The parser provides a flexible command-line interface:

```bash
# Parse a JavaScript file
python js_ts_parser.py path/to/file.js

# Parse from stdin
echo "const x = 42;" | python js_ts_parser.py -

# Validate syntax only
python js_ts_parser.py --validate path/to/file.js

# Pretty print the output
python js_ts_parser.py --pretty path/to/file.js

# Output raw parse tree instead of AST
python js_ts_parser.py --raw path/to/file.js

# Save output to file
python js_ts_parser.py -o output.json path/to/file.js
```

### Python API

```python
from js_ts_parser import JSTypeScriptParser

# Initialize the parser
parser = JSTypeScriptParser()

# Parse JavaScript code
code = """
const message = "Hello, World!";
function greet(name) {
    return message + " " + name;
}
"""

# Get AST
ast = parser.parse(code)
print(ast)

# Validate syntax
is_valid, error = parser.validate_syntax(code)
if is_valid:
    print("✓ Syntax is valid")
else:
    print(f"✗ Error: {error}")

# Parse from file
ast = parser.parse_file("example.js")
```

## Grammar Features

### Variable Declarations
```javascript
const message = "Hello";
let count = 0;
var isActive = true;
```

### Functions
```javascript
function greet(name) {
    return "Hello, " + name;
}

// With parameters and complex expressions
function calculate(a, b) {
    return (a + b) * 2;
}
```

### Binary and Assignment Expressions
```javascript
// Arithmetic operations
const result = (a + b) * c / d;

// Assignment operations
count += 1;
value *= factor;

// Comparison and logical operations
const isValid = (age >= 18) && (status === "active");
```

### Arrays and Objects
```javascript
// Array literals
const numbers = [1, 2, 3, 4, 5];
const mixed = ["hello", 42, true, null];

// Object literals
const user = {
    name: "John Doe",
    age: 30,
    email: "john@example.com"
};

// Nested structures
const config = {
    database: {
        host: "localhost",
        port: 5432
    },
    features: ["auth", "logging", "cache"]
};
```

## AST Structure

The parser generates AST nodes following the ESTree specification. For example:

```javascript
const x = 42;
```

Produces:
```json
{
  "type": "Program",
  "body": [
    {
      "type": "VariableDeclaration",
      "kind": "const",
      "declarations": [
        {
          "type": "VariableDeclarator",
          "id": {
            "type": "Identifier",
            "name": "x"
          },
          "init": {
            "type": "Literal",
            "value": 42,
            "raw": "42"
          }
        }
      ]
    }
  ]
}
```

## Supported Node Types

- **Program**: Root node containing all statements
- **VariableDeclaration**: `const`, `let`, `var` declarations
- **FunctionDeclaration**: Function definitions
- **BinaryExpression**: Binary operations (+, -, *, /, etc.)
- **AssignmentExpression**: Assignment operations (=, +=, -=, etc.)
- **ArrayExpression**: Array literals
- **ObjectExpression**: Object literals with properties
- **BlockStatement**: Code blocks with curly braces
- **ReturnStatement**: Return statements
- **ExpressionStatement**: Standalone expressions
- **Identifier**: Variable and function names
- **Literal**: String, number, boolean, and null literals

## Grammar File

The grammar is defined in `javascript_typescript.lark` using Lark's EBNF-like syntax. Key sections include:

- **Statements**: All top-level and block-level constructs
- **Expressions**: Complete expression hierarchy with proper precedence
- **Literals**: All JavaScript literal types
- **Tokens**: Identifiers, operators, keywords, and comments

## Extending the Grammar

To add new features:

1. **Add new rules** to `javascript_typescript.lark`
2. **Implement transformer methods** in `js_ts_parser.py`
3. **Add test cases** in the `test_samples/` directory
4. **Test thoroughly** with various code examples

Example of adding a new statement type:
```lark
// In grammar file
if_statement: "if" "(" expression ")" statement ("else" statement)?

// In transformer
def if_statement(self, items):
    result = {"type": "IfStatement", "test": items[0], "consequent": items[1]}
    if len(items) > 2:
        result["alternate"] = items[2]
    return result
```

## Testing

The repository includes various test samples:

```bash
# Test basic functionality
python js_ts_parser.py test_samples/simple.js
python js_ts_parser.py test_samples/variables.js
python js_ts_parser.py test_samples/function.js

# Test complex examples
python js_ts_parser.py test_samples/complex.js
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your changes with appropriate tests
4. Ensure all existing tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Future Enhancements

- **TypeScript Support**: Full TypeScript type annotations and syntax
- **ES6+ Features**: Arrow functions, destructuring, async/await
- **Control Flow**: if/else, loops, try/catch statements
- **Classes**: Class declarations and expressions
- **Modules**: Import/export statements
- **JSX Support**: React JSX syntax parsing
- **Performance Optimization**: Faster parsing for large files
- **Error Recovery**: Better error messages and recovery strategies

## Technical Notes

- Built with [Lark](https://github.com/lark-parser/lark) parsing library
- Uses Earley parser for robust handling of complex grammars
- Implements ESTree AST specification for compatibility
- Supports both JavaScript and TypeScript syntax patterns
- Designed for extensibility and maintainability
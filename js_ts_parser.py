#!/usr/bin/env python3
"""
JavaScript/TypeScript Parser using Lark Grammar

This module provides functionality to parse JavaScript and TypeScript code
using the Lark parsing library with a comprehensive grammar definition.
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Optional, Union, Any, Dict, List

try:
    from lark import Lark, Tree, Token
    from lark.exceptions import LarkError, ParseError
    from lark.visitors import Transformer
except ImportError:
    print("Lark library not found. Please install it with: pip install lark")
    sys.exit(1)


class JavaScriptTypeScriptTransformer(Transformer):
    """
    Transform the parse tree into a more readable AST structure.
    """
    
    def start(self, items):
        return items[0]  # Return the program
    
    def statement(self, items):
        return items[0]  # Return the actual statement
    
    def program(self, items):
        return {"type": "Program", "body": list(items)}
    
    def identifier(self, items):
        return {"type": "Identifier", "name": str(items[0])}
    
    def variable_kind(self, items):
        return str(items[0])
    
    def variable_declaration(self, items):
        kind = items[0]  # This should be a string now
        declarations = [item for item in items[1:]]
        return {
            "type": "VariableDeclaration", 
            "kind": kind,
            "declarations": declarations
        }
    
    def variable_declarator(self, items):
        result = {"type": "VariableDeclarator", "id": items[0]}
        if len(items) > 1:
            # Check if we have a type annotation or initializer
            for item in items[1:]:
                if isinstance(item, dict) and item.get("type") != "TypeAnnotation":
                    result["init"] = item
                elif isinstance(item, dict) and item.get("type") == "TypeAnnotation":
                    result["id"]["typeAnnotation"] = item
        return result
    
    def expression(self, items):
        return items[0]  # Flatten expression hierarchy
    
    # Flatten all expression hierarchy - they all just return their first child
    def bitwise_or_expression(self, items):
        return self._create_binary_expression(items)
    
    def bitwise_xor_expression(self, items):
        return self._create_binary_expression(items)
        
    def bitwise_and_expression(self, items):
        return self._create_binary_expression(items)
        
    def shift_expression(self, items):
        return self._create_binary_expression(items)
        
    def exponentiation_expression(self, items):
        return self._create_binary_expression(items)
    
    def function_declaration(self, items):
        result = {"type": "FunctionDeclaration", "async": False, "generator": False}
        
        # Parse function components
        for item in items:
            if isinstance(item, dict):
                if item.get("type") == "Identifier":
                    result["id"] = item
                elif item.get("type") == "BlockStatement":
                    result["body"] = item
            elif isinstance(item, str):
                if item == "async":
                    result["async"] = True
                elif item == "*":
                    result["generator"] = True
        
        return result
    
    def block_statement(self, items):
        return {"type": "BlockStatement", "body": list(items)}
    
    def expression_statement(self, items):
        return {"type": "ExpressionStatement", "expression": items[0]}
    
    def assignment_expression(self, items):
        if len(items) == 1:
            return items[0]
        
        # Handle assignment operations
        left = items[0]
        for i in range(1, len(items), 2):
            operator = items[i]
            right = items[i + 1] if i + 1 < len(items) else None
            if right:
                left = {
                    "type": "AssignmentExpression",
                    "operator": operator,
                    "left": left,
                    "right": right
                }
        return left
    
    def conditional_expression(self, items):
        if len(items) == 1:
            return items[0]
        elif len(items) == 4:  # test ? consequent : alternate
            return {
                "type": "ConditionalExpression",
                "test": items[0],
                "consequent": items[2],
                "alternate": items[3]
            }
        return items[0]
    
    def logical_or_expression(self, items):
        return self._create_binary_expression(items, "||")
    
    def logical_and_expression(self, items):
        return self._create_binary_expression(items, "&&")
    
    def equality_expression(self, items):
        return self._create_binary_expression(items)
    
    def relational_expression(self, items):
        return self._create_binary_expression(items)
    
    def additive_expression(self, items):
        return self._create_binary_expression(items)
    
    def multiplicative_expression(self, items):
        return self._create_binary_expression(items)
    
    def unary_expression(self, items):
        if len(items) == 1:
            return items[0]
        elif len(items) == 2:
            return {
                "type": "UnaryExpression",
                "operator": str(items[0]),
                "argument": items[1],
                "prefix": True
            }
        return items[0]
    
    def postfix_expression(self, items):
        if len(items) == 1:
            return items[0]
        
        result = items[0]
        for item in items[1:]:
            if isinstance(item, str) and item in ["++", "--"]:
                result = {
                    "type": "UpdateExpression",
                    "operator": item,
                    "argument": result,
                    "prefix": False
                }
        return result
    
    def primary_expression(self, items):
        return items[0]
    
    def _create_binary_expression(self, items, default_operator=None):
        if len(items) == 1:
            return items[0]
        
        result = items[0]
        i = 1
        while i < len(items):
            operator = items[i] if isinstance(items[i], str) else default_operator
            right = items[i + 1] if i + 1 < len(items) else None
            if operator and right:
                result = {
                    "type": "BinaryExpression",
                    "operator": operator,
                    "left": result,
                    "right": right
                }
            i += 2
        return result
    
    def string_literal(self, items):
        return {"type": "Literal", "value": str(items[0])[1:-1], "raw": str(items[0])}  # Remove quotes
    
    def numeric_literal(self, items):
        value = str(items[0])
        try:
            parsed_value = int(value) if '.' not in value else float(value)
        except ValueError:
            parsed_value = value
        return {"type": "Literal", "value": parsed_value, "raw": value}
    
    def boolean_literal(self, items):
        return {"type": "Literal", "value": str(items[0]) == "true", "raw": str(items[0])}
    
    def assignment_operator(self, items):
        return str(items[0]) if items else "="
    
    def null_literal(self, items):
        return {"type": "Literal", "value": None, "raw": "null"}
    
    def literal(self, items):
        return items[0]
    
    def __default__(self, data, children, meta):
        """Handle any unmatched rules by returning the first child or the children list."""
        if len(children) == 1:
            return children[0]
        return children


class JSTypeScriptParser:
    """
    Main parser class for JavaScript/TypeScript code.
    """
    
    def __init__(self, grammar_file: Optional[str] = None):
        """
        Initialize the parser with the grammar file.
        
        Args:
            grammar_file: Path to the Lark grammar file. If None, uses default.
        """
        if grammar_file is None:
            grammar_file = Path(__file__).parent / "javascript_typescript.lark"
        
        self.grammar_file = Path(grammar_file)
        self.parser = self._load_parser()
        self.transformer = JavaScriptTypeScriptTransformer()
    
    def _load_parser(self) -> Lark:
        """Load the Lark parser with the grammar."""
        try:
            with open(self.grammar_file, 'r', encoding='utf-8') as f:
                grammar_content = f.read()
            
            return Lark(
                grammar_content,
                parser='earley',  # More robust for complex grammars
                start='start',
                debug=False
            )
        except FileNotFoundError:
            raise FileNotFoundError(f"Grammar file not found: {self.grammar_file}")
        except Exception as e:
            raise Exception(f"Failed to load grammar: {e}")
    
    def parse(self, code: str, transform: bool = True) -> Union[Tree, Dict[str, Any]]:
        """
        Parse JavaScript/TypeScript code.
        
        Args:
            code: The source code to parse
            transform: Whether to transform the parse tree to AST
            
        Returns:
            Parse tree or transformed AST
            
        Raises:
            ParseError: If the code cannot be parsed
        """
        try:
            tree = self.parser.parse(code)
            
            if transform:
                return self.transformer.transform(tree)
            else:
                return tree
                
        except ParseError as e:
            raise ParseError(f"Parse error: {e}")
        except LarkError as e:
            raise LarkError(f"Lark error: {e}")
    
    def parse_file(self, file_path: str, transform: bool = True) -> Union[Tree, Dict[str, Any]]:
        """
        Parse a JavaScript/TypeScript file.
        
        Args:
            file_path: Path to the source file
            transform: Whether to transform the parse tree to AST
            
        Returns:
            Parse tree or transformed AST
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()
            return self.parse(code, transform)
        except FileNotFoundError:
            raise FileNotFoundError(f"File not found: {file_path}")
        except Exception as e:
            raise Exception(f"Failed to parse file {file_path}: {e}")
    
    def validate_syntax(self, code: str) -> tuple[bool, Optional[str]]:
        """
        Validate the syntax of JavaScript/TypeScript code.
        
        Args:
            code: The source code to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            self.parse(code, transform=False)
            return True, None
        except Exception as e:
            return False, str(e)


def pretty_print_ast(ast: Union[Dict, List, Any], indent: int = 0) -> str:
    """
    Pretty print an AST structure.
    
    Args:
        ast: The AST to print
        indent: Current indentation level
        
    Returns:
        Formatted string representation of the AST
    """
    if isinstance(ast, dict):
        result = "{\n"
        for key, value in ast.items():
            result += "  " * (indent + 1) + f'"{key}": '
            if isinstance(value, (dict, list)):
                result += pretty_print_ast(value, indent + 1)
            else:
                result += json.dumps(value)
            result += ",\n"
        result += "  " * indent + "}"
        return result
    elif isinstance(ast, list):
        result = "[\n"
        for item in ast:
            result += "  " * (indent + 1)
            result += pretty_print_ast(item, indent + 1)
            result += ",\n"
        result += "  " * indent + "]"
        return result
    else:
        return json.dumps(ast)


def main():
    """Command-line interface for the parser."""
    parser = argparse.ArgumentParser(
        description="Parse JavaScript/TypeScript code using Lark grammar"
    )
    parser.add_argument(
        "input",
        nargs="?",
        help="Input file path or '-' for stdin. If not provided, enter interactive mode."
    )
    parser.add_argument(
        "-g", "--grammar",
        help="Path to custom grammar file"
    )
    parser.add_argument(
        "-o", "--output",
        help="Output file path (default: stdout)"
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        help="Output raw parse tree instead of transformed AST"
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Only validate syntax, don't output AST"
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty print the output"
    )
    
    args = parser.parse_args()
    
    try:
        # Initialize parser
        js_parser = JSTypeScriptParser(args.grammar)
        
        # Get input
        if args.input == "-":
            code = sys.stdin.read()
        elif args.input:
            with open(args.input, 'r', encoding='utf-8') as f:
                code = f.read()
        else:
            # Interactive mode
            print("Enter JavaScript/TypeScript code (Ctrl+D to finish):")
            code = sys.stdin.read()
        
        if args.validate:
            # Validation mode
            is_valid, error = js_parser.validate_syntax(code)
            if is_valid:
                print("✓ Syntax is valid")
                sys.exit(0)
            else:
                print(f"✗ Syntax error: {error}")
                sys.exit(1)
        else:
            # Parse mode
            result = js_parser.parse(code, transform=not args.raw)
            
            # Format output
            if args.pretty:
                if isinstance(result, Tree):
                    output = result.pretty()
                else:
                    output = pretty_print_ast(result)
            else:
                if isinstance(result, Tree):
                    output = str(result)
                else:
                    output = json.dumps(result, indent=2)
            
            # Write output
            if args.output:
                with open(args.output, 'w', encoding='utf-8') as f:
                    f.write(output)
                print(f"Output written to {args.output}")
            else:
                print(output)
                
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
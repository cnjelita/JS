#!/usr/bin/env python3
"""
Demo script showcasing the JavaScript/TypeScript Lark Grammar Parser.

This script demonstrates various parsing capabilities and provides
examples of how to use the parser in different scenarios.
"""

import json
import sys
import os
from pathlib import Path

# Add the current directory to the path so we can import our parser
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from js_ts_parser import JSTypeScriptParser, pretty_print_ast


def demo_basic_parsing():
    """Demonstrate basic parsing functionality."""
    print("=" * 60)
    print("DEMO: Basic JavaScript Parsing")
    print("=" * 60)
    
    parser = JSTypeScriptParser()
    
    examples = [
        # Variable declarations
        'const message = "Hello, World!";',
        'let count = 42;',
        'var isActive = true;',
        
        # Basic function
        '''function greet(name) {
    return "Hello, " + name + "!";
}''',
        
        # Binary expressions
        'const result = (a + b) * c - d / e;',
        
        # Array literal
        'const numbers = [1, 2, 3, 4, 5];',
        
        # Object literal
        '''const user = {
    name: "John",
    age: 30,
    active: true
};''',
    ]
    
    for i, code in enumerate(examples, 1):
        print(f"\n--- Example {i} ---")
        print("JavaScript Code:")
        print(code)
        print("\nGenerated AST:")
        
        try:
            ast = parser.parse(code)
            print(json.dumps(ast, indent=2))
        except Exception as e:
            print(f"Error: {e}")
        
        print("-" * 40)


def demo_syntax_validation():
    """Demonstrate syntax validation."""
    print("\n" + "=" * 60)
    print("DEMO: Syntax Validation")
    print("=" * 60)
    
    parser = JSTypeScriptParser()
    
    test_cases = [
        ("const x = 42;", True),
        ("let y = 'hello';", True),
        ("function test() { return 1; }", True),
        ("const arr = [1, 2, 3];", True),
        ("const obj = {a: 1, b: 2};", True),
        ("const x =;", False),  # Invalid syntax
        ("function test( { return 1; }", False),  # Invalid syntax
        ("const arr = [1, 2, 3", False),  # Missing closing bracket
    ]
    
    print("Testing syntax validation:")
    for code, expected_valid in test_cases:
        is_valid, error = parser.validate_syntax(code)
        status = "✓ Valid" if is_valid else f"✗ Invalid: {error}"
        expected = "✓" if expected_valid else "✗"
        result = "PASS" if is_valid == expected_valid else "FAIL"
        
        print(f"[{result}] {expected} Code: {code[:30]}...")
        print(f"       Result: {status}")
        print()


def demo_complex_example():
    """Demonstrate parsing of a complex JavaScript example."""
    print("\n" + "=" * 60)
    print("DEMO: Complex JavaScript Example")
    print("=" * 60)
    
    complex_code = '''
// Complex JavaScript example
const config = {
    database: {
        host: "localhost",
        port: 5432,
        name: "myapp"
    },
    features: ["auth", "logging", "cache"],
    debug: true
};

function calculateTotal(items, taxRate) {
    let subtotal = 0;
    const taxMultiplier = 1 + taxRate;
    
    return subtotal * taxMultiplier;
}

function processUser(userData) {
    const defaultSettings = {
        theme: "light",
        notifications: true
    };
    
    return userData;
}

const results = [1, 2, 3, 4, 5];
const summary = {
    total: results.length,
    processed: true
};
'''
    
    print("Complex JavaScript Code:")
    print(complex_code)
    print("\nGenerated AST (truncated for readability):")
    
    parser = JSTypeScriptParser()
    try:
        ast = parser.parse(complex_code)
        
        # Print a summary of the parsed structure
        print(f"Program with {len(ast['body'])} top-level statements:")
        for i, stmt in enumerate(ast['body']):
            stmt_type = stmt.get('type', 'Unknown')
            if stmt_type == 'VariableDeclaration':
                var_names = [decl['id']['name'] for decl in stmt['declarations']]
                print(f"  {i+1}. {stmt_type}: {stmt['kind']} {', '.join(var_names)}")
            elif stmt_type == 'FunctionDeclaration':
                func_name = stmt['id']['name']
                param_count = len(stmt['params'])
                print(f"  {i+1}. {stmt_type}: {func_name}({param_count} params)")
            else:
                print(f"  {i+1}. {stmt_type}")
        
        # Show full AST for first few statements
        print(f"\nFull AST for first statement:")
        print(json.dumps(ast['body'][0], indent=2))
        
    except Exception as e:
        print(f"Error: {e}")


def demo_file_parsing():
    """Demonstrate parsing files from the test_samples directory."""
    print("\n" + "=" * 60)
    print("DEMO: File Parsing")
    print("=" * 60)
    
    parser = JSTypeScriptParser()
    test_dir = Path("test_samples")
    
    if not test_dir.exists():
        print("test_samples directory not found!")
        return
    
    js_files = list(test_dir.glob("*.js"))
    
    if not js_files:
        print("No .js files found in test_samples directory!")
        return
    
    print(f"Found {len(js_files)} test files:")
    
    for js_file in js_files[:3]:  # Limit to first 3 files for demo
        print(f"\n--- Parsing {js_file.name} ---")
        
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            print(f"File content:")
            print(content)
            print(f"\nParsing result:")
            
            ast = parser.parse_file(str(js_file))
            print(f"✓ Successfully parsed {len(ast['body'])} statements")
            
            # Show statement types
            for i, stmt in enumerate(ast['body']):
                stmt_type = stmt.get('type', 'Unknown')
                print(f"  Statement {i+1}: {stmt_type}")
                
        except Exception as e:
            print(f"✗ Error parsing {js_file.name}: {e}")


def demo_ast_manipulation():
    """Demonstrate working with the generated AST."""
    print("\n" + "=" * 60)
    print("DEMO: AST Manipulation and Analysis")
    print("=" * 60)
    
    code = '''
const users = ["Alice", "Bob", "Charlie"];
function getUserCount() {
    return users.length;
}
const totalUsers = getUserCount();
'''
    
    parser = JSTypeScriptParser()
    ast = parser.parse(code)
    
    print("Original code:")
    print(code)
    
    print("\nAST Analysis:")
    
    # Count different node types
    def count_nodes(node, counts=None):
        if counts is None:
            counts = {}
        
        if isinstance(node, dict) and 'type' in node:
            node_type = node['type']
            counts[node_type] = counts.get(node_type, 0) + 1
            
            # Recursively process child nodes
            for key, value in node.items():
                if key != 'type':
                    if isinstance(value, list):
                        for item in value:
                            count_nodes(item, counts)
                    elif isinstance(value, dict):
                        count_nodes(value, counts)
        
        return counts
    
    node_counts = count_nodes(ast)
    print("Node type counts:")
    for node_type, count in sorted(node_counts.items()):
        print(f"  {node_type}: {count}")
    
    # Extract identifiers
    def extract_identifiers(node, identifiers=None):
        if identifiers is None:
            identifiers = set()
        
        if isinstance(node, dict):
            if node.get('type') == 'Identifier':
                identifiers.add(node['name'])
            
            for key, value in node.items():
                if isinstance(value, list):
                    for item in value:
                        extract_identifiers(item, identifiers)
                elif isinstance(value, dict):
                    extract_identifiers(value, identifiers)
        
        return identifiers
    
    identifiers = extract_identifiers(ast)
    print(f"\nIdentifiers found: {sorted(identifiers)}")
    
    # Extract function names
    functions = []
    for stmt in ast['body']:
        if stmt.get('type') == 'FunctionDeclaration':
            functions.append(stmt['id']['name'])
    
    print(f"Function declarations: {functions}")


def main():
    """Run all demos."""
    print("JavaScript/TypeScript Lark Grammar Parser Demo")
    print("This demo showcases various parsing capabilities.\n")
    
    try:
        demo_basic_parsing()
        demo_syntax_validation()
        demo_complex_example()
        demo_file_parsing()
        demo_ast_manipulation()
        
        print("\n" + "=" * 60)
        print("Demo completed successfully!")
        print("=" * 60)
        print("\nFor more information:")
        print("- Run: python js_ts_parser.py --help")
        print("- Read: README_PARSER.md")
        print("- Explore: test_samples/ directory")
        
    except Exception as e:
        print(f"\nDemo failed with error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
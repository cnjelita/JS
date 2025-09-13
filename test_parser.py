#!/usr/bin/env python3
"""
Test suite for the JavaScript/TypeScript parser.

This module provides basic tests to validate parser functionality.
"""

import unittest
import json
from js_ts_parser import JSTypeScriptParser


class TestJSTypeScriptParser(unittest.TestCase):
    """Test cases for the JavaScript/TypeScript parser."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.parser = JSTypeScriptParser()
    
    def test_variable_declarations(self):
        """Test variable declaration parsing."""
        test_cases = [
            ('const x = 42;', 'const', 'x', 42),
            ('let y = "hello";', 'let', 'y', "hello"),
            ('var z = true;', 'var', 'z', True),
        ]
        
        for code, expected_kind, expected_name, expected_value in test_cases:
            with self.subTest(code=code):
                ast = self.parser.parse(code)
                
                self.assertEqual(ast['type'], 'Program')
                self.assertEqual(len(ast['body']), 1)
                
                stmt = ast['body'][0]
                self.assertEqual(stmt['type'], 'VariableDeclaration')
                self.assertEqual(stmt['kind'], expected_kind)
                self.assertEqual(len(stmt['declarations']), 1)
                
                decl = stmt['declarations'][0]
                self.assertEqual(decl['type'], 'VariableDeclarator')
                self.assertEqual(decl['id']['name'], expected_name)
                self.assertEqual(decl['init']['value'], expected_value)
    
    def test_function_declarations(self):
        """Test function declaration parsing."""
        code = '''function greet(name) {
    return "Hello, " + name;
}'''
        
        ast = self.parser.parse(code)
        
        self.assertEqual(ast['type'], 'Program')
        self.assertEqual(len(ast['body']), 1)
        
        func = ast['body'][0]
        self.assertEqual(func['type'], 'FunctionDeclaration')
        self.assertEqual(func['id']['name'], 'greet')
        self.assertEqual(len(func['params']), 1)
        self.assertEqual(func['params'][0]['name'], 'name')
        self.assertEqual(func['body']['type'], 'BlockStatement')
    
    def test_binary_expressions(self):
        """Test binary expression parsing."""
        test_cases = [
            ('a + b;', '+'),
            ('x - y;', '-'),
            ('p * q;', '*'),
            ('m / n;', '/'),
            ('a === b;', '==='),
            ('x >= y;', '>='),
        ]
        
        for code, expected_operator in test_cases:
            with self.subTest(code=code):
                ast = self.parser.parse(code)
                
                stmt = ast['body'][0]
                expr = stmt['expression']
                self.assertEqual(expr['type'], 'BinaryExpression')
                self.assertEqual(expr['operator'], expected_operator)
    
    def test_assignment_expressions(self):
        """Test assignment expression parsing."""
        code = 'x = y + 1;'
        
        ast = self.parser.parse(code)
        
        stmt = ast['body'][0]
        expr = stmt['expression']
        self.assertEqual(expr['type'], 'AssignmentExpression')
        self.assertEqual(expr['operator'], '=')
        self.assertEqual(expr['left']['name'], 'x')
        self.assertEqual(expr['right']['type'], 'BinaryExpression')
    
    def test_array_literals(self):
        """Test array literal parsing."""
        code = 'const arr = [1, "hello", true];'
        
        ast = self.parser.parse(code)
        
        decl = ast['body'][0]['declarations'][0]
        array = decl['init']
        
        self.assertEqual(array['type'], 'ArrayExpression')
        self.assertEqual(len(array['elements']), 3)
        self.assertEqual(array['elements'][0]['value'], 1)
        self.assertEqual(array['elements'][1]['value'], "hello")
        self.assertEqual(array['elements'][2]['value'], True)
    
    def test_object_literals(self):
        """Test object literal parsing."""
        code = 'const obj = {name: "John", age: 30};'
        
        ast = self.parser.parse(code)
        
        decl = ast['body'][0]['declarations'][0]
        obj = decl['init']
        
        self.assertEqual(obj['type'], 'ObjectExpression')
        self.assertEqual(len(obj['properties']), 2)
        
        prop1 = obj['properties'][0]
        self.assertEqual(prop1['type'], 'Property')
        self.assertEqual(prop1['key']['name'], 'name')
        self.assertEqual(prop1['value']['value'], 'John')
        
        prop2 = obj['properties'][1]
        self.assertEqual(prop2['key']['name'], 'age')
        self.assertEqual(prop2['value']['value'], 30)
    
    def test_syntax_validation(self):
        """Test syntax validation functionality."""
        valid_cases = [
            'const x = 42;',
            'function test() { return 1; }',
            'const arr = [1, 2, 3];',
        ]
        
        invalid_cases = [
            'const x =;',
            'function test( { return 1; }',
            'const arr = [1, 2, 3',
        ]
        
        for code in valid_cases:
            with self.subTest(code=code):
                is_valid, error = self.parser.validate_syntax(code)
                self.assertTrue(is_valid, f"Expected valid syntax: {code}")
        
        for code in invalid_cases:
            with self.subTest(code=code):
                is_valid, error = self.parser.validate_syntax(code)
                self.assertFalse(is_valid, f"Expected invalid syntax: {code}")
    
    def test_complex_example(self):
        """Test parsing of a complex JavaScript example."""
        code = '''
const config = {
    host: "localhost",
    port: 8080
};

function processData(data) {
    const result = data.length;
    return result;
}

const numbers = [1, 2, 3, 4, 5];
'''
        
        # This should parse without errors
        ast = self.parser.parse(code)
        self.assertEqual(ast['type'], 'Program')
        
        # Should have multiple top-level statements
        self.assertGreater(len(ast['body']), 2)
        
        # Verify we have the expected statement types
        stmt_types = [stmt['type'] for stmt in ast['body']]
        self.assertIn('VariableDeclaration', stmt_types)
        self.assertIn('FunctionDeclaration', stmt_types)


def run_tests():
    """Run all tests and display results."""
    print("Running JavaScript/TypeScript Parser Tests...")
    print("=" * 50)
    
    # Create a test suite
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestJSTypeScriptParser)
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Summary
    print("\n" + "=" * 50)
    if result.wasSuccessful():
        print("✓ All tests passed!")
    else:
        print(f"✗ {len(result.failures)} test(s) failed, {len(result.errors)} error(s)")
        for test, traceback in result.failures + result.errors:
            print(f"Failed: {test}")
            print(traceback)
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
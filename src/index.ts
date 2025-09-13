export * from './lark-parser.js';

// Example usage
async function main() {
  const { parseLarkGrammar } = await import('./lark-parser.js');
  
  // Example Lark grammar
  const exampleGrammar = `
start: expr

expr: term (("+" | "-") term)*
term: factor (("*" | "/") factor)*
factor: NUMBER | "(" expr ")"

NUMBER: /[0-9]+/

%import common.WS
%ignore WS
  `.trim();
  
  try {
    const grammar = parseLarkGrammar(exampleGrammar);
    console.log("Parsed Lark grammar successfully!");
    console.log(`Found ${grammar.rules.length} rules, ${grammar.terminals.length} terminals, ${grammar.directives.length} directives`);
    
    // Print rule names
    console.log("Rules:", grammar.rules.map((r) => r.name).join(", "));
    console.log("Terminals:", grammar.terminals.map((t) => t.name).join(", "));
    console.log("Directives:", grammar.directives.map((d) => `${d.type}: ${d.target}`).join(", "));
  } catch (error) {
    console.error("Error parsing grammar:", (error as Error).message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

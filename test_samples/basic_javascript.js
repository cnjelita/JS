// Basic JavaScript examples for testing the parser

// Variables
const message = "Hello, World!";
let count = 42;
var isActive = true;

// Functions
function greet(name) {
    return `Hello, ${name}!`;
}

// Arrow functions
const add = (a, b) => a + b;
const multiply = (x, y) => {
    return x * y;
};

// Classes
class Person {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }
    
    speak() {
        console.log(`${this.name} is speaking.`);
    }
}

// Objects
const user = {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    isAdmin: false
};

// Arrays
const numbers = [1, 2, 3, 4, 5];
const colors = ["red", "green", "blue"];

// Control flow
if (count > 0) {
    console.log("Count is positive");
} else {
    console.log("Count is not positive");
}

for (let i = 0; i < numbers.length; i++) {
    console.log(numbers[i]);
}

// ES6+ features
const { name, email } = user;
const newNumbers = [...numbers, 6, 7, 8];

// Async/await
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}
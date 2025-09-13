// TypeScript examples for testing the parser

// Type annotations
const name: string = "John";
const age: number = 30;
const isActive: boolean = true;

// Interfaces
interface User {
    id: number;
    name: string;
    email?: string;
    readonly createdAt: Date;
}

// Function with types
function calculateArea(width: number, height: number): number {
    return width * height;
}

// Generic functions
function identity<T>(arg: T): T {
    return arg;
}

// Classes with access modifiers
class Animal {
    protected name: string;
    
    constructor(name: string) {
        this.name = name;
    }
    
    public speak(): void {
        console.log(`${this.name} makes a sound`);
    }
}

class Dog extends Animal {
    private breed: string;
    
    constructor(name: string, breed: string) {
        super(name);
        this.breed = breed;
    }
    
    public speak(): void {
        console.log(`${this.name} barks`);
    }
}

// Type aliases
type Point = {
    x: number;
    y: number;
};

type ID = string | number;

// Union and intersection types
type Status = "pending" | "completed" | "failed";

interface Nameable {
    name: string;
}

interface Ageable {
    age: number;
}

type Person = Nameable & Ageable;

// Generic interfaces
interface Repository<T> {
    find(id: ID): T | undefined;
    save(entity: T): void;
    delete(id: ID): boolean;
}

// Enum
enum Color {
    Red = "red",
    Green = "green",
    Blue = "blue"
}

// Optional chaining and nullish coalescing
const user: User | null = getUser();
const email = user?.email ?? "No email";

// Async function with types
async function fetchUser(id: number): Promise<User | null> {
    try {
        const response = await fetch(`/users/${id}`);
        const userData: User = await response.json();
        return userData;
    } catch (error) {
        console.error("Failed to fetch user:", error);
        return null;
    }
}

// Module declarations
declare module "some-library" {
    export function doSomething(): void;
}

function getUser(): User | null {
    return null;
}
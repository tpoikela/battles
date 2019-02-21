
declare module 'chai' {
    global {
        export namespace Chai {
            interface Assertion {
                dead(): Promise<void>;
                entity(): Promise<void>;
                component(type: string): Promise<void>;
                comp(type: string): Promise<void>;
            }
        }
    }
}

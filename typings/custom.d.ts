
// For importing pegjs grammar using webpack import + raw-loader
declare module '*.pegjs' {
  const content: any;
  export default content;
}

declare module "*.json" {
    const value: any;
    export default value;
}



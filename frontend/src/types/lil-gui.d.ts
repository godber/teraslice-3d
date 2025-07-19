declare module 'lil-gui' {
  export interface GUIOptions {
    title?: string;
    width?: number;
    closeFolders?: boolean;
    autoPlace?: boolean;
    parent?: HTMLElement;
    injectStyles?: boolean;
  }

  export interface GUIController {
    name(name: string): this;
    onChange(callback: (value: any) => void): this;
    updateDisplay(): this;
    listen(): this;
    property: string;
  }

  export interface GUIFolder {
    add(object: any, property: string, options?: any): GUIController;
    add(object: any, property: string, min?: number, max?: number, step?: number): GUIController;
    addColor(object: any, property: string): GUIController;
    addFolder(name: string): GUIFolder;
    open(): this;
    close(): this;
    destroy(): void;
  }

  export class GUI implements GUIFolder {
    constructor(options?: GUIOptions);
    
    add(object: any, property: string, options?: any): GUIController;
    add(object: any, property: string, min?: number, max?: number, step?: number): GUIController;
    addColor(object: any, property: string): GUIController;
    addFolder(name: string): GUIFolder;
    open(): this;
    close(): this;
    destroy(): void;
    controllersRecursive(): GUIController[];
  }
}
/**
 * Safe Error Logging Utility
 * 
 * Prevents "Converting circular structure to JSON" errors
 * by safely serializing objects with circular references,
 * DOM elements, and React Fiber structures.
 */

/**
 * Safely serialize an object to JSON, handling circular references
 * and non-serializable objects (DOM elements, functions, etc.)
 */
export function safeStringify(obj: any, maxDepth: number = 3): string {
  const seen = new WeakSet();
  
  const replacer = (key: string, value: any, depth: number = 0): any => {
    // Prevent infinite recursion
    if (depth > maxDepth) {
      return '[Max Depth Exceeded]';
    }
    
    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }
    
    // Handle primitive types
    if (typeof value !== 'object') {
      // Truncate very long strings
      if (typeof value === 'string' && value.length > 500) {
        return value.substring(0, 500) + '... [truncated]';
      }
      return value;
    }
    
    // Handle circular references
    if (seen.has(value)) {
      return '[Circular Reference]';
    }
    
    // Check for DOM elements and React elements
    if (isDOMElement(value)) {
      return `[DOM Element: ${value.tagName || 'Unknown'}]`;
    }
    
    if (isReactElement(value)) {
      return '[React Element]';
    }
    
    // Check for React Fiber (internal React structure)
    if (isReactFiber(value)) {
      return '[React Fiber]';
    }
    
    // Handle HTMLImageElement specifically
    if (value instanceof HTMLImageElement) {
      return `[HTMLImageElement: ${value.src || 'no-src'}]`;
    }
    
    // Handle other HTML elements
    if (value instanceof HTMLElement) {
      return `[HTMLElement: ${value.tagName}]`;
    }
    
    // Handle functions
    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`;
    }
    
    // Handle Error objects specially
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack?.substring(0, 500) // Limit stack trace length
      };
    }
    
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    // Handle File objects
    if (value instanceof File) {
      return {
        name: value.name,
        type: value.type,
        size: value.size,
        lastModified: value.lastModified
      };
    }
    
    // Handle Blob objects
    if (value instanceof Blob) {
      return {
        type: value.type,
        size: value.size
      };
    }
    
    // For objects and arrays, recurse carefully
    seen.add(value);
    
    if (Array.isArray(value)) {
      // Limit array length to prevent huge serializations
      if (value.length > 100) {
        return `[Array with ${value.length} items - truncated]`;
      }
      return value.map(item => replacer('', item, depth + 1));
    }
    
    // For plain objects
    const result: any = {};
    let count = 0;
    const maxProps = 50; // Limit object properties
    
    for (const k in value) {
      if (count >= maxProps) {
        result['...'] = `[${Object.keys(value).length - maxProps} more properties]`;
        break;
      }
      
      // Skip React internal properties
      if (k.startsWith('__react') || k.startsWith('_react') || k.startsWith('$$')) {
        continue;
      }
      
      try {
        result[k] = replacer(k, value[k], depth + 1);
        count++;
      } catch (error) {
        result[k] = '[Serialization Error]';
      }
    }
    
    return result;
  };
  
  try {
    return JSON.stringify(replacer('', obj, 0), null, 2);
  } catch (error) {
    return `[Serialization Failed: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Check if value is a DOM element
 */
function isDOMElement(value: any): boolean {
  return (
    value instanceof Element ||
    value instanceof HTMLElement ||
    value instanceof Node ||
    (value && typeof value === 'object' && 'nodeType' in value)
  );
}

/**
 * Check if value is a React element
 */
function isReactElement(value: any): boolean {
  return (
    value &&
    typeof value === 'object' &&
    ('$$typeof' in value || '_owner' in value || 'type' in value && 'props' in value)
  );
}

/**
 * Check if value is React Fiber (internal React structure)
 */
function isReactFiber(value: any): boolean {
  return (
    value &&
    typeof value === 'object' &&
    ('stateNode' in value || 'return' in value || 'child' in value || 'sibling' in value) &&
    (value.constructor?.name?.includes('Fiber') || 
     Object.keys(value).some(k => k.includes('Fiber') || k.includes('react')))
  );
}

/**
 * Safely serialize error context, removing circular references and DOM elements
 */
export function sanitizeErrorContext(context: any): any {
  if (!context || typeof context !== 'object') {
    return context;
  }
  
  const sanitized: any = {};
  
  for (const key in context) {
    const value = context[key];
    
    // Skip React/DOM properties
    if (key.startsWith('__react') || key.startsWith('_react') || key.startsWith('$$')) {
      continue;
    }
    
    // Handle different value types
    if (value === null || value === undefined) {
      sanitized[key] = value;
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (value instanceof Date) {
      sanitized[key] = value.toISOString();
    } else if (value instanceof Error) {
      sanitized[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack?.substring(0, 300)
      };
    } else if (isDOMElement(value)) {
      sanitized[key] = `[DOM Element: ${(value as any).tagName || 'Unknown'}]`;
    } else if (isReactElement(value) || isReactFiber(value)) {
      sanitized[key] = '[React Element/Fiber]';
    } else if (value instanceof File) {
      sanitized[key] = { name: value.name, type: value.type, size: value.size };
    } else if (typeof value === 'function') {
      sanitized[key] = `[Function: ${value.name || 'anonymous'}]`;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.length > 10 ? `[Array with ${value.length} items]` : value;
    } else if (typeof value === 'object') {
      // Recursively sanitize nested objects (but limit depth)
      try {
        const keys = Object.keys(value);
        if (keys.length > 20) {
          sanitized[key] = `[Object with ${keys.length} properties]`;
        } else {
          sanitized[key] = sanitizeErrorContext(value);
        }
      } catch {
        sanitized[key] = '[Complex Object]';
      }
    } else {
      sanitized[key] = String(value);
    }
  }
  
  return sanitized;
}

/**
 * Create a console-safe version of an object for logging
 */
export function createSafeLogObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const safe: any = {};
  
  for (const key in obj) {
    const value = obj[key];
    
    if (key.startsWith('__react') || key.startsWith('_react') || key === 'context') {
      continue; // Skip React internals
    }
    
    if (typeof value === 'object' && value !== null) {
      safe[key] = sanitizeErrorContext(value);
    } else {
      safe[key] = value;
    }
  }
  
  return safe;
}

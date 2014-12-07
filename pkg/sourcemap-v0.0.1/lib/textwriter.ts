import os = require('os');
export interface TextWriter {
  length: number;
  write(text: string, params?: { [key: string]: any; }): TextWriter;
  writeln(text?: string, params?: { [key: string]: any; }): TextWriter;
  indent(): TextWriter;
  dedent(): TextWriter;
  pipeEach<T>(elements: T[], callback: (writer: TextWriter, element: T, index: number) => void): TextWriter;
  pipeTo(callback: (writer: TextWriter) => void): TextWriter;
  suspendIndenting(): TextWriter;
  resumeIndenting(): TextWriter;
  clear(): TextWriter;
  toString(): string;
}

export function create(text?: string): TextWriter {
  var builder: string[] = [];
  var length: number = 0;
  var indent = 0;
  var newlineRequested = false;
  var indentingSuspended = 0;

  if (text) {
    builder.push(text);
  }

  function write(text: string, params: { [key: string]: any; }): void {
    if (text) {
      if (newlineRequested) {
        newlineRequested = false;
        builder.push(os.EOL);
        length += os.EOL.length;

        if (!indentingSuspended && indent) {
          builder.push(Array(indent + 1).join("  "));
          length += indent * 2;
        }
      }

      if (params) {
        text = text.replace(/\${([\w$_-]+)}/ig, (_, key) => typeof params[key] === "undefined" ? "" : params[key]);    
      }

      builder.push(text);
      length += text.length;
    }
  }

  return {
    get length(): number {
      return length;
    },
    indent(): TextWriter {
      indent++;
      return this;
    },
    dedent(): TextWriter {
      indent = Math.max(0, indent - 1);
      return this;
    },
    suspendIndenting(): TextWriter {
      indentingSuspended++;
      return this;
    },
    resumeIndenting(): TextWriter {
      indentingSuspended--;
      return this;
    },
    write(text: string, params?: { [key: string]: any; }): TextWriter {
      write(text, params);
      return this;
    },
    writeln(text?: string, params?: { [key: string]: any; }): TextWriter {
      if (text) {
        write(text, params);
      } else if (newlineRequested) {
        builder.push(os.EOL);
        length += os.EOL.length;
      }

      newlineRequested = true;
      return this;
    },
    pipeTo(callback: (writer: TextWriter) => void): TextWriter {
      callback(this);
      return this;
    },
    pipeEach<T>(elements: T[], callback: (writer: TextWriter, element: T, index: number) => void): TextWriter {
      for (var i = 0; i < elements.length; i++) {
        callback(this, elements[i], i);
      }
      return this;
    },
    clear(): TextWriter {
      builder.length = 0;
      length = 0;
      return this;
    },
    toString(): string {
      var text = builder.join("");
      if (newlineRequested) {
        text += os.EOL;
      }

      return text;
    }
  }
}